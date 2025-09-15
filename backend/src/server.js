const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const db = require('./config/database');

// Ensuring all model associations are initialized
require('./models');

// Import models
const User = require('./models/User');
const Venue = require('./models/Venue');
const Booking = require('./models/Booking');
const authRoutes = require('./routes/auth');
const venueRoutes = require('./routes/venues');
const bookingRoutes = require('./routes/bookings');
const { router: paymentRoutes } = require('./routes/payments');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const { errorHandler } = require('./middleware/errorHandler');
const { authenticateToken } = require('./middleware/auth');
const CleanupService = require('./services/cleanupService');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000"],
  credentials: true
}));
app.use(morgan('combined'));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files with CORS headers
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
}, express.static('uploads'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'BookMyCourt.lk API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes
try {
  app.use('/api/auth', authRoutes);
} catch (err) {
  // console.error(' Error in authRoutes:', err);
}

try {
  app.use('/api/bookings', bookingRoutes);
} catch (err) {
  // console.error(' Error in bookingRoutes:', err);
}

try {
  app.use('/api/venues', venueRoutes);
} catch (err) {
  // console.error(' Error in venueRoutes:', err);
}

try {
  // IPN endpoint should NOT require authentication (PayHere can't provide JWT tokens)
  // We need to import the IPN handler directly
  const { handleIPN, router: paymentRouter } = require('./routes/payments');
  app.post('/api/payments/notify', handleIPN);
  
  // All other payment routes require authentication
  app.use('/api/payments', authenticateToken, paymentRouter);
} catch (err) {
  // console.error(' Error in paymentRoutes:', err);
}

try {
  app.use('/api/users', authenticateToken, userRoutes);
} catch (err) {
  // console.error(' Error in userRoutes:', err);
}

try {
  app.use('/api/admin', authenticateToken, adminRoutes);
} catch (err) {
  // console.error(' Error in adminRoutes:', err);
}

// Socket.io for real time updates
io.on('connection', (socket) => {
  // console.log('User connected:', socket.id);

  // Join venue room for real-time updates
  socket.on('join-venue', (venueId) => {
    socket.join(`venue-${venueId}`);
    // console.log(`User ${socket.id} joined venue ${venueId}`);
  });

  // Leave venue room
  socket.on('leave-venue', (venueId) => {
    socket.leave(`venue-${venueId}`);
    // console.log(`User ${socket.id} left venue ${venueId}`);
  });

  // Handle booking updates
  socket.on('booking-update', (data) => {
    io.to(`venue-${data.venueId}`).emit('availability-updated', data);
  });

  socket.on('disconnect', () => {
    // console.log('User disconnected:', socket.id);
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

const PORT = process.env.PORT || 5000;

// Database connection and server start
const startServer = async () => {
  try {
    // Test database connection
    await db.authenticate();
    // console.log(' Database connection established successfully.');
    
    // Sync database (in development) - temporarily disabled due to index limit
    if (process.env.NODE_ENV === 'development') {
      // Only ensure new lightweight tables exist to avoid index bloat on large tables
      try {
        const AvailableSlot = require('./models/AvailableSlot');
        await AvailableSlot.sync();
        // console.log(' AvailableSlot table ensured.');
      } catch (e) {
        console.warn('⚠️  Skipped AvailableSlot.sync():', e?.message || e);
      }
      // console.log(' Database connection established (sync minimized).');
    }

    // Associations are initialized via require('./models') above
    // Ensuring Booking associations (belongsTo User/Venue) are registered
    if (Booking && typeof Booking.associate === 'function') {
      Booking.associate({ User, Venue });
    }

    // Setup cleanup job for expired bookings and reservations (runs every 15 minutes)
    setInterval(async () => {
      try {
        const result = await CleanupService.runFullCleanup();
        
        // Also auto-complete past bookings
        const { autoCompleteBookings } = require('./services/bookingService');
        const completionResult = await autoCompleteBookings();
        
        if (result.expiredCount > 0 || result.otpCount > 0 || result.reservationCount > 0 || completionResult.completedCount > 0) {
          console.log(` Cleanup job: ${result.expiredCount} expired bookings, ${result.otpCount} expired OTPs, ${result.reservationCount} expired reservations, ${completionResult.completedCount} completed bookings`);
        }
      } catch (error) {
        console.error(' Cleanup job failed:', error);
      }
    }, 15 * 60 * 1000); // 15 minutes

    server.listen(PORT, () => {
      // console.log(` BookMyCourt.lk API server running on port ${PORT}`);
      // console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
      // console.log(` Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    // console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  // console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    // console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  // console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    // console.log('Process terminated');
  });
});

startServer();

module.exports = { app, io }; 