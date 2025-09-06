const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');
const StaffVenue = require('./StaffVenue');
const Venue = require('./Venue');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  firstName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      len: [2, 50]
    }
  },
  lastName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      len: [2, 50]
    }
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING(15),
    allowNull: false,
    unique: true,
    validate: {
      is: /^\+?[1-9]\d{1,14}$/
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      len: [6, 255]
    }
  },
  role: {
    type: DataTypes.ENUM('user', 'staff', 'admin'),
    defaultValue: 'user'
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },

  emailVerifiedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  phoneVerifiedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  otpCode: {
    type: DataTypes.STRING(6),
    allowNull: true
  },
  otpExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'users',
  indexes: [
    { fields: ['email'] },
    { fields: ['phone'] },
    { fields: ['role'] },
    { fields: ['is_active'] }
  ],
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        user.password = await bcrypt.hash(user.password, saltRounds);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        user.password = await bcrypt.hash(user.password, saltRounds);
      }
    }
  }
});

// Instance methods
User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

User.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  delete values.password;
  return values;
};

// Class methods
User.findByEmail = function(email) {
  return this.findOne({ where: { email } });
};

User.findByPhone = function(phone) {
  return this.findOne({ where: { phone } });
};

// Associations
User.associate = function(models) {
  User.hasMany(models.Booking, {
    foreignKey: 'userId',
    as: 'bookings'
  });
  
  User.belongsToMany(models.Venue, {
    through: 'staff_venues',
    foreignKey: 'staffId',
    otherKey: 'venueId',
    as: 'assignedVenues'
  });
};

module.exports = User; 