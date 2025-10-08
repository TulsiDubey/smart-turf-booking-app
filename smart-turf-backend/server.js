// server.js

// Load environment variables from .env file
require('dotenv').config();

// --- Imports ---
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');

// --- App Initialization ---
const app = express();
const port = process.env.PORT || 3000;

// --- Configurations ---
const JWT_SECRET = process.env.JWT_SECRET;
const BCRYPT_SALT_ROUNDS = 10;

if (!JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET environment variable is not set.");
    process.exit(1);
}

// --- Database Configuration ---
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'smart-turf-db',
    password: process.env.DB_PASSWORD || 'Tulsi@2211', // ⚠️ Replace with your actual password
    port: process.env.DB_PORT || 5432,
});

pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ Error connecting to the database:', err.stack);
    } else {
        console.log('✅ Database connected successfully at:', res.rows[0].now);
    }
});

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// --- File Upload (Multer) Configuration ---
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: function(req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB file size limit
    fileFilter: function(req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb('Error: You can only upload image files!');
        }
    }
}).single('image');

// --- Helper Functions ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) {
        return res.status(401).json({ error: "A token is required for authentication" });
    }
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: "Token is not valid" });
        }
        req.user = user;
        next();
    });
};

const sendError = (res, statusCode, message) => {
    return res.status(statusCode).json({ error: message });
};

/*
================================================================================================
|                                  UPDATED DATABASE SCHEMA                                     |
| -------------------------------------------------------------------------------------------- |
|  Please ensure your `bookings` table includes the `kit_id` column. Run this command:         |
|                                                                                              |
|  ALTER TABLE bookings ADD COLUMN kit_id INTEGER REFERENCES kits(id);                         |
================================================================================================
*/

//===============================================================================================
//                                       API ROUTES
//===============================================================================================

// --- 1. Authentication ---

// Register a new user
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return sendError(res, 400, 'Name, email, and password are required.');
    }
    try {
        const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
        const newUser = await pool.query(
            'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email', [name, email, hashedPassword]
        );
        res.status(201).json(newUser.rows[0]);
    } catch (error) {
        if (error.code === '23505') { // Unique violation
            return sendError(res, 409, 'User with this email already exists.');
        }
        console.error("Registration Error:", error);
        return sendError(res, 500, 'Internal server error during registration.');
    }
});

// Log in a user
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
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
        console.error("Login Error:", error);
        return sendError(res, 500, 'Internal server error during login.');
    }
});

// --- 2. Turfs ---

app.get('/api/turfs', async (req, res) => {
    try {
        const allTurfs = await pool.query('SELECT * FROM turfs ORDER BY rating DESC, name ASC');
        res.json(allTurfs.rows);
    } catch (error) {
        console.error("Get Turfs Error:", error);
        return sendError(res, 500, 'Failed to fetch turfs.');
    }
});

app.post('/api/turfs', authenticateToken, (req, res) => {
    upload(req, res, async (err) => {
        if (err) return sendError(res, 400, err);
        const { name, location, price_per_hour, latitude, longitude } = req.body;
        if (!name || !location || !price_per_hour) {
            return sendError(res, 400, 'Missing required fields: name, location, and price.');
        }
        const imageUrl = req.file ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` : null;
        try {
            const newTurf = await pool.query(
                'INSERT INTO turfs (name, location, price_per_hour, image_url, latitude, longitude, rating) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', [name, location, price_per_hour, imageUrl, latitude, longitude, 4]
            );
            res.status(201).json(newTurf.rows[0]);
        } catch (error) {
            console.error("Add Turf Error:", error);
            return sendError(res, 500, 'Failed to add new turf.');
        }
    });
});

// --- 3. Kits ---

app.get('/api/kits', async (req, res) => {
    try {
        const allKits = await pool.query('SELECT * FROM kits WHERE available = TRUE ORDER BY name ASC');
        res.json(allKits.rows);
    } catch (error) {
        console.error("Get Kits Error:", error);
        return sendError(res, 500, 'Failed to fetch kits.');
    }
});

app.post('/api/kits', authenticateToken, (req, res) => {
    upload(req, res, async (err) => {
        if (err) return sendError(res, 400, err);
        const { name, description, price_per_hour } = req.body;
        const owner_id = req.user.id;
        if (!name || !description || !price_per_hour) {
            return sendError(res, 400, 'Missing required fields: name, description, and price.');
        }
        const imageUrl = req.file ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` : null;
        try {
            const newKit = await pool.query(
                'INSERT INTO kits (name, description, price_per_hour, image_url, available, owner_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [name, description, price_per_hour, imageUrl, true, owner_id]
            );
            res.status(201).json(newKit.rows[0]);
        } catch (error) {
            console.error("Add Kit Error:", error);
            return sendError(res, 500, 'Failed to add new kit.');
        }
    });
});

