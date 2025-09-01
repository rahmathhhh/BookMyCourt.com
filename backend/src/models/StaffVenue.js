const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const StaffVenue = sequelize.define('StaffVenue', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  staffId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  venueId: {
    type: DataTypes.UUID,
    allowNull: false
  }
}, {
  tableName: 'staff_venues',
  timestamps: false
});

module.exports = StaffVenue; 