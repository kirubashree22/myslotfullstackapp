const express = require('express');
const router = express.Router();
const pool = require('../db'); // Your PostgreSQL pool


// Group booking route
// Route to handle group slot bookings
router.post('/group', async (req, res) => {

  //  Extract user ID and slot ID from the incoming request
  const { user_id, slot_id } = req.body;
  console.log("req body", req.body.user_id);

  try {
      //  Check if the slot is available for group booking and not already full
    
      //  Search the 'slots' table for a record where:
      //     ID matches slot_id
      //     slot_type is 'group'
      //     is_full is FALSE
      const slotCheck = await pool.query(
          'SELECT * FROM slots WHERE id = $1 AND slot_type = $2 AND is_full = FALSE',
          [slot_id, 'group']
      );

  
      // If no such slot is found, return error: "Slot is not available or already booked"
      if (slotCheck.rows.length === 0) {
          return res.status(400).json({ message: 'Slot is not available or already booked.' });
      }

      //  Insert booking details into the 'bookings' table
    
      // - Insert a new row into bookings with:
      //    - user_id, slot_id
      //    - number_of_seats = 6 (fixed for group)
      
      await pool.query(
          'INSERT INTO bookings (user_id, slot_id, number_of_seats, amount) VALUES ($1, $2, $3, $4)',
          [user_id, slot_id, 6, slotCheck.rows[0].price]
      );

      // Mark the slot as full
      //  Update the 'slots' table, set 'is_full' to TRUE for the given slot ID
      await pool.query(
          'UPDATE slots SET is_full = TRUE WHERE id = $1',
          [slot_id]
      );

      // Respond to the client with success
     // Send a 201 response indicating successful booking
      res.status(201).json({ message: 'Group slot successfully booked.' });

  } catch (err) {
      //  Handle unexpected server errors
      console.error(err);
      res.status(500).json({ message: 'Server error' });
  }
});


  // POST /bookings/individual
  router.post('/individual', async (req, res) => {
    // Extract user_id and slot_id from the request body
    const { user_id, slot_id } = req.body;
    console.log("bodyyy", req.body);
  
    try {
      //  Validate if the given slot exists and is of type 'individual'
      const slotCheck = await pool.query(
        'SELECT * FROM slots WHERE id = $1 AND slot_type = $2',
        [slot_id, 'individual']
      );
  
      // If no matching slot found, return an error
      if (slotCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid or non-individual slot' });
      }
  
      // STEP 2: Check if the user has already booked this slot
      const existingBooking = await pool.query(
        'SELECT * FROM bookings WHERE user_id = $1 AND slot_id = $2',
        [user_id, slot_id]
      );
  
      // If user already booked, don't allow rebooking
      if (existingBooking.rows.length > 0) {
        return res.status(400).json({ error: 'User already booked this slot' });
      }
  
      // STEP 3: Count how many people have booked this slot so far
      const bookingCount = await pool.query(
        'SELECT COUNT(*) FROM bookings WHERE slot_id = $1',
        [slot_id]
      );
  
      // Convert string count to integer
      const count = parseInt(bookingCount.rows[0].count);
  
      // If count has reached maximum allowed (6), reject booking
      if (count >= 6) {
        return res.status(400).json({ error: 'Slot is full' });
      }
  
      // STEP 4: Insert the new booking into the database
      await pool.query(
        'INSERT INTO bookings (user_id, slot_id) VALUES ($1, $2)',
        [user_id, slot_id]
      );
  
      // STEP 5: Respond with a success message
      res.status(201).json({ message: 'Slot booked successfully' });
  
    } catch (err) {
      // Catch any errors during the booking process
      console.error('Error in individual booking:', err);
      res.status(500).json({ error: 'Something went wrong' });
    }
  });
  

 // Route to get all bookings for a specific user along with slot and group info
router.get('/my-bookings/:user_id', async (req, res) => {
  //  Extract user_id from request parameters
  const { user_id } = req.params;

  try {
    //  Execute SQL query to:
    //  -Get booking details for the given user
    //  -  Join with slots table to fetch slot metadata like date, time, price, type
    //  -  Join with users table to get the user's name
    //  -  Subquery: Get other users who booked the same slot (except the current user)
    //    and calculate their split amount if it's an individual slot
    const result = await pool.query(
      `SELECT 
          b.id AS booking_id,
         s.date,
          s.time,
        s.slot_type,
          s.price,
          b.amount,
          b.is_leader,
          u.name AS booked_by,
          (
            SELECT json_agg(
              json_build_object(
                'user', u2.name, 
                'split_amount', 
                CASE 
                  WHEN s.slot_type = 'individual' THEN ROUND(s.price / 6.0)  
                  ELSE 0 
                END
              )
            ) 
            FROM bookings b2
            JOIN users u2 ON b2.user_id = u2.id
            WHERE b2.slot_id = b.slot_id AND b2.user_id != $1
          ) AS other_users
        FROM bookings b
        JOIN slots s ON b.slot_id = s.id
        JOIN users u ON b.user_id = u.id
        WHERE b.user_id = $1`,
      [user_id]
    );

   
    const bookings = result.rows.map(booking => {
      let updatedAmount = booking.amount;

      //  If the slot type is 'individual'
      if (booking.slot_type === 'individual') {
        updatedAmount = Math.round(booking.price / 6);  
      }

      //  Return a new booking object 
      return {
        ...booking,
        amount: updatedAmount,
        other_users: booking.other_users || []  
      };
    });

    //  Send the bookings as JSON response
    res.json(bookings);

  } catch (err) {
    //  Handle any errors during the process
    console.error('Error fetching user bookings:', err);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

  

module.exports = router;
