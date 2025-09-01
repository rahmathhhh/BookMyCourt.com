const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AvailableSlot = sequelize.define('AvailableSlot', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  venueId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  startTime: {
    type: DataTypes.STRING(5),
    allowNull: false
  },
  endTime: {
    type: DataTypes.STRING(5),
    allowNull: false
  },
  isBlocked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  createdByStaffId: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'available_slots',
  indexes: [
    { fields: ['venue_id', 'date'] },
    { fields: ['venue_id', 'date', 'start_time'] }
  ]
});

AvailableSlot.associate = function(models) {
  AvailableSlot.belongsTo(models.Venue, { foreignKey: 'venueId', as: 'venue' });
};

module.exports = AvailableSlot;


