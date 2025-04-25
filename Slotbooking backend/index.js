//  IMPORT REQUIRED MODULES
const express = require('express');        // Import Express.js web framework
const cors = require('cors');              // Import CORS for cross-origin requests
require('dotenv').config();                // Load environment variables from .env

//  IMPORT ROUTES
const authRoutes = require('./routes/auth');           // Auth-related routes (login, register)
const slotRoutes = require('./routes/slots');          // Slot management routes
const bookingRoutes = require('./routes/bookings');    // Booking-related routes

//  SET UP POSTGRESQL CONNECTION
const { Pool } = require('pg');            // Import PostgreSQL client Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Use DB connection string from .env
});

//  INITIALIZE EXPRESS APP
const app = express();         // Create Express application

// APPLY MIDDLEWARES
app.use(cors());               // Enable CORS
app.use(express.json());       // Parse JSON bodies from requests

//  REGISTER ROUTES WITH PREFIXES
app.use('/api/auth', authRoutes);              // All auth routes prefixed with /api/auth
app.use('/api/slots', slotRoutes);             // All slot routes prefixed with /api/slots
app.use('/api/bookings', bookingRoutes);       // All booking routes prefixed with /api/bookings

//  DATABASE CONNECTION TEST FUNCTION
async function testConnection() {
  try {
    const client = await pool.connect();             // Try to connect to DB
    console.log('Connected to PostgreSQL successfully');  // Success message
    client.release();                                // Release DB client back to pool
  } catch (err) {
    console.error('Error connecting to PostgreSQL:', err.stack);  // Error message if connection fails
  }
}

testConnection();  //  TEST DB CONNECTION 

//  START THE SERVER
const PORT = process.env.PORT || 5000;         // Use port from .env or default to 5000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);  // Log confirmation that server is running
});
