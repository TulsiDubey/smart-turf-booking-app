require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 3000;

// --- Configurations ---
const JWT_SECRET = process.env.JWT_SECRET;
const BCRYPT_SALT_ROUNDS = 10;

// ⚠️ Security: Ensure JWT_SECRET is set in production
if (!JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET environment variable is not set.");
    process.exit(1); // Exit the application if the secret is not configured
}

// --- Database Configuration ---
const pool = new Pool({
  user: process.DB_USER || 'postgres',
  host: process.DB_HOST || 'localhost',
  database: process.DB_NAME || 'smart-turf-db',
  password: process.DB_PASSWORD || 'Tulsi@2211', // Load from .env file in production
  port: process.DB_PORT || 5432,
});

// Check database connection on startup
console.log(`Attempting to connect to database "${pool.options.database}" on ${pool.options.host} as user "${pool.options.user}"...`);
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Error connecting to the database:', err.stack);
  } else {
    console.log('✅ Database connected successfully at:', res.rows[0].now);
  }
});

// --- Middleware ---
app.use(cors()); // For production, configure this more strictly
app.use(express.json());

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

    if (token == null) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Access denied. Invalid token.' });
        }
        req.user = user; // Add decoded user payload to the request object
        next();
    });
};

// --- Helper for Consistent Error Response ---
const sendError = (res, statusCode, message) => {
    return res.status(statusCode).json({ error: message });
};

// --- API Routes ---

// 1. Authentication
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return sendError(res, 400, 'Name, email, and password are required.');
    }
    try {
        const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
        const newUser = await pool.query(
            'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
            [name, email, hashedPassword]
        );
        res.status(201).json(newUser.rows[0]);
    } catch (error) {
        console.error("Registration Error:", error);
        if (error.code === '23505') {
            return sendError(res, 409, 'User with this email already exists.');
        }
        return sendError(res, 500, 'Internal server error during registration.');
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return sendError(res, 400, 'Email and password are required.');
    }
    try {
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            return sendError(res, 401, 'Invalid credentials.');
        }
        const user = userResult.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return sendError(res, 401, 'Invalid credentials.');
        }
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
        console.error("Login Error:", error);
        return sendError(res, 500, 'Internal server error during login.');
    }
});

// 2. Turfs
app.get('/api/turfs', async (req, res) => {
    try {
        const allTurfs = await pool.query('SELECT * FROM turfs ORDER BY rating DESC');
        res.json(allTurfs.rows);
    } catch (error) {
        console.error("Get Turfs Error:", error);
        return sendError(res, 500, 'Internal server error.');
    }
});

app.post('/api/turfs', authenticateToken, async (req, res) => {
    const { name, location, price_per_hour, image_url, latitude, longitude } = req.body;
    if (!name || !location || !price_per_hour || latitude === undefined || longitude === undefined) {
        return sendError(res, 400, 'Missing required fields: name, location, price, latitude, and longitude.');
    }
    try {
        const newTurf = await pool.query(
            'INSERT INTO turfs (name, location, price_per_hour, image_url, latitude, longitude, rating) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [name, location, price_per_hour, image_url || null, latitude, longitude, 0]
        );
        res.status(201).json(newTurf.rows[0]);
    } catch (error) {
        console.error("Add Turf Error:", error);
        return sendError(res, 500, 'Failed to add new turf.');
    }
});

// 3. Bookings
app.get('/api/bookings/slots/:turfId', async (req, res) => {
    const { turfId } = req.params;
    const { date } = req.query;
    if (!date) {
        return sendError(res, 400, 'Date query parameter is required.');
    }
    try {
        const bookedSlotsResult = await pool.query(
            "SELECT TO_CHAR(start_time, 'HH24:MI') as start_hour FROM bookings WHERE turf_id = $1 AND DATE(start_time) = $2",
            [turfId, date]
        );
        const bookedHours = new Set(bookedSlotsResult.rows.map(row => row.start_hour));
        const allSlots = [];
        for (let i = 8; i < 22; i++) {
            const time24h = `${String(i).padStart(2, '0')}:00`;
            const displayHour = i % 12 === 0 ? 12 : i % 12;
            const period = i >= 12 ? 'PM' : 'AM';
            allSlots.push({
                time: `${displayHour}:00 ${period}`,
                full_time: time24h,
                available: !bookedHours.has(time24h)
            });
        }
        res.json({ date, slots: allSlots });
    } catch (error) {
        console.error("Get Slots Error:", error);
        return sendError(res, 500, 'Internal server error.');
    }
});

