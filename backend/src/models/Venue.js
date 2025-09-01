const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const StaffVenue = require('./StaffVenue');
const User = require('./User');

const Venue = sequelize.define('Venue', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: [2, 100]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  sportType: {
    type: DataTypes.ENUM('badminton', 'tennis', 'basketball', 'volleyball', 'football', 'cricket', 'rugby', 'hockey', 'table-tennis', 'squash', 'other'),
    allowNull: false
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  city: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  postalCode: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: false
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING(15),
    allowNull: false,
    validate: {
      is: /^[\+]?[0-9\s\-\(\)]{7,15}$/
    }
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  website: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  openingHours: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {
      monday: { open: '06:00', close: '22:00' },
      tuesday: { open: '06:00', close: '22:00' },
      wednesday: { open: '06:00', close: '22:00' },
      thursday: { open: '06:00', close: '22:00' },
      friday: { open: '06:00', close: '22:00' },
      saturday: { open: '06:00', close: '22:00' },
      sunday: { open: '06:00', close: '22:00' }
    }
  },
  amenities: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  images: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  basePrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  peakPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'LKR'
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1
    }
  },
  surfaceType: {
    type: DataTypes.ENUM('hard', 'clay', 'grass', 'synthetic', 'wooden', 'concrete', 'other'),
    allowNull: true
  },
  isIndoor: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  hasLighting: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  hasParking: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  hasShower: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  hasEquipment: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0,
    validate: {
      min: 0,
      max: 5
    }
  },
  totalReviews: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  ownerId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  bookingAdvanceDays: {
    type: DataTypes.INTEGER,
    defaultValue: 30,
    validate: {
      min: 1,
      max: 365
    }
  },
  cancellationPolicy: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  rules: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'venues',
  indexes: [
    {
      fields: ['sport_type']
    },
    {
      fields: ['city']
    },
    {
      fields: ['latitude', 'longitude']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['featured']
    }
  ]
});

// Instance methods
Venue.prototype.getFullAddress = function() {
  return `${this.address}, ${this.city}${this.postalCode ? `, ${this.postalCode}` : ''}`;
};

Venue.prototype.isOpen = function(date = new Date()) {
  const day = date.toLocaleLowerCase().slice(0, 3);
  const time = date.toTimeString().slice(0, 5);
  const hours = this.openingHours[day];
  
  if (!hours) return false;
  
  return time >= hours.open && time <= hours.close;
};

Venue.prototype.getCurrentPrice = function() {
  const now = new Date();
  const hour = now.getHours();
  
  // Peak hours: 18:00-22:00 (6 PM - 10 PM)
  if (hour >= 18 && hour < 22) {
    return this.peakPrice || this.basePrice;
  }
  
  return this.basePrice;
};

// Class methods
Venue.findByLocation = function(lat, lng, radius = 10) {
  // Simple distance calculation (can be improved with proper geospatial queries)
  return this.findAll({
    where: {
      isActive: true
    }
  });
};

Venue.findBySport = function(sportType) {
  return this.findAll({
    where: {
      sportType,
      isActive: true
    }
  });
};

// Associations
Venue.associate = function(models) {
  Venue.hasMany(models.Booking, {
    foreignKey: 'venueId',
    as: 'bookings'
  });
  
  Venue.belongsTo(models.User, {
    foreignKey: 'ownerId',
    as: 'owner'
  });
  
  Venue.belongsToMany(models.User, {
    through: 'staff_venues',
    foreignKey: 'venueId',
    otherKey: 'staffId',
    as: 'assignedStaff'
  });
};

module.exports = Venue; 