// --- 4. Bookings ---

app.get('/api/bookings/slots/:turf_id', async (req, res) => {
    const { turf_id } = req.params;
    const { date } = req.query;
    if (!date) return sendError(res, 400, "A date query parameter is required.");
    try {
        const bookingsResult = await pool.query(
            "SELECT start_time FROM bookings WHERE turf_id = $1 AND start_time::date = $2", [turf_id, date]
        );
        const bookedHours = bookingsResult.rows.map(b => new Date(b.start_time).getUTCHours());
        const slots = Array.from({ length: 18 }, (_, i) => i + 6).map(hour => ({
            time: `${hour % 12 === 0 ? 12 : hour % 12}:00 ${hour < 12 ? 'AM' : 'PM'}`,
            full_time: `${String(hour).padStart(2, '0')}:00`,
            available: !bookedHours.includes(hour)
        }));
        res.json({ slots });
    } catch (error) {
        console.error("Get Slots Error:", error);
        return sendError(res, 500, "Failed to fetch booking slots.");
    }
});

// ✅ MODIFIED: Now joins with kits table to provide kit details
app.get('/api/my-bookings', authenticateToken, async (req, res) => {
    const user_id = req.user.id;
    try {
        const bookings = await pool.query(
            `SELECT 
                b.id, b.start_time, b.total_price, 
                t.name as turf_name, t.image_url as turf_image_url,
                k.name as kit_name
             FROM bookings b
             JOIN turfs t ON b.turf_id = t.id
             LEFT JOIN kits k ON b.kit_id = k.id
             WHERE b.user_id = $1
             ORDER BY b.start_time DESC`,
            [user_id]
        );
        res.json(bookings.rows);
    } catch (error) {
        console.error("Get My Bookings Error:", error);
        return sendError(res, 500, "Failed to fetch your bookings.");
    }
});

