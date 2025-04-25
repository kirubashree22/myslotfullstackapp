//  IMPORT REQUIRED MODULES
const express = require('express');           // Import Express framework
const router = express.Router();              // Create router instance
const pool = require('../db');                // Import PostgreSQL DB connection pool
const bcrypt = require('bcrypt');             // Import bcrypt for password hashing
const jwt = require('jsonwebtoken');          // Import JWT for token generation

//  DEFINE JWT SECRET KEY
const JWT_SECRET = process.env.JWT_SECRET || 'mysecret';  // Secret key for signing JWTs

//  USER REGISTER ROUTE

router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;   // STEP 3.1: Extract user input from request body
  
    try {
        //  Check if user already exists in DB by email
        const existingUser = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        //  If user exists, return 409 Conflict
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'User already exists' });
        }

        //  Hash the user's password before storing
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user into the database
        const result = await pool.query(
            'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
            [name, email, hashedPassword]
        );

        //  Respond with created user data (excluding password)
        res.status(201).json({ user: result.rows[0] });
    } catch (err) {
        //  Handle any errors during registration
        console.error(err);
        res.status(500).json({ error: 'Registration failed' });
    }
});


// USER LOGIN ROUTE

router.post('/login', async (req, res) => {
    const { email, password } = req.body;  //  Extract login credentials

    try {
        //   Look for the user in the database by email
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        //  If user not found, return 404 Not Found
        if (!user) return res.status(404).json({ error: 'User not found' });

        //   Compare given password with hashed password from DB
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' }); // 401 Unauthorized

        //  Generate JWT token with user ID
        const token = jwt.sign({ userId: user.id }, JWT_SECRET);

        //  Respond with JWT and user info (excluding password)
        res.json({ 
            token, 
            user: { 
                id: user.id, 
                name: user.name, 
                email: user.email 
            } 
        });
    } catch (err) {
        //  Handle any errors during login
        console.error(err);
        res.status(500).json({ error: 'Login failed' });
    }
});

//  EXPORT ROUTER
module.exports = router;  // Export the router so it can be used in the main server which is index
