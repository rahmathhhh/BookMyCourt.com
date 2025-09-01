const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
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

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', [
  body('firstName').trim().isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters'),
  body('lastName').trim().isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('phone').notEmpty().withMessage('Please provide a phone number'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('city').optional().trim().isLength({ min: 2, max: 50 }).withMessage('City must be between 2 and 50 characters')
], asyncHandler(async (req, res) => {
  // Debug: Log the request body
  console.log('Registration request body:', req.body);
  
  // Check for validation errors
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

  // Create user
  const user = await User.create({
    firstName,
    lastName,
    email,
    phone,
    password,
    city,
    address,
    dateOfBirth,
    gender
  });

  // Generate OTP for phone verification
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  user.otpCode = otp;
  user.otpExpiresAt = otpExpiry;
  await user.save();

  // Send OTP via SMS
  try {
    await sendOTP(phone, `Your BookMyCourt.lk verification code is: ${otp}. Valid for 5 minutes.`);
  } catch (error) {
    console.error('SMS sending failed:', error);
    // Continue without SMS for development
  }

  res.status(201).json({
    success: true,
    message: 'User registered successfully. Please verify your phone number.',
    data: {
      user: user.toJSON()
    }
  });
}));

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
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

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP for phone verification
// @access  Private
router.post('/verify-otp', [
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

  const { otp } = req.body;
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

  // Verify user
  user.isVerified = true;
  user.phoneVerifiedAt = new Date();
  user.otpCode = null;
  user.otpExpiresAt = null;
  await user.save();

  // Generate token after successful verification
  const token = generateToken(user.id);

  res.json({
    success: true,
    message: 'Phone number verified successfully',
    data: {
      user: user.toJSON(),
      token
    }
  });
}));

// @route   POST /api/auth/resend-otp
// @desc    Resend OTP for phone verification
// @access  Private
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

// @route   POST /api/auth/forgot-password
// @desc    Send password reset OTP via phone
// @access  Public
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

// @route   POST /api/auth/verify-reset-otp
// @desc    Verify OTP for password reset
// @access  Public
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

// @route   POST /api/auth/reset-password
// @desc    Reset password with OTP
// @access  Public
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
// @desc    Get current user profile
// @access  Private
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id);
  
  res.json({
    success: true,
    data: {
      user: user.toJSON()
    }
  });
}));

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
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