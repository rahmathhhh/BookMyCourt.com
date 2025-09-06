const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findByPk(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or inactive user'
      });
    }

    // Checking if user is verified though otp
    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        message: 'Please verify your phone number with the OTP sent to your phone',
        requiresVerification: true
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

// Role-based authorization
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Admin only
const requireAdmin = authorizeRoles('admin');

// Staff or admin
const requireStaff = authorizeRoles('staff', 'admin');

// User, staff, or admin
const requireUser = authorizeRoles('user', 'staff', 'admin');

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.userId);
      
      if (user && user.isActive) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    next();
  }
};

// Verify user owns resource or is admin
const requireOwnership = (resourceUserIdField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Admin can access everything
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user owns the resource
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    
    if (resourceUserId && resourceUserId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    next();
  };
};

// Verify venue ownership (for venue owners)
const requireVenueOwnership = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Admin can access everything
    if (req.user.role === 'admin') {
      return next();
    }

    const venueId = req.params.venueId || req.body.venueId;
    if (!venueId) {
      return res.status(400).json({
        success: false,
        message: 'Venue ID required'
      });
    }

    const Venue = require('../models/Venue');
    const venue = await Venue.findByPk(venueId);
    
    if (!venue) {
      return res.status(404).json({
        success: false,
        message: 'Venue not found'
      });
    }

    // Check if user owns the venue or is staff
    if (venue.ownerId !== req.user.id && req.user.role !== 'staff') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    req.venue = venue;
    next();
  } catch (error) {
    console.error('Venue ownership check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authorization error'
    });
  }
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  requireAdmin,
  requireStaff,
  requireUser,
  optionalAuth,
  requireOwnership,
  requireVenueOwnership
}; 