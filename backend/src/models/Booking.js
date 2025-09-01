const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { Op } = require('sequelize');

const Booking = sequelize.define('Booking', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  venueId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  bookingDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  startTime: {
    type: DataTypes.TIME,
    allowNull: false
  },
  endTime: {
    type: DataTypes.TIME,
    allowNull: false
  },
  duration: {
    type: DataTypes.INTEGER, // in minutes
    allowNull: false,
    validate: {
      min: 30,
      max: 480 // 8 hours max
    }
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'cancelled', 'completed', 'no-show'),
    defaultValue: 'pending'
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
    defaultValue: 'pending'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'LKR'
  },
  paymentMethod: {
    type: DataTypes.ENUM('payhere', 'cash', 'card', 'bank_transfer'),
    allowNull: true
  },
  paymentReference: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  players: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    validate: {
      min: 1,
      max: 20
    }
  },
  specialRequests: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  equipment: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  cancellationReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  cancelledBy: {
    type: DataTypes.UUID,
    allowNull: true
  },
  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  refundAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  refundReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  checkInTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  checkOutTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 5
    }
  },
  review: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  reviewedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  otpVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  otpCode: {
    type: DataTypes.STRING(6),
    allowNull: true
  },
  otpExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  paymentOtpCode: {
    type: DataTypes.STRING(6),
    allowNull: true
  },
  paymentOtpExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  paymentOtpVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  reminderSent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  reminderSentAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'bookings',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['venue_id'] },
    { fields: ['booking_date'] },
    { fields: ['status'] },
    { fields: ['venue_id', 'booking_date'] }
  ]
});

// Instance methods
Booking.prototype.isActive = function() {
  return ['pending', 'confirmed'].includes(this.status);
};

Booking.prototype.isCompleted = function() {
  return this.status === 'completed';
};

Booking.prototype.isCancelled = function() {
  return this.status === 'cancelled';
};

Booking.prototype.canBeCancelled = function() {
  const now = new Date();
  const bookingDateTime = new Date(`${this.bookingDate}T${this.startTime}`);
  const hoursUntilBooking = (bookingDateTime - now) / (1000 * 60 * 60);
  
  return hoursUntilBooking >= 2; // Can cancel up to 2 hours before
};

Booking.prototype.getRefundAmount = function() {
  if (this.status !== 'cancelled') return 0;
  
  const now = new Date();
  const bookingDateTime = new Date(`${this.bookingDate}T${this.startTime}`);
  const hoursUntilBooking = (bookingDateTime - now) / (1000 * 60 * 60);
  
  // Full refund if cancelled more than 24 hours before
  if (hoursUntilBooking >= 24) {
    return this.amount;
  }
  
  // 50% refund if cancelled 2-24 hours before
  if (hoursUntilBooking >= 2) {
    return this.amount * 0.5;
  }
  
  // No refund if cancelled less than 2 hours before
  return 0;
};

Booking.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  
  // Add computed fields
  values.isActive = this.isActive();
  values.isCompleted = this.isCompleted();
  values.isCancelled = this.isCancelled();
  values.canBeCancelled = this.canBeCancelled();
  values.refundAmount = this.getRefundAmount();
  values.isReserved = this.isReserved();
  
  return values;
};

// Use existing otpExpiresAt field for slot reservation
Booking.prototype.isReserved = function() {
  return this.status === 'pending' && this.otpExpiresAt && new Date() < this.otpExpiresAt;
};

Booking.prototype.getRemainingReservationTime = function() {
  if (!this.isReserved()) return 0;
  const now = new Date();
  const remaining = this.otpExpiresAt.getTime() - now.getTime();
  return Math.max(0, Math.ceil(remaining / (1000 * 60))); // Return minutes
};

Booking.prototype.getReservationStatus = function() {
  if (this.status === 'confirmed') return 'confirmed';
  if (this.status === 'expired') return 'expired';
  if (this.isReserved()) {
    const remaining = this.getRemainingReservationTime();
    if (remaining > 10) return 'reserved';
    if (remaining > 5) return 'reserved-warning';
    return 'reserved-critical';
  }
  return 'pending';
};