// ✅ MODIFIED: Now accepts an optional kit_id and calculates price on the server
app.post('/api/bookings', authenticateToken, async (req, res) => {
    const user_id = req.user.id;
    const { turf_id, start_time, kit_id } = req.body; // Client no longer sends total_price

    if (!turf_id || !start_time) {
        return sendError(res, 400, "Missing required booking details.");
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Fetch turf price
        const turfResult = await client.query('SELECT price_per_hour FROM turfs WHERE id = $1', [turf_id]);
        if (turfResult.rows.length === 0) {
            return sendError(res, 404, "Turf not found.");
        }
        let totalPrice = parseFloat(turfResult.rows[0].price_per_hour);

        // If a kit is selected, fetch its price and add to the total
        if (kit_id) {
            const kitResult = await client.query('SELECT price_per_hour FROM kits WHERE id = $1 AND available = TRUE', [kit_id]);
            if (kitResult.rows.length > 0) {
                totalPrice += parseFloat(kitResult.rows[0].price_per_hour);
            } else {
                return sendError(res, 404, "Selected kit is not available or not found.");
            }
        }

        const startTimeObj = new Date(start_time);
        const endTimeObj = new Date(startTimeObj.getTime() + 60 * 60 * 1000);

        const newBooking = await client.query(
            `INSERT INTO bookings (user_id, turf_id, start_time, end_time, total_price, kit_id)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [user_id, turf_id, startTimeObj, endTimeObj, totalPrice, kit_id]
        );
        
        await client.query('COMMIT');
        res.status(201).json(newBooking.rows[0]);

    } catch (error) {
        await client.query('ROLLBACK');
        if(error.code === '23505') { // unique_violation on (turf_id, start_time)
            return sendError(res, 409, 'This time slot has already been booked.');
        }
        console.error("Create Booking Error:", error);
        return sendError(res, 500, "Failed to create booking.");
    } finally {
        client.release();
    }
});


// --- 5. Matches ---

app.get('/api/matches', async (req, res) => {
    try {
        const query = `
            SELECT 
                m.id, m.sport, m.players_needed, m.contribution_per_person, m.match_time,
                t.name as turf_name,
                (SELECT COUNT(*) FROM match_participants WHERE match_id = m.id) as current_players
            FROM matches m
            JOIN turfs t ON m.turf_id = t.id
            WHERE m.match_time > NOW()
            AND m.players_needed > (SELECT COUNT(*) FROM match_participants WHERE match_id = m.id)
            ORDER BY m.match_time ASC;
        `;
        const matches = await pool.query(query);
        res.json(matches.rows);
    } catch (error) {
        console.error("Get Matches Error:", error);
        return sendError(res, 500, "Failed to fetch matches.");
    }
});

app.post('/api/matches', authenticateToken, async (req, res) => {
    const { turf_id, sport, players_needed, contribution_per_person, match_time } = req.body;
    const organizer_id = req.user.id;
    if (!turf_id || !sport || !players_needed || !match_time) {
        return sendError(res, 400, "Missing required fields.");
    }
    const matchTimeDate = new Date(match_time);
    if (isNaN(matchTimeDate.getTime())) {
        return sendError(res, 400, "Invalid match_time format.");
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const newMatchResult = await client.query(
            `INSERT INTO matches (turf_id, sport, organizer_id, players_needed, contribution_per_person, match_time)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [turf_id, sport, organizer_id, players_needed, contribution_per_person || 0, matchTimeDate]
        );
        const newMatch = newMatchResult.rows[0];
        await client.query(
            'INSERT INTO match_participants (match_id, user_id) VALUES ($1, $2)', [newMatch.id, organizer_id]
        );
        await client.query('COMMIT');
        res.status(201).json(newMatch);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Create Match Error:", error);
        return sendError(res, 500, 'Failed to create match.');
    } finally {
        client.release();
    }
});

app.post('/api/matches/:id/join', authenticateToken, async (req, res) => {
    const { id: match_id } = req.params;
    const user_id = req.user.id;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const match = await client.query('SELECT players_needed FROM matches WHERE id = $1 FOR UPDATE', [match_id]);
        if (match.rows.length === 0) return sendError(res, 404, 'Match not found.');
        
        const participants = await client.query('SELECT COUNT(*) as count FROM match_participants WHERE match_id = $1', [match_id]);
        if (participants.rows[0].count >= match.rows[0].players_needed) {
            return sendError(res, 409, 'This match is already full.');
        }

        const result = await client.query(
            'INSERT INTO match_participants (match_id, user_id) VALUES ($1, $2) RETURNING *', [match_id, user_id]
        );
        await client.query('COMMIT');
        res.status(201).json({ message: "Successfully joined match", data: result.rows[0] });

    } catch (error) {
        await client.query('ROLLBACK');
        if (error.code === '23505') {
            return sendError(res, 409, "You have already joined this match.");
        }
        console.error("Join Match Error:", error);
        return sendError(res, 500, "Failed to join match.");
    } finally {
        client.release();
    }
});

// --- Start Server ---
app.listen(port, () => {
    console.log(`🚀 Server listening at http://localhost:${port}`);
});