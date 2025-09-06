const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const Venue = require('../models/Venue');
const Booking = require('../models/Booking');
const StaffVenue = require('../models/StaffVenue');
const AvailableSlot = require('../models/AvailableSlot');
const { requireAdmin, requireStaff } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');

// Configuring multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = '../frontend/public/images/venues';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Placeholder for admin routes
router.get('/', (req, res) => {
  res.json({ message: 'Admin routes - to be implemented' });
});

// User Management
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const users = await User.findAll();
    res.json({ success: true, data: { users } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

// Update user information
router.put('/users/:id', requireAdmin, [
  body('firstName').isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters'),
  body('lastName').isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('phone').matches(/^\+?[1-9]\d{1,14}$/).withMessage('Please provide a valid phone number')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Update user fields
    user.firstName = req.body.firstName;
    user.lastName = req.body.lastName;
    user.email = req.body.email;
    user.phone = req.body.phone;
    
    await user.save();
    
    res.json({ 
      success: true, 
      message: 'User updated successfully', 
      data: { user } 
    });
  } catch (error) {
    console.error('❌ User update error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update user' 
    });
  }
});

router.put('/users/:id/role', requireAdmin, [
  body('role').isIn(['user', 'staff', 'admin']).withMessage('Invalid role')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.role = req.body.role;
    await user.save();
    res.json({ success: true, message: 'Role updated', data: { user } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update role' });
  }
});

router.put('/users/:id/status', requireAdmin, [
  body('isActive').isBoolean().withMessage('isActive must be boolean')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.isActive = req.body.isActive;
    await user.save();
    res.json({ success: true, message: 'User status updated', data: { user } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update user status' });
  }
});

// Reset user password
router.put('/users/:id/password', requireAdmin, [
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Update password can be hashed by the model hook
    user.password = req.body.newPassword;
    await user.save();
    
    res.json({ 
      success: true, 
      message: 'Password reset successfully' 
    });
  } catch (error) {
    console.error('❌ Password reset error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to reset password' 
    });
  }
});

// Delete user (admin only)
router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    await user.destroy();
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
});

// Get all bookings (admin only)
router.get('/bookings', requireAdmin, async (req, res) => {
  try {
    const bookings = await Booking.findAll({
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
      }, {
        model: Venue,
        as: 'venue',
        attributes: ['id', 'name', 'sportType', 'city', 'address']
      }],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: { bookings } });
  } catch (error) {
    console.error('❌ Fetch bookings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch bookings' });
  }
});

// Get bookings for a specific venue (admin/staff)
router.get('/venues/:id/bookings', requireAdmin, async (req, res) => {
  try {
    const venueId = req.params.id;
    const bookings = await Booking.findAll({
      where: { venueId },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
      }, {
        model: Venue,
        as: 'venue',
        attributes: ['id', 'name', 'sportType', 'city', 'address']
      }],
      order: [['bookingDate', 'ASC'], ['startTime', 'ASC']]
    });
    res.json({ success: true, data: { bookings } });
  } catch (error) {
    console.error('❌ Fetch venue bookings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch venue bookings' });
  }
});

// Venue Management
router.get('/venues', requireAdmin, async (req, res) => {
  try {
    const venues = await Venue.findAll();
    res.json({ success: true, data: { venues } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch venues' });
  }
});

router.put('/venues/:id/status', requireAdmin, [
  body('isActive').isBoolean().withMessage('isActive must be boolean')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  try {
    const venue = await Venue.findByPk(req.params.id);
    if (!venue) return res.status(404).json({ success: false, message: 'Venue not found' });
    venue.isActive = req.body.isActive;
    await venue.save();
    res.json({ success: true, message: 'Venue status updated', data: { venue } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update venue status' });
  }
});

// Add venue (admin only)
router.post('/venues', requireAdmin, upload.array('images', 10), [
  body('name').isLength({ min: 2, max: 100 }).withMessage('Venue name is required'),
  body('sportType').isString().withMessage('Sport type is required'),
  body('address').isString().withMessage('Address is required'),
  body('city').isString().withMessage('City is required'),
  body('latitude').isString().withMessage('Latitude is required'),
  body('longitude').isString().withMessage('Longitude is required'),
  body('openingHours').isString().withMessage('Opening hours required'),
  body('basePrice').isString().withMessage('Base price required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('❌ Venue creation validation errors:', errors.array());
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  try {
    console.log('🔍 Backend: Received venue data:', req.body);
    console.log('🔍 Backend: Received files:', req.files);
    
         // Process uploaded images
     let imageUrls = [];
     if (req.files && req.files.length > 0) {
       imageUrls = req.files.map(file => `/images/venues/${file.filename}`);
     }
    
    // Parse numeric fields
    const venueData = {
      ...req.body,
      latitude: parseFloat(req.body.latitude),
      longitude: parseFloat(req.body.longitude),
      basePrice: parseFloat(req.body.basePrice),
      openingHours: typeof req.body.openingHours === 'string' ? JSON.parse(req.body.openingHours) : req.body.openingHours,
      images: imageUrls
    };
    
    const venue = await Venue.create({
      id: uuidv4(),
      ...venueData
    });
    res.status(201).json({ success: true, message: 'Venue created', data: { venue } });
  } catch (error) {
    console.error('❌ Backend: Venue creation error:', error);
    res.status(500).json({ success: false, message: 'Failed to create venue', error: error.message });
  }
});

// Edit venue (admin only)
router.put('/venues/:id', requireAdmin, upload.array('newImages', 10), [
  body('name').optional().isLength({ min: 2, max: 100 }),
  body('sportType').optional().isString(),
  body('address').optional().isString(),
  body('city').optional().isString(),
  body('latitude').optional().isNumeric(),
  body('longitude').optional().isNumeric(),
  body('openingHours').optional().isString(),
  body('basePrice').optional().isNumeric(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  try {
    console.log('🔍 Backend: Edit venue data:', req.body);
    console.log('🔍 Backend: Edit venue files:', req.files);
    
    const venue = await Venue.findByPk(req.params.id);
    if (!venue) return res.status(404).json({ success: false, message: 'Venue not found' });
    
    // Parse opening hours 
    let openingHours = req.body.openingHours;
    if (typeof openingHours === 'string') {
      try {
        openingHours = JSON.parse(openingHours);
      } catch (e) {
        openingHours = {};
      }
    }
    
    // Handle current images
    let currentImages = [];
    if (req.body.currentImages) {
      try {
        currentImages = JSON.parse(req.body.currentImages);
      } catch (e) {
        currentImages = [];
      }
    }
    
         // Process new images
     let newImageUrls = [];
     if (req.files && req.files.length > 0) {
               newImageUrls = req.files.map(file => `/images/venues/${file.filename}`);
     }
    
    // Combine current and new images
    const allImages = [...currentImages, ...newImageUrls];
    
    // Update venue data
    const updateData = {
      ...req.body,
      openingHours,
      images: allImages
    };
    
    // Remove fields that shouldn't be updated directly
    delete updateData.currentImages;
    delete updateData.newImages;
    
    Object.assign(venue, updateData);
    await venue.save();
    
    res.json({ success: true, message: 'Venue updated', data: { venue } });
  } catch (error) {
    console.error('❌ Backend: Edit venue error:', error);
    res.status(500).json({ success: false, message: 'Failed to update venue', error: error.message });
  }
});

// Delete venue (admin only)
router.delete('/venues/:id', requireAdmin, async (req, res) => {
  try {
    const venue = await Venue.findByPk(req.params.id);
    if (!venue) return res.status(404).json({ success: false, message: 'Venue not found' });
    
    // Delete related data first
    await Booking.destroy({ where: { venueId: req.params.id } });
    await StaffVenue.destroy({ where: { venueId: req.params.id } });
    await AvailableSlot.destroy({ where: { venueId: req.params.id } });
    
    // Now delete the venue
    await venue.destroy();
    res.json({ success: true, message: 'Venue deleted' });
  } catch (error) {
    console.error('❌ Venue deletion error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete venue', error: error.message });
  }
});

// Staff Management
router.post('/create-staff', requireAdmin, [
  body('firstName').isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters'),
  body('lastName').isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('phone').matches(/^[+][0-9]{10,15}$/).withMessage('Please provide a valid phone number'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('venueIds').optional().isArray().withMessage('Venue IDs must be an array')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  try {
    const { firstName, lastName, email, phone, password, venueIds = [] } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ where: { [Op.or]: [{ email }, { phone }] } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email or phone already registered' });
    }

    const { v4: uuidv4 } = require('uuid');
    const staff = await User.create({
      id: uuidv4(),
      firstName,
      lastName,
      email,
      phone,
      password, 
      role: 'staff',
      isVerified: true,
      isActive: true
    });

    // Assign venues to staff if provided
    if (venueIds.length > 0) {
      const venueAssignments = venueIds.map(venueId => ({
        staffId: staff.id,
        venueId: venueId
      }));
      await StaffVenue.bulkCreate(venueAssignments);
    }

    res.json({ success: true, message: 'Staff created', data: { staff } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create staff' });
  }
});

// Get staff with their assigned venues
router.get('/staff', requireAdmin, async (req, res) => {
  try {
    const staff = await User.findAll({
      where: { role: 'staff' },
      include: [{
        model: Venue,
        as: 'assignedVenues',
        through: { attributes: [] } 
      }]
    });
    res.json({ success: true, data: { staff } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch staff' });
  }
});

// Assign venues to staff
router.post('/staff/:id/assign-venues', requireAdmin, [
  body('venueIds').isArray().withMessage('Venue IDs must be an array')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  try {
    console.log('🔍 Staff venue assignment request:', { staffId: req.params.id, venueIds: req.body.venueIds });
    const { venueIds } = req.body;
    const staffId = req.params.id;

    // Check if staff exists
    const staff = await User.findByPk(staffId);
    if (!staff || staff.role !== 'staff') {
      return res.status(404).json({ success: false, message: 'Staff not found' });
    }

    // Remove existing assign venues
    await StaffVenue.destroy({ where: { staffId } });

    // Create new assigns
    if (venueIds.length > 0) {
      const venueAssignments = venueIds.map(venueId => ({
        staffId,
        venueId
      }));
      await StaffVenue.bulkCreate(venueAssignments);
    }

    res.json({ success: true, message: 'Venues assigned to staff' });
  } catch (error) {
    console.error('❌ Staff venue assignment error:', error);
    res.status(500).json({ success: false, message: 'Failed to assign venues', error: error.message });
  }
});

// Get venues assigned to a specific staff member
router.get('/staff/:id/venues', requireAdmin, async (req, res) => {
  try {
    const staffId = req.params.id;
    const staff = await User.findByPk(staffId, {
      include: [{
        model: Venue,
        as: 'assignedVenues',
        through: { attributes: [] }
      }]
    });

    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff not found' });
    }

    res.json({ success: true, data: { venues: staff.assignedVenues } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch staff venues' });
  }
});

// Staff Schedule: List bookings for staff's assigned venues
router.get('/staff/schedule', requireStaff, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get staff user with assigned venues via belongsToMany association
    const staff = await User.findByPk(userId, {
      include: [{
        model: Venue,
        as: 'assignedVenues',
        attributes: ['id']
      }]
    });

    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff not found' });
    }

    const venueIds = (staff.assignedVenues || []).map(v => v.id);

    if (venueIds.length === 0) {
      return res.json({ success: true, data: { bookings: [] } });
    }

    // Get bookings for assigned venues (pending and confirmed)
    const bookings = await Booking.findAll({
      where: {
        venueId: { [Op.in]: venueIds },
        status: { [Op.in]: ['pending', 'confirmed'] }
      },
      include: [{
        model: Venue,
        as: 'venue',
        attributes: ['id', 'name', 'sportType', 'city']
      }, {
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'phone']
      }],
      order: [['bookingDate', 'ASC'], ['startTime', 'ASC']]
    });

    res.json({ success: true, data: { bookings } });
  } catch (error) {
    console.error('Failed to fetch staff schedule:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch staff schedule' });
  }
});

// Staff: Get assigned venues
router.get('/staff/my-venues', requireStaff, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get staff user with assigned venues via belongsToMany association
    const staff = await User.findByPk(userId, {
      include: [{
        model: Venue,
        as: 'assignedVenues',
        attributes: ['id', 'name', 'sportType', 'address', 'city', 'basePrice', 'openingHours', 'isActive']
      }]
    });

    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff not found' });
    }

    res.json({ success: true, data: { venues: staff.assignedVenues || [] } });
  } catch (error) {
    console.error('Failed to fetch staff venues:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch assigned venues' });
  }
});

// Staff: Update booking status
router.put('/staff/bookings/:id/status', requireStaff, [
  body('status').isIn(['confirmed', 'cancelled', 'completed']).withMessage('Invalid status')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  try {
    const { status } = req.body;
    const bookingId = req.params.id;
    const userId = req.user.id;

    // Get the booking
    const booking = await Booking.findByPk(bookingId, {
      include: [{
        model: Venue,
        as: 'venue',
        attributes: ['id']
      }]
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Check if staff is assigned to this venue
    const staffVenue = await StaffVenue.findOne({
      where: { staffId: userId, venueId: booking.venue.id }
    });

    if (!staffVenue) {
      return res.status(403).json({ success: false, message: 'Not authorized to manage this venue' });
    }

    // Update booking status
    booking.status = status;
    await booking.save();

    res.json({ success: true, message: 'Booking status updated', data: { booking } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update booking status' });
  }
});

// Staff: Cancel booking
router.delete('/staff/bookings/:id', requireStaff, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const userId = req.user.id;

    // Get the booking
    const booking = await Booking.findByPk(bookingId, {
      include: [{
        model: Venue,
        as: 'venue',
        attributes: ['id']
      }]
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Check if staff is assigned to this venue
    const staffVenue = await StaffVenue.findOne({
      where: { staffId: userId, venueId: booking.venue.id }
    });

    if (!staffVenue) {
      return res.status(403).json({ success: false, message: 'Not authorized to manage this venue' });
    }

    // Cancel the booking
    booking.status = 'cancelled';
    await booking.save();

    res.json({ success: true, message: 'Booking cancelled' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to cancel booking' });
  }
});

// Staff: Edit venue details (only assigned venues)
router.put('/staff/venues/:id', requireStaff, [
  body('name').optional().isLength({ min: 2, max: 100 }),
  body('address').optional().isString(),
  body('city').optional().isString(),
  body('openingHours').optional().isObject(),
  body('basePrice').optional().isNumeric()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  try {
    const venueId = req.params.id;
    const userId = req.user.id;

    // Check if staff is assigned to this venue
    const staffVenue = await StaffVenue.findOne({
      where: { staffId: userId, venueId }
    });

    if (!staffVenue) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this venue' });
    }

    // Get and update the venue
    const venue = await Venue.findByPk(venueId);
    if (!venue) {
      return res.status(404).json({ success: false, message: 'Venue not found' });
    }

    Object.assign(venue, req.body);
    await venue.save();

    res.json({ success: true, message: 'Venue updated', data: { venue } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update venue' });
  }
});

// Staff: Get availability for a venue and date
router.get('/staff/availability', requireStaff, async (req, res) => {
  try {
    const { venueId, date } = req.query;
    console.log(' Staff availability request:', { venueId, date, userId: req.user.id });
    
    if (!venueId || !date) {
      return res.status(400).json({ success: false, message: 'venueId and date are required' });
    }

    // Ensure staff is assigned to the venue
    const assigned = await StaffVenue.findOne({ where: { staffId: req.user.id, venueId } });
    console.log(' Staff venue assignment:', assigned);
    
    if (!assigned) {
      return res.status(403).json({ success: false, message: 'Not authorized to manage this venue' });
    }

    // Get staff marked unavailable slots
    const blockedSlots = await AvailableSlot.findAll({
      where: { venueId, date },
      order: [['startTime', 'ASC']]
    });
    console.log(' Blocked slots:', blockedSlots.length);

    // Get actual booked slots for the same date
    const bookedSlots = await Booking.findAll({
      where: { 
        venueId, 
        bookingDate: date,
        status: ['pending', 'confirmed'] // Use array directly instead of Op.or
      },
      order: [['startTime', 'ASC']]
    });
    console.log(' Booked slots:', bookedSlots.length);

    res.json({ 
      success: true, 
      data: { 
        blockedSlots,
        bookedSlots 
      } 
    });
  } catch (error) {
    console.error(' Staff availability error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch availability', error: error.message });
  }
});

// Staff: Set availability (bulk upsert) for a venue and date 
router.post('/staff/availability/bulk', requireStaff, [
  body('venueId').notEmpty().withMessage('venueId is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('slots').isArray({ min: 0 }).withMessage('slots must be an array'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  try {
    const { venueId, date, slots } = req.body;

    // Ensure staff is assigned to the venue
    const assigned = await StaffVenue.findOne({ where: { staffId: req.user.id, venueId } });
    if (!assigned) {
      return res.status(403).json({ success: false, message: 'Not authorized to manage this venue' });
    }

    // Check if any slots being marked as unavailable are already booked
    const blockedSlotKeys = slots
      .filter(s => s.isBlocked)
      .map(s => `${s.startTime}-${s.endTime}`);

    if (blockedSlotKeys.length > 0) {
      const existingBookings = await Booking.findAll({
        where: { 
          venueId, 
          bookingDate: date,
          status: ['pending', 'confirmed'] // Use array directly instead of Op.or
        }
      });

      const bookedSlotKeys = existingBookings.map(b => `${b.startTime}-${b.endTime}`);
      const conflictingSlots = blockedSlotKeys.filter(key => bookedSlotKeys.includes(key));

      if (conflictingSlots.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: `Cannot mark booked slots as unavailable: ${conflictingSlots.join(', ')}` 
        });
      }
    }

    // Replace existing availability for the date
    await AvailableSlot.destroy({ where: { venueId, date } });

    if (slots.length > 0) {
      const payload = slots.map(s => ({
        venueId,
        date,
        startTime: s.startTime,
        endTime: s.endTime,
        isBlocked: !!s.isBlocked,
        createdByStaffId: req.user.id
      }));
      await AvailableSlot.bulkCreate(payload);
    }

    res.json({ success: true, message: 'Availability updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update availability' });
  }
});

module.exports = router; 