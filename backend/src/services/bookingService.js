const { Op } = require('sequelize');
const Booking = require('../models/Booking');

// Auto-complete bookings that have passed their end time
const autoCompleteBookings = async () => {
  try {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS

    console.log(` Auto-completing bookings at ${now.toISOString()}`);
    console.log(` Current date: ${currentDate}, time: ${currentTime}`);

    // Find confirmed bookings that should be completed
    const bookingsToComplete = await Booking.findAll({
      where: {
        status: 'confirmed',
        [Op.or]: [
          // Bookings from previous days
          {
            bookingDate: { [Op.lt]: currentDate }
          },
          // Bookings from today that have passed their end time
          {
            bookingDate: currentDate,
            endTime: { [Op.lt]: currentTime }
          }
        ]
      }
    });

    console.log(`📊 Found ${bookingsToComplete.length} bookings to complete`);

    if (bookingsToComplete.length > 0) {
      // Update all bookings to completed status
      const updateResult = await Booking.update(
        { status: 'completed' },
        {
          where: {
            id: { [Op.in]: bookingsToComplete.map(b => b.id) }
          }
        }
      );

      console.log(` Updated ${updateResult[0]} bookings to completed status`);
      
      // Logging the completed bookings
      bookingsToComplete.forEach(booking => {
        console.log(` Completed: Booking ${booking.id} - ${booking.bookingDate} ${booking.startTime}-${booking.endTime}`);
      });

      return {
        success: true,
        completedCount: updateResult[0],
        bookings: bookingsToComplete.map(b => ({
          id: b.id,
          date: b.bookingDate,
          time: `${b.startTime}-${b.endTime}`
        }))
      };
    }

    return {
      success: true,
      completedCount: 0,
      message: 'No bookings to complete'
    };

  } catch (error) {
    console.error('Auto-complete bookings error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get booking status with auto-completion check
const getBookingStatus = async (booking) => {
  const now = new Date();
  const currentDate = now.toISOString().split('T')[0];
  const currentTime = now.toTimeString().split(' ')[0];

  // If booking is confirmed and time has passed, mark as completed
  if (booking.status === 'confirmed') {
    const shouldBeCompleted = 
      booking.bookingDate < currentDate || 
      (booking.bookingDate === currentDate && booking.endTime < currentTime);

    if (shouldBeCompleted) {
      await booking.update({ status: 'completed' });
      return 'completed';
    }
  }

  return booking.status;
};

module.exports = {
  autoCompleteBookings,
  getBookingStatus
};