Booking.prototype.reserveSlot = function(minutes = 15) {
  const now = new Date();
  this.otpExpiresAt = new Date(now.getTime() + minutes * 60 * 1000);
  this.status = 'pending';
  return this.save();
};

Booking.prototype.extendReservation = function(additionalMinutes = 5) {
  if (!this.isReserved()) return this;
  this.otpExpiresAt = new Date(this.otpExpiresAt.getTime() + additionalMinutes * 60 * 1000);
  return this.save();
};

// Class methods
Booking.findByUser = function(userId, options = {}) {
  return this.findAll({
    where: { userId },
    order: [['bookingDate', 'DESC'], ['startTime', 'DESC']],
    ...options
  });
};

Booking.findByVenue = function(venueId, date, options = {}) {
  const where = { venueId };
  if (date) {
    where.bookingDate = date;
  }
  
  return this.findAll({
    where,
    order: [['startTime', 'ASC']],
    ...options
  });
};

Booking.findConflicts = function(venueId, date, startTime, endTime, excludeId = null) {
  const where = {
    venueId,
    bookingDate: date,
    status: ['pending', 'confirmed']
  };
  
  if (excludeId) {
    where.id = { [Op.ne]: excludeId };
  }
  
  return this.findAll({
    where: {
      ...where,
      [Op.or]: [
        {
          startTime: { [Op.lt]: endTime },
          endTime: { [Op.gt]: startTime }
        }
      ]
    }
  });
};

// Find expired reservations using existing otpExpiresAt field
Booking.findExpiredReservations = function() {
  return this.findAll({
    where: {
      status: 'pending',
      otpExpiresAt: {
        [Op.lt]: new Date()
      }
    }
  });
};

// Check if a specific time slot is currently reserved
Booking.isSlotReserved = function(venueId, date, startTime, endTime) {
  const now = new Date();
  return this.findOne({
    where: {
      venueId,
      bookingDate: date,
      status: 'pending',
      otpExpiresAt: {
        [Op.gt]: now // Still valid reservation
      },
      [Op.or]: [
        {
          startTime: { [Op.lt]: endTime },
          endTime: { [Op.gt]: startTime }
        }
      ]
    }
  });
};

// Get all currently reserved slots for a venue on a specific date
Booking.getCurrentReservations = function(venueId, date) {
  const now = new Date();
  return this.findAll({
    where: {
      venueId,
      bookingDate: date,
      status: 'pending',
      otpExpiresAt: {
        [Op.gt]: now // Still valid reservation
      }
    },
    attributes: ['startTime', 'endTime', 'otpExpiresAt']
  });
};

// Check if a slot is available for booking (not booked or reserved)
Booking.isSlotAvailable = async function(venueId, date, startTime, endTime) {
  const now = new Date();
  
  // Check for existing bookings or reservations
  const existing = await this.findOne({
    where: {
      venueId,
      bookingDate: date,
      [Op.or]: [
        { status: 'confirmed' }, // Confirmed bookings
        {
          status: 'pending',
          otpExpiresAt: { [Op.gt]: now } // Valid reservations
        }
      ],
      [Op.or]: [
        {
          startTime: { [Op.lt]: endTime },
          endTime: { [Op.gt]: startTime }
        }
      ]
    }
  });
  
  return !existing; // Return true if slot is available
};

// Get reservation statistics for a venue
Booking.getReservationStats = async function(venueId, date) {
  const now = new Date();
  
  const [confirmed, reserved, expired] = await Promise.all([
    this.count({
      where: {
        venueId,
        bookingDate: date,
        status: 'confirmed'
      }
    }),
    this.count({
      where: {
        venueId,
        bookingDate: date,
        status: 'pending',
        otpExpiresAt: { [Op.gt]: now }
      }
    }),
    this.count({
      where: {
        venueId,
        bookingDate: date,
        status: 'expired'
      }
    })
  ]);
  
  return { confirmed, reserved, expired };
};



// Associations
Booking.associate = function(models) {
  Booking.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });
  
  Booking.belongsTo(models.Venue, {
    foreignKey: 'venueId',
    as: 'venue'
  });
};

module.exports = Booking; 