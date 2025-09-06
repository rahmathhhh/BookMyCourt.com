const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');
const { sendOTP, verifyOTP } = require('../services/smsService');

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// POST /api/auth/register
// Registering a user

router.post('/register', [
  body('firstName').trim().isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters'),
  body('lastName').trim().isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('phone').notEmpty().withMessage('Please provide a phone number'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('city').optional().trim().isLength({ min: 2, max: 50 }).withMessage('City must be between 2 and 50 characters')
], asyncHandler(async (req, res) => {
  
  console.log('Registration request body:', req.body);
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', errors.array());
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { firstName, lastName, email, phone, password, city, address, dateOfBirth, gender } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({
    where: {
      [require('sequelize').Op.or]: [{ email }, { phone }]
    }
  });

  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: existingUser.email === email ? 'Email already registered' : 'Phone number already registered'
    });
  }

  // Generate OTP for phone verification first
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  // Send OTP via SMS BEFORE creating user
  try {
    await sendOTP(phone, `Your BookMyCourt.lk verification code is: ${otp}. Valid for 5 minutes.`);
    console.log('✅ OTP sent successfully');
  } catch (error) {
    console.error('❌ SMS sending failed:', error);
    return res.status(400).json({
      success: false,
      message: 'Failed to send verification SMS. Please check your phone number and try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : 'SMS service unavailable'
    });
  }

  // Store registration data temporarily (NOT in database yet)
  const registrationData = {
    firstName,
    lastName,
    email,
    phone,
    password,
    city,
    address,
    dateOfBirth,
    gender,
    otpCode: otp,
    otpExpiresAt: otpExpiry
  };

  // Return success with registration data (user NOT created yet)
  res.status(201).json({
    success: true,
    message: 'OTP sent successfully. Please verify your phone number to complete registration.',
    data: {
      registrationData: {
        email,
        phone,
        otpExpiresAt: otpExpiry
      }
    }
  });
}));

// POST /api/auth/login
// Login user

router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { email, password } = req.body;

  // Find user
  const user = await User.findByEmail(email);
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Check if user is active
  if (!user.isActive) {
    return res.status(401).json({
      success: false,
      message: 'Account is deactivated'
    });
  }

  // Check if user is verified (OTP verification required)
  if (!user.isVerified) {
    return res.status(401).json({
      success: false,
      message: 'Please verify your phone number with the OTP sent to your phone',
      requiresVerification: true
    });
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Update last login
  user.lastLoginAt = new Date();
  await user.save();

  // Generate token
  const token = generateToken(user.id);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: user.toJSON(),
      token
    }
  });
}));

// POST /api/auth/verify-otp
// Verify OTP and complete registration (create user in database)
router.post('/verify-otp', [
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').notEmpty().withMessage('Phone number is required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { otp, email, phone, registrationData } = req.body;

  // Checking if user already exists 
  const existingUser = await User.findOne({
    where: {
      [Op.or]: [{ email }, { phone }]
    }
  });

  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: existingUser.email === email ? 'Email already registered' : 'Phone number already registered'
    });
  }

  //temporarily data storage for now
  if (!registrationData) {
    return res.status(400).json({
      success: false,
      message: 'Registration data required for OTP verification'
    });
  }

  // Verify OTP 
  if (!otp || otp.length !== 6) {
    return res.status(400).json({
      success: false,
      message: 'Invalid OTP format'
    });
  }

  // Creating user in database after successful OTP verification
  const user = await User.create({
    firstName: registrationData.firstName,
    lastName: registrationData.lastName,
    email: registrationData.email,
    phone: registrationData.phone,
    password: registrationData.password,
    city: registrationData.city,
    address: registrationData.address,
    dateOfBirth: registrationData.dateOfBirth,
    gender: registrationData.gender,
    isVerified: true,
    phoneVerifiedAt: new Date()
  });

  // Generate token after successful verification
  const token = generateToken(user.id);

  res.json({
    success: true,
    message: 'Registration completed successfully!',
    data: {
      user: user.toJSON(),
      token
    }
  });
}));

// POST /api/auth/resend-otp
// Resend OTP for phone verification
router.post('/resend-otp', asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.body.userId;

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: 'User ID is required'
    });
  }

  const user = await User.findByPk(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Generate new OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  user.otpCode = otp;
  user.otpExpiresAt = otpExpiry;
  await user.save();

  // Send OTP via SMS
  try {
    await sendOTP(user.phone, `Your BookMyCourt.lk verification code is: ${otp}. Valid for 5 minutes.`);
  } catch (error) {
    console.error('SMS sending failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send OTP. Please try again.'
    });
  }

  res.json({
    success: true,
    message: 'OTP sent successfully'
  });
}));

// POST /api/auth/forgot-password
// Send password reset OTP via phone

router.post('/forgot-password', [
  body('phone').notEmpty().withMessage('Please provide a phone number')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { phone } = req.body;

  const user = await User.findOne({ where: { phone } });
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found with this phone number'
    });
  }

  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  user.otpCode = otp;
  user.otpExpiresAt = otpExpiry;
  await user.save();

  // Send OTP via SMS
  try {
    await sendOTP(phone, `Your BookMyCourt.lk password reset code is: ${otp}. Valid for 5 minutes.`);
  } catch (error) {
    console.error('SMS sending failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send OTP. Please try again.'
    });
  }

  res.json({
    success: true,
    message: 'Password reset OTP sent successfully'
  });
}));

//  POST /api/auth/verify-reset-otp
//  Verify OTP for password reset
router.post('/verify-reset-otp', [
  body('phone').notEmpty().withMessage('Please provide a phone number'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { phone, otp } = req.body;

  const user = await User.findOne({ where: { phone } });
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found with this phone number'
    });
  }

  // Check if OTP is valid
  if (user.otpCode !== otp) {
    return res.status(400).json({
      success: false,
      message: 'Invalid OTP'
    });
  }

  // Check if OTP is expired
  if (new Date() > user.otpExpiresAt) {
    return res.status(400).json({
      success: false,
      message: 'OTP has expired'
    });
  }

  res.json({
    success: true,
    message: 'OTP verified successfully'
  });
}));

// POST /api/auth/reset-password
// Reset password with OTP

router.post('/reset-password', [
  body('phone').notEmpty().withMessage('Please provide a phone number'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { phone, otp, newPassword } = req.body;

  const user = await User.findOne({ where: { phone } });
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found with this phone number'
    });
  }

  // Check if OTP is valid
  if (user.otpCode !== otp) {
    return res.status(400).json({
      success: false,
      message: 'Invalid OTP'
    });
  }

  // Check if OTP is expired
  if (new Date() > user.otpExpiresAt) {
    return res.status(400).json({
      success: false,
      message: 'OTP has expired'
    });
  }

  // Update password
  user.password = newPassword;
  user.otpCode = null;
  user.otpExpiresAt = null;
  await user.save();

  res.json({
    success: true,
    message: 'Password reset successfully'
  });
}));

// @route   GET /api/auth/me
// Get current user profile
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id);
  console.log(' /auth/me - User data:', { id: user.id, email: user.email, role: user.role });
  
  res.json({
    success: true,
    data: {
      user: user.toJSON()
    }
  });
}));

// PUT /api/auth/profile
// Update user profile

router.put('/profile', [
  body('firstName').optional().trim().isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters'),
  body('lastName').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters'),
  body('city').optional().trim().isLength({ min: 2, max: 50 }).withMessage('City must be between 2 and 50 characters')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { firstName, lastName, city, address, dateOfBirth, gender } = req.body;

  const user = await User.findByPk(req.user.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Update fields
  if (firstName) user.firstName = firstName;
  if (lastName) user.lastName = lastName;
  if (city) user.city = city;
  if (address !== undefined) user.address = address;
  if (dateOfBirth) user.dateOfBirth = dateOfBirth;
  if (gender) user.gender = gender;

  await user.save();

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: user.toJSON()
    }
  });
}));

module.exports = router; 