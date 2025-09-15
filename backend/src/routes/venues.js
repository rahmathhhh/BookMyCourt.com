const express = require('express');
const router = express.Router();
const Venue = require('../models/Venue');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');

// List venues with filters (city, sportType)

router.get('/', async (req, res) => {
  try {
    const { city, sportType, lat, lng, radius } = req.query;
    let where = { isActive: true };
    if (city) where.city = city;
    if (sportType) where.sportType = sportType;

    let venues = await Venue.findAll({ where });

    // Optional filtering
    if (lat && lng && radius) {
      const R = 6371; // Earth radius in km
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      const maxDistance = parseFloat(radius);

      const venuesWithCoords = venues.filter(v => v.latitude != null && v.longitude != null);
      
      venues = venuesWithCoords.filter(v => {
        const dLat = (parseFloat(v.latitude) - userLat) * Math.PI / 180;
        const dLng = (parseFloat(v.longitude) - userLng) * Math.PI / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(userLat * Math.PI / 180) * Math.cos(parseFloat(v.latitude) * Math.PI / 180) *
          Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        return distance <= maxDistance;
      });
    }

    res.json({ success: true, data: { venues } });
  } catch (error) {
    console.error('Venue list error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch venues' });
  }
});

// Get all reviews for a venue
router.get('/:id/reviews', async (req, res) => {
  try {
    const reviews = await Booking.findAll({
      where: { venueId: req.params.id, review: { [Op.ne]: null } },
      order: [['reviewedAt', 'DESC']]
    });
    res.json({ success: true, data: { reviews } });
  } catch (error) {
    console.error('Venue reviews error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
  }
});

// Submit a review for a venue
router.post(
  '/:id/reviews',
  authenticateToken,
  [
    body('bookingId').notEmpty().withMessage('Booking ID is required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('review').optional().isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { bookingId, rating, review } = req.body;

    try {
      const booking = await Booking.findOne({
        where: {
          id: bookingId,
          userId: req.user.id,
          venueId: req.params.id,
          status: 'completed',
          reviewedAt: null
        }
      });

      if (!booking) {
        return res.status(403).json({
          success: false,
          message: 'You can only review after completing a booking and only once.'
        });
      }

      booking.rating = rating;
      booking.review = review;
      booking.reviewedAt = new Date();
      await booking.save();

      // Update venue rating
      const allReviews = await Booking.findAll({
        where: { venueId: req.params.id, rating: { [Op.ne]: null } }
      });

      const avgRating = allReviews.reduce((sum, b) => sum + b.rating, 0) / (allReviews.length || 1);
      const venue = await Venue.findByPk(req.params.id);
      if (venue) {
        venue.rating = avgRating;
        venue.totalReviews = allReviews.length;
        await venue.save();
      }

      res.json({ success: true, message: 'Review submitted', data: { booking } });
    } catch (error) {
      console.error('Submit review error:', error);
      res.status(500).json({ success: false, message: 'Failed to submit review' });
    }
  }
);

// Get venue reviews
router.get('/:id/reviews', async (req, res) => {
  try {
    const venueId = req.params.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const reviews = await Booking.findAll({
      where: { 
        venueId: venueId, 
        rating: { [Op.ne]: null },
        review: { [Op.ne]: null }
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName']
      }],
      order: [['reviewedAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const totalReviews = await Booking.count({
      where: { 
        venueId: venueId, 
        rating: { [Op.ne]: null }
      }
    });

    res.json({ 
      success: true, 
      data: { 
        reviews,
        totalReviews,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalReviews / limit)
      } 
    });
  } catch (error) {
    console.error('Venue reviews error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch venue reviews' });
  }
});

// Get venue details (must be after /:id/reviews to avoid conflict)
router.get('/:id', async (req, res) => {
  try {
    const venue = await Venue.findByPk(req.params.id);
    if (!venue) return res.status(404).json({ success: false, message: 'Venue not found' });

    const reviews = await Booking.findAll({
      where: { venueId: venue.id, rating: { [Op.ne]: null } },
      order: [['reviewedAt', 'DESC']],
      limit: 5,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName']
      }]
    });

    res.json({ success: true, data: { venue, reviews } });
  } catch (error) {
    console.error('Venue details error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch venue details' });
  }
});

module.exports = router; 
