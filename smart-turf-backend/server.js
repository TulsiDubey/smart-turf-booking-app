const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch'); // Make sure to install node-fetch@2

const app = express();
const port = process.env.PORT || 3000;

// --- Configurations ---
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-for-jwt';
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyCZOTeBpEoyOx1KHqqZ86xOK9-ST749HXQ';

// --- Database Configuration ---
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'smart_turf_db',
  password: process.env.DB_PASSWORD || 'Tulsi@2211',
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

// 1. Authentication
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        // Uses columns: name, email, password_hash from 'users' table
        const newUser = await pool.query(
            'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
            [name, email, hashedPassword]
        );
        res.status(201).json(newUser.rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'User with this email already exists.' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }
    try {
        // Uses columns: email, password_hash from 'users' table
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }
        const user = userResult.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1d' });
        res.json({
            token,
            user: { id: user.id, name: user.name, email: user.email }
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 2. Turfs
app.get('/api/turfs', async (req, res) => {
    try {
        // Uses columns: id, name, location, price_per_hour, rating, image_url, latitude, longitude from 'turfs' table
        const allTurfs = await pool.query('SELECT id, name, location, price_per_hour, rating, image_url, latitude, longitude FROM turfs ORDER BY rating DESC');
        res.json(allTurfs.rows);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});


// 3. Bookings
app.get('/api/bookings/slots/:turfId', async (req, res) => {
    const { turfId } = req.params;
    const { date } = req.query;
    if (!date) {
        return res.status(400).json({ error: 'Date query parameter is required.' });
    }
    try {
        // Uses columns: start_time, turf_id from 'bookings' table
        const bookedSlotsResult = await pool.query(
            "SELECT TO_CHAR(start_time, 'HH24:MI') as start_hour FROM bookings WHERE turf_id = $1 AND DATE(start_time) = $2",
            [turfId, date]
        );
        const bookedHours = bookedSlotsResult.rows.map(row => row.start_hour);
        const allSlots = [];
        for (let i = 8; i < 22; i++) {
             const time = `${String(i).padStart(2, '0')}:00`;
             allSlots.push({
                time: `${time} - ${String(i+1).padStart(2, '0')}:00`,
                available: !bookedHours.includes(time)
             });
        }
        res.json({ date, slots: allSlots });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/bookings', authenticateToken, async (req, res) => {
    const { turf_id, start_time, end_time, total_price } = req.body;
    const user_id = req.user.id;
    if (!turf_id || !start_time || !end_time || !total_price) {
        return res.status(400).json({ error: 'Missing required booking information.' });
    }
    try {
        // Uses columns: user_id, turf_id, start_time, end_time, total_price, status from 'bookings' table
        const newBooking = await pool.query(
            'INSERT INTO bookings (user_id, turf_id, start_time, end_time, total_price, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [user_id, turf_id, start_time, end_time, total_price, 'confirmed']
        );
        res.status(201).json(newBooking.rows[0]);
    } catch (error) {
         if (error.code === '23505') {
            return res.status(409).json({ error: 'This time slot is already booked.' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/my-bookings', authenticateToken, async (req, res) => {
    const user_id = req.user.id;
    try {
        // Uses columns from both 'bookings' (b) and 'turfs' (t) tables
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
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 4. Google Maps API Route (No direct DB column usage, just reads from turfs)
app.get('/api/maps/nearby-turfs', async (req, res) => {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
        return res.status(400).json({ error: 'Latitude and longitude are required.' });
    }
    const searchRadius = 0.1; 
    try {
        // Uses columns: latitude, longitude from 'turfs' table for filtering
        const { rows } = await pool.query(
            `SELECT id, name, location, price_per_hour, rating, image_url, latitude, longitude FROM turfs 
             WHERE latitude BETWEEN $1 AND $2 AND longitude BETWEEN $3 AND $4`,
            [lat - searchRadius, parseFloat(lat) + searchRadius, lng - searchRadius, parseFloat(lng) + searchRadius]
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching nearby turfs:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// --- Start Server ---
app.listen(port, () => {
  console.log(`🚀 Server listening at http://localhost:${port}`);
});

