const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 3000;

// --- Configurations ---
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-for-jwt';

// --- Database Configuration ---
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'smart-turf-db',
  password: process.env.DB_PASSWORD || 'Tulsi@2211',
  port: process.env.DB_PORT || 5432,
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) { console.error('❌ Error connecting to the database:', err.stack); } 
  else { console.log('✅ Database connected successfully at:', res.rows[0].now); }
});

// --- Middleware ---
app.use(cors());
app.use(express.json());

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- API Routes ---

// 1. Authentication (No changes)
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) { return res.status(400).json({ error: 'Name, email, and password are required.' }); }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await pool.query('INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email', [name, email, hashedPassword]);
        res.status(201).json(newUser.rows[0]);
    } catch (error) {
        if (error.code === '23505') { return res.status(409).json({ error: 'User with this email already exists.' }); }
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) { return res.status(400).json({ error: 'Email and password are required.' }); }
    try {
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) { return res.status(401).json({ error: 'Invalid credentials.' }); }
        const user = userResult.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) { return res.status(401).json({ error: 'Invalid credentials.' }); }
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) { res.status(500).json({ error: 'Internal server error' }); }
});


// 2. Turfs (No changes)
app.get('/api/turfs', async (req, res) => {
    try {
        const allTurfs = await pool.query('SELECT * FROM turfs ORDER BY rating DESC');
        res.json(allTurfs.rows);
    } catch (error) { res.status(500).json({ error: 'Internal server error' }); }
});
app.post('/api/turfs', authenticateToken, async (req, res) => {
    const { name, location, price_per_hour, image_url, latitude, longitude } = req.body;
    if (!name || !location || !price_per_hour || !latitude || !longitude) { return res.status(400).json({ error: 'Missing required fields.' }); }
    try {
        const newTurf = await pool.query('INSERT INTO turfs (name, location, price_per_hour, image_url, latitude, longitude, rating) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', [name, location, price_per_hour, image_url || null, latitude, longitude, 0]);
        res.status(201).json(newTurf.rows[0]);
    } catch (error) { res.status(500).json({ error: 'Failed to add new turf.' }); }
});