app.post('/api/bookings', authenticateToken, async (req, res) => {
    const { turf_id, start_time, end_time, total_price, rented_kit_ids } = req.body;
    const user_id = req.user.id;
    if (!turf_id || !start_time || !end_time || total_price === undefined) {
        return sendError(res, 400, 'Missing required booking information.');
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const bookingQuery = 'INSERT INTO bookings (user_id, turf_id, start_time, end_time, total_price, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *';
        const newBooking = await client.query(bookingQuery, [user_id, turf_id, start_time, end_time, total_price, 'confirmed']);
        const bookingId = newBooking.rows[0].id;
        if (rented_kit_ids && rented_kit_ids.length > 0) {
            for (const kit of rented_kit_ids) {
                await client.query('INSERT INTO kit_rentals (booking_id, kit_id, rent_price) VALUES ($1, $2, $3)', [bookingId, kit.id, kit.price_per_hour]);
            }
        }
        await client.query('COMMIT');
        res.status(201).json(newBooking.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Booking Creation Error:", error);
        if (error.code === '23505') {
            return sendError(res, 409, 'This time slot is already booked.');
        }
        return sendError(res, 500, 'Internal server error while creating booking.');
    } finally {
        client.release();
    }
});

app.get('/api/my-bookings', authenticateToken, async (req, res) => {
    const user_id = req.user.id;
    try {
        const userBookings = await pool.query(
            `SELECT b.id, b.start_time, b.status, b.total_price, t.name as turf_name, t.location as turf_location, t.image_url
             FROM bookings b
             JOIN turfs t ON b.turf_id = t.id
             WHERE b.user_id = $1
             ORDER BY b.start_time DESC`,
            [user_id]
        );
        res.json(userBookings.rows);
    } catch (error) {
        console.error("Get My Bookings Error:", error);
        return sendError(res, 500, 'Internal server error.');
    }
});

// 4. Kits
app.get('/api/kits', async (req, res) => {
    try {
        const availableKits = await pool.query('SELECT * FROM kits WHERE available = TRUE ORDER BY name');
        res.json(availableKits.rows);
    } catch (error) {
        console.error("Get Kits Error:", error);
        return sendError(res, 500, 'Internal server error while fetching kits.');
    }
});

app.post('/api/kits', authenticateToken, async (req, res) => {
    const { name, description, price_per_hour, image_url } = req.body;
    if (!name || !description || !price_per_hour) {
        return sendError(res, 400, 'Missing required fields: name, description, and price_per_hour.');
    }
    try {
        const newKit = await pool.query(
            'INSERT INTO kits (name, description, price_per_hour, image_url, available) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, description, price_per_hour, image_url || null, true]
        );
        res.status(201).json(newKit.rows[0]);
    } catch (error) {
        console.error("Add Kit Error:", error);
        return sendError(res, 500, 'Failed to add new kit.');
    }
});

// 5. Matches
app.get('/api/matches', async (req, res) => {
    try {
        const openMatches = await pool.query(
            `SELECT 
                m.id, m.sport, m.match_time, m.players_needed, m.contribution_per_person, m.status,
                t.name as turf_name, t.location as turf_location,
                u.name as organizer_name,
                (SELECT COUNT(*) FROM match_participants mp WHERE mp.match_id = m.id) as current_players
             FROM matches m
             JOIN turfs t ON m.turf_id = t.id
             JOIN users u ON m.organizer_id = u.id
             WHERE m.status = 'open'
             ORDER BY m.match_time ASC`
        );
        res.json(openMatches.rows);
    } catch (error) {
        console.error("Get Matches Error:", error);
        return sendError(res, 500, 'Internal server error while fetching matches.');
    }
});

app.post('/api/matches', authenticateToken, async (req, res) => {
    const { turf_id, sport, match_time, players_needed, contribution_per_person } = req.body;
    const organizer_id = req.user.id;

    if (!turf_id || !sport || !match_time || !players_needed || !contribution_per_person) {
        return sendError(res, 400, 'Missing required fields to create a match.');
    }

    try {
        const newMatch = await pool.query(
            'INSERT INTO matches (organizer_id, turf_id, sport, match_time, players_needed, contribution_per_person, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [organizer_id, turf_id, sport, match_time, players_needed, contribution_per_person, 'open']
        );
        res.status(201).json(newMatch.rows[0]);
    } catch (error) {
        console.error("Create Match Error:", error);
        return sendError(res, 500, 'Failed to create the match.');
    }
});

app.post('/api/matches/:matchId/join', authenticateToken, async (req, res) => {
    const { matchId } = req.params;
    const user_id = req.user.id;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const matchResult = await client.query('SELECT * FROM matches WHERE id = $1 FOR UPDATE', [matchId]);
        if (matchResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return sendError(res, 404, 'Match not found.');
        }

        const match = matchResult.rows[0];
        if (match.status !== 'open') {
            await client.query('ROLLBACK');
            return sendError(res, 400, `This match is already ${match.status}.`);
        }

        await client.query('INSERT INTO match_participants (match_id, user_id) VALUES ($1, $2)', [matchId, user_id]);
        
        const participantsResult = await client.query('SELECT COUNT(*) FROM match_participants WHERE match_id = $1', [matchId]);
        const currentPlayers = parseInt(participantsResult.rows[0].count, 10);

        if (currentPlayers >= match.players_needed) {
            await client.query("UPDATE matches SET status = 'full' WHERE id = $1", [matchId]);
        }

        await client.query('COMMIT');
        res.status(200).json({ message: 'Successfully joined the match.' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Join Match Error:", error);
        if (error.code === '23505') {
            return sendError(res, 409, 'You have already joined this match.');
        }
        return sendError(res, 500, 'Internal server error while joining match.');
    } finally {
        client.release();
    }
});

// --- Start Server ---
app.listen(port, () => {
  console.log(`🚀 Server listening at http://localhost:${port}`);
});