const express = require('express');
const router = express.Router();
const pool = require('../db');
const dayjs = require('dayjs'); // npm install dayjs

//generate the slots if there are no slots available.
const generateSlotsForDate = async (date) => {
  const slots = [
    { time: '09:00-10:00', slot_type: 'individual' },
    { time: '10:00-11:00', slot_type: 'individual' },
    { time: '11:00-12:00', slot_type: 'group' },
    { time: '12:00-01:00', slot_type: 'group' }
  ];

  for (let slot of slots) {
    await pool.query(
      `INSERT INTO slots (date, time, slot_type)
       VALUES ($1, $2, $3)`,
      [date, slot.time, slot.slot_type]
    );
  }
};

router.get('/', async (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ error: 'Date is required' });
  }
//comparing the date with the requested date in front end
  const requestedDate = dayjs(date).startOf('day');
  const today = dayjs().startOf('day');

  if (requestedDate.isBefore(today)) {
    return res.json({ message: 'No slots available for past dates', slots: [] });
  }

  try {
    //  Check if slots already exist
    const existingSlots = await pool.query(
      `SELECT * FROM slots WHERE date = $1`,
      [date]
    );

    //  If not, generate them
    if (existingSlots.rows.length === 0) {
      await generateSlotsForDate(date);
    }

    //  Get available slots with booking counts
    const slotsResult = await pool.query(
      `SELECT s.*, 
              COUNT(b.id) AS total_bookings
       FROM slots s
       LEFT JOIN bookings b ON s.id = b.slot_id
       WHERE s.date = $1
       GROUP BY s.id`,
      [date]
    );

    const slots = slotsResult.rows
      .filter(slot => {
        const bookings = parseInt(slot.total_bookings);
        if (slot.slot_type === 'group') {
          return bookings === 0;
        } else {
          return bookings < 6;
        }
      })
      .map(slot => {
        const remaining_seats =
          slot.slot_type === 'group'
            ? 6
            : 6 - parseInt(slot.total_bookings);

        return {
          id: slot.id,
          date: slot.date,
          time: slot.time,
          slot_type: slot.slot_type,
          total_seats: 6,
          available_seats: remaining_seats
        };
      });

    res.json(slots);
  } catch (err) {
    console.error('Error handling slots:', err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;