// 3. Bookings (Updated)
app.get('/api/bookings/slots/:turfId', async (req, res) => {
    const { turfId } = req.params; const { date } = req.query;
    if (!date) { return res.status(400).json({ error: 'Date query parameter is required.' }); }
    try {
        const bookedSlotsResult = await pool.query("SELECT TO_CHAR(start_time, 'HH24:MI') as start_hour FROM bookings WHERE turf_id = $1 AND DATE(start_time) = $2", [turfId, date]);
        const bookedHours = bookedSlotsResult.rows.map(row => row.start_hour);
        const allSlots = [];
        for (let i = 8; i < 22; i++) {
             const time = `${String(i).padStart(2, '0')}:00`; const d = new Date(); d.setHours(i, 0, 0);
             const period = d.getHours() >= 12 ? 'PM' : 'AM'; const hour12 = d.getHours() % 12 || 12;
             allSlots.push({ time: `${hour12}:00 ${period}`, full_time: time, available: !bookedHours.includes(time) });
        }
        res.json({ date, slots: allSlots });
    } catch (error) { res.status(500).json({ error: 'Internal server error' }); }
});
app.post('/api/bookings', authenticateToken, async (req, res) => {
    const { turf_id, start_time, end_time, total_price, payment_method, rented_kit_ids } = req.body;
    const user_id = req.user.id;
    if (!turf_id || !start_time || !end_time || !total_price || !payment_method) { return res.status(400).json({ error: 'Missing required booking or payment information.' }); }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const bookingQuery = 'INSERT INTO bookings (user_id, turf_id, start_time, end_time, total_price, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *';
        const newBooking = await client.query(bookingQuery, [user_id, turf_id, start_time, end_time, total_price, 'confirmed']);
        const bookingId = newBooking.rows[0].id;

        // If kits are rented, add them to the kit_rentals table
        if (rented_kit_ids && rented_kit_ids.length > 0) {
            for (const kit of rented_kit_ids) {
                await client.query('INSERT INTO kit_rentals (booking_id, kit_id, rent_price) VALUES ($1, $2, $3)', [bookingId, kit.id, kit.price_per_hour]);
            }
        }
        await client.query('COMMIT');
        res.status(201).json(newBooking.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        if (error.code === '23505') { return res.status(409).json({ error: 'This time slot is already booked.' }); }
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});
app.get('/api/my-bookings', authenticateToken, async (req, res) => {
    const user_id = req.user.id;
    try {
        const userBookings = await pool.query(`SELECT b.id, b.start_time, b.status, b.total_price, t.name as turf_name, t.location as turf_location, t.image_url FROM bookings b JOIN turfs t ON b.turf_id = t.id WHERE b.user_id = $1 ORDER BY b.start_time DESC`, [user_id]);
        res.json(userBookings.rows);
    } catch (error) { res.status(500).json({ error: 'Internal server error' }); }
});


// 4. Kits Marketplace (NEW)
app.get('/api/kits', async (req, res) => {
    try {
        const kits = await pool.query('SELECT k.*, u.name as owner_name FROM kits k JOIN users u ON k.owner_id = u.id WHERE k.available = TRUE');
        res.json(kits.rows);
    } catch (error) { res.status(500).json({ error: 'Internal server error' }); }
});
app.post('/api/kits', authenticateToken, async (req, res) => {
    const { name, description, price_per_hour, is_bundle, image_url } = req.body;
    const owner_id = req.user.id;
    if (!name || !price_per_hour) { return res.status(400).json({ error: 'Kit name and price are required.' }); }
    try {
        const newKit = await pool.query('INSERT INTO kits (owner_id, name, description, price_per_hour, is_bundle, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [owner_id, name, description, price_per_hour, is_bundle || false, image_url]);
        res.status(201).json(newKit.rows[0]);
    } catch (error) { res.status(500).json({ error: 'Failed to add kit.' }); }
});

// 5. Match Organizer (NEW)
app.get('/api/matches', async (req, res) => {
    try {
        const query = `
            SELECT m.*, t.name as turf_name, u.name as organizer_name,
            (SELECT COUNT(*) FROM match_participants mp WHERE mp.match_id = m.id) as players_joined
            FROM matches m
            JOIN turfs t ON m.turf_id = t.id
            JOIN users u ON m.organizer_id = u.id
            WHERE m.status = 'open'
            ORDER BY m.match_time ASC
        `;
        const matches = await pool.query(query);
        res.json(matches.rows);
    } catch (error) { res.status(500).json({ error: 'Internal server error' }); }
});
app.post('/api/matches', authenticateToken, async (req, res) => {
    const { turf_id, sport, match_time, players_needed, contribution_per_person } = req.body;
    const organizer_id = req.user.id;
    if (!turf_id || !sport || !match_time || !players_needed || !contribution_per_person) { return res.status(400).json({ error: 'All match fields are required.' }); }
    try {
        const newMatch = await pool.query('INSERT INTO matches (organizer_id, turf_id, sport, match_time, players_needed, contribution_per_person) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [organizer_id, turf_id, sport, match_time, players_needed, contribution_per_person]);
        res.status(201).json(newMatch.rows[0]);
    } catch (error) { res.status(500).json({ error: 'Failed to create match.' }); }
});
app.post('/api/matches/:matchId/join', authenticateToken, async (req, res) => {
    const { matchId } = req.params;
    const user_id = req.user.id;
    try {
        // Check if user has already joined
        const existing = await pool.query('SELECT * FROM match_participants WHERE match_id = $1 AND user_id = $2', [matchId, user_id]);
        if(existing.rows.length > 0) return res.status(409).json({error: 'You have already joined this match.'});

        await pool.query('INSERT INTO match_participants (match_id, user_id) VALUES ($1, $2)', [matchId, user_id]);
        res.status(200).json({ message: 'Successfully joined the match!' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to join match.' });
    }
});


// --- Start Server ---
app.listen(port, () => {
  console.log(`🚀 Server listening at http://localhost:${port}`);
});

