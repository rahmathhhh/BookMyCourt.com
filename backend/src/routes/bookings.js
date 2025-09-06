const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Venue = require('../models/Venue');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const sequelize = require('../config/database');
const { sendBookingConfirmation, sendOTP } = require('../services/smsService');
const AvailableSlot = require('../models/AvailableSlot');
const { Op } = require('sequelize'); 

// Helper function to calculate duration in minutes
const calculateDuration = (startTime, endTime) => {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  let startMinutes = startHour * 60 + startMin;
  let endMinutes = endHour * 60 + endMin;
  
  // Handle case where end time is on next day (00:00)
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60; 
  }
  
  return endMinutes - startMinutes;
};

// GET /api/bookings/my-bookings
//Get current user's bookings

router.get('/my-bookings', authenticateToken, async (req, res) => {
  try {
    console.log(' MY-BOOKINGS ROUTE: Fetching bookings for user:', req.user.id, 'Role:', req.user.role);
    
    const bookings = await Booking.findAll({
      where: { userId: req.user.id },
      include: [
        {
          model: Venue,
          as: 'venue',
          attributes: ['id', 'name', 'address', 'city']
        }
      ],
      order: [['bookingDate', 'DESC'], ['startTime', 'ASC']]
    });

    console.log('✅ Found bookings:', bookings.length);
    
    res.json({
      success: true,
      data: { bookings }
    });
  } catch (error) {
    console.error(' Error fetching user bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/bookings
//Get bookings (user's own bookings, or all for admin/staff)
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 GENERAL BOOKINGS ROUTE: User:', req.user.id, 'Role:', req.user.role);
    const { venueId, status, date } = req.query;
    const whereClause = {};
    
    // SECURITY FIX: Only admins and staff can see all bookings
    if (req.user.role === 'admin' || req.user.role === 'staff') {
      // Admins and staff can see all bookings
      if (venueId) whereClause.venueId = venueId;
      if (status) whereClause.status = status;
      if (date) whereClause.bookingDate = date;
    } else {
      // Regular users can only see their own bookings
      whereClause.userId = req.user.id;
      if (venueId) whereClause.venueId = venueId;
      if (status) whereClause.status = status;
      if (date) whereClause.bookingDate = date;
    }

    const bookings = await Booking.findAll({
      where: whereClause,
      include: [
        {
          model: Venue,
          as: 'venue',
          attributes: ['id', 'name', 'address', 'city']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        }
      ],
      order: [['bookingDate', 'DESC'], ['startTime', 'ASC']]
    });

    res.json({
      success: true,
      data: { bookings }
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings'
    });
  }
});

// Get all bookings for a venue on a specific date (for slot availability)
router.get('/slots', async (req, res) => {
  const { venueId, date } = req.query;
  if (!venueId || !date) {
    return res.status(400).json({ success: false, message: 'venueId and date are required' });
  }
  try {
    const now = new Date();
    const expiredReservations = await Booking.findAll({
      where: {
        venueId,
        bookingDate: date,
        status: 'pending',
        otpExpiresAt: { [Op.lt]: now }
      }
    });
    
    if (expiredReservations.length > 0) {
      // Delete expired reservations completely since they're no longer valid
      await Booking.destroy({
        where: {
          venueId,
          bookingDate: date,
          status: 'pending',
          otpExpiresAt: { [Op.lt]: now }
        }
      });
      console.log(` Deleted ${expiredReservations.length} expired reservations for ${venueId} on ${date}`);
    }

    const bookings = await Booking.findAll({
      where: {
        venueId,
        bookingDate: date,
        status: ['pending', 'confirmed']
      },
      attributes: ['startTime', 'endTime', 'status', 'otpExpiresAt']
    });
    // Staff-defined availability for this date
    const availability = await AvailableSlot.findAll({
      where: { venueId, date },
      attributes: ['startTime', 'endTime', 'isBlocked']
    });
    const staffConfigured = availability.length > 0 || (await AvailableSlot.count({ where: { venueId, date } })) > 0;

    res.json({ success: true, data: { bookings, availability, staffConfigured } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch bookings' });
  }
});

// Cleanup expired OTP bookings (for admin/staff use)
router.post('/cleanup-expired', async (req, res) => {
  try {
    const now = new Date();
    
    // Find and delete expired OTP bookings
    const deletedCount = await Booking.destroy({
      where: {
        status: 'pending',
        otpExpiresAt: {
          [Op.lt]: now 
        }
      }
    });

    res.json({ 
      success: true, 
      message: `Cleaned up ${deletedCount} expired OTP bookings`,
      data: { deletedCount }
    });
  } catch (error) {
    console.error('Error cleaning up expired bookings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to cleanup expired bookings' 
    });
  }
});



// POST /api/bookings/initiate
// Initiate a booking and send OTP for confirmation

router.post(
  '/initiate',
  authenticateToken,
  [
    body('venueId').notEmpty().withMessage('Venue ID is required'),
    body('bookingDate').notEmpty().withMessage('Booking date is required'),
    body('startTime').notEmpty().withMessage('Start time is required'),
    body('endTime').notEmpty().withMessage('End time is required'),
    body('amount').isNumeric().withMessage('Amount must be a number'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { venueId, bookingDate, startTime, endTime, amount, currency, players, specialRequests, equipment } = req.body;
    const userId = req.user.id;

    try {
      // Check for conflicting bookings
      const conflicts = await Booking.findConflicts(venueId, bookingDate, startTime, endTime);
      if (conflicts && conflicts.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Time slot is already booked. Please choose another slot.',
        });
      }

      // Calculate duration in minutes
      const start = new Date(`2000-01-01T${startTime}`);
      const end = new Date(`2000-01-01T${endTime}`);
      const durationMinutes = Math.round((end - start) / (1000 * 60));

      // Generate OTP for booking confirmation
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      
      const booking = await Booking.create({
        userId,
        venueId,
        bookingDate,
        startTime,
        endTime,
        duration: durationMinutes,
        amount,
        currency: currency || 'LKR',
        players: players || 1,
        specialRequests,
        equipment,
        status: 'pending',
        otpCode: otp,
        otpExpiresAt: otpExpiry,
        otpVerified: false
      });

      // Send OTP via SMS async
      (async () => {
        try {
          const user = await User.findByPk(userId);
          const venue = await Venue.findByPk(venueId);
          console.log('🔍 Debug - User:', user ? user.phone : 'Not found');
          console.log('🔍 Debug - Venue:', venue ? venue.name : 'Not found');
          console.log('🔍 Debug - OTP:', otp);

          if (user && venue) {
            const message = `Confirm your court booking at ${venue.name} on ${bookingDate} at ${startTime}-${endTime}. Amount: ${amount} LKR. OTP: ${otp}. Valid for 5 minutes.`;
            console.log('📤 Sending OTP message:', message);
            await sendOTP(user.phone, message);
            console.log('✅ OTP sent successfully');
          } else {
            console.log('❌ User or venue not found for OTP sending');
          }
        } catch (smsErr) {
          console.error('❌ Failed to send booking confirmation OTP:', smsErr);
        }
      })();

      res.status(201).json({
        success: true,
        message: 'Booking initiated. Please enter the OTP sent to your phone to confirm.',
        data: { 
          bookingId: booking.id,
          otpExpiresAt: otpExpiry
        },
      });
    } catch (error) {
      console.error('Booking initiation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to initiate booking',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// @route   POST /api/bookings/verify-otp
//  Verify booking OTP and confirm booking not used now
router.post(
  '/verify-otp',
  authenticateToken,
  [
    body('bookingId').notEmpty().withMessage('Booking ID is required'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { bookingId, otp } = req.body;
    const userId = req.user.id;

    try {
      const booking = await Booking.findOne({
        where: { id: bookingId, userId, status: 'pending' }
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found or already confirmed'
        });
      }

      // Check if OTP is valid
      if (booking.otpCode !== otp) {
        return res.status(400).json({
          success: false,
          message: 'Invalid OTP'
        });
      }

      // Check if OTP is expired
      if (new Date() > booking.otpExpiresAt) {
        return res.status(400).json({
          success: false,
          message: 'OTP has expired'
        });
      }

      // Verify OTP and update booking
      booking.otpVerified = true;
      booking.otpCode = null;
      booking.otpExpiresAt = null;
      await booking.save();

      res.json({
        success: true,
        message: 'Booking confirmed successfully. Proceed to payment.',
        data: { booking: booking.toJSON() }
      });
    } catch (error) {
      console.error('OTP verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify OTP',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// POST /api/bookings
// Create a new booking with slot-locking/concurrency handling

router.post(
  '/',
  authenticateToken,
  [
    body('venueId').notEmpty().withMessage('Venue ID is required'),
    body('bookingDate').isISO8601().withMessage('Valid booking date is required'),
    body('startTime').matches(/^\d{2}:\d{2}$/).withMessage('Start time (HH:MM) is required'),
    body('endTime').matches(/^\d{2}:\d{2}$/).withMessage('End time (HH:MM) is required'),
    body('amount').isNumeric().withMessage('Amount is required'),
    body('currency').optional().isString(),
    body('players').optional().isInt({ min: 1, max: 20 }),
    body('specialRequests').optional().isString(),
    body('equipment').optional(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { venueId, bookingDate, startTime, endTime, amount, currency, players, specialRequests, equipment } = req.body;
    const userId = req.user.id;

    const t = await sequelize.transaction();
    try {
      // Check for conflicts including reserved slots
      const conflicts = await Booking.findConflicts(venueId, bookingDate, startTime, endTime);
      if (conflicts && conflicts.length > 0) {
        await t.rollback();
        return res.status(409).json({
          success: false,
          message: 'Time slot is already booked or reserved. Please choose another slot.',
        });
      }

      // Create new booking with reservation time already set
      const now = new Date();
      const reservationExpiry = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now
      
      const booking = await Booking.create({
        userId,
        venueId,
        bookingDate,
        startTime,
        endTime,
        duration: calculateDuration(startTime, endTime), // Calculate duration in minutes
        amount,
        currency: currency || 'LKR',
        players: players || 1,
        specialRequests,
        equipment,
        status: 'pending',
        paymentStatus: 'pending',
        otpExpiresAt: reservationExpiry 
      }, { transaction: t });

      await t.commit();

      res.status(201).json({
        success: true,
        message: 'Booking created successfully',
        data: { booking: booking.toJSON() },
      });
    } catch (error) {
      await t.rollback();
      console.error('Booking creation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create booking',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// POST /api/bookings/resend-otp
// Resend OTP for booking confirmation
router.post(
  '/resend-otp',
  authenticateToken,
  [
    body('bookingId').notEmpty().withMessage('Booking ID is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { bookingId } = req.body;
    const userId = req.user.id;

    try {
      const booking = await Booking.findOne({
        where: { id: bookingId, userId, status: 'pending' }
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      // Generate new OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      booking.otpCode = otp;
      booking.otpExpiresAt = otpExpiry;
      await booking.save();

      // Send new OTP via SMS async
      (async () => {
        try {
          const user = await User.findByPk(userId);
          const venue = await Venue.findByPk(booking.venueId);
          if (user && venue) {
            const message = `Confirm your court booking at ${venue.name} on ${booking.bookingDate} at ${booking.startTime}-${booking.endTime}. Amount: ${booking.amount} LKR. New OTP: ${otp}. Valid for 5 minutes.`;
            await sendOTP(user.phone, message);
          }
        } catch (smsErr) {
          console.error('Failed to send booking confirmation OTP:', smsErr);
        }
      })();

      res.json({
        success: true,
        message: 'New OTP sent successfully',
        data: { otpExpiresAt: otpExpiry }
      });
    } catch (error) {
      console.error('Resend OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resend OTP',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// POST /api/bookings/:id/review
// Submit a review for a completed booking
router.post('/:id/review', authenticateToken, [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('review').optional().trim().isLength({ max: 1000 }).withMessage('Review must be less than 1000 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  try {
    const { rating, review } = req.body;
    const bookingId = req.params.id;
    const userId = req.user.id;

    // Find the booking
    const booking = await Booking.findOne({
      where: {
        id: bookingId,
        userId: userId,
        status: 'completed' // allowing reviews for completed bookings only
      },
      include: [
        {
          model: Venue,
          as: 'venue',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or not eligible for review'
      });
    }

    // Check if already reviewed
    if (booking.rating) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this booking'
      });
    }

    // Update booking with review
    await booking.update({
      rating: rating,
      review: review,
      reviewedAt: new Date()
    });

    // Update venues rating
    const venueReviews = await Booking.findAll({
      where: {
        venueId: booking.venueId,
        rating: { [Op.ne]: null }
      },
      attributes: ['rating']
    });

    if (venueReviews.length > 0) {
      const totalRating = venueReviews.reduce((sum, b) => sum + b.rating, 0);
      const averageRating = (totalRating / venueReviews.length).toFixed(1);
      
      await Venue.update(
        { 
          rating: parseFloat(averageRating),
          totalReviews: venueReviews.length
        },
        { where: { id: booking.venueId } }
      );
    }

    res.json({
      success: true,
      message: 'Review submitted successfully',
      data: {
        rating: booking.rating,
        review: booking.review,
        reviewedAt: booking.reviewedAt
      }
    });

  } catch (error) {
    console.error('Review submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit review',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/bookings/auto-complete
// Auto-complete bookings that have passed their end time

router.post('/auto-complete', authenticateToken, async (req, res) => {
  try {
    const { autoCompleteBookings } = require('../services/bookingService');
    
    const result = await autoCompleteBookings();
    
    res.json({
      success: true,
      message: `Auto-completed ${result.completedCount} bookings`,
      data: result
    });
  } catch (error) {
    console.error('Auto-complete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to auto-complete bookings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router; 