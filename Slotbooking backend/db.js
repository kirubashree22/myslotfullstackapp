const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // from .env
});

// Test the connection
pool.connect()
  .then(client => {
    console.log('Connected to PostgreSQL successfully');
    client.release(); // release the client back to the pool
  })
  .catch(err => {
    console.error('Error connecting to PostgreSQL:', err.stack);
  });

module.exports = pool;
