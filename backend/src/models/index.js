const User = require('./User');
const Venue = require('./Venue');
const StaffVenue = require('./StaffVenue');
const AvailableSlot = require('./AvailableSlot');

User.belongsToMany(Venue, { through: StaffVenue, as: 'assignedVenues', foreignKey: 'staffId' });
Venue.belongsToMany(User, { through: StaffVenue, as: 'staffMembers', foreignKey: 'venueId' });

// Add direct associations for includes on StaffVenue queries
StaffVenue.belongsTo(User, { foreignKey: 'staffId' });
StaffVenue.belongsTo(Venue, { foreignKey: 'venueId' });

// Availability associations
AvailableSlot.belongsTo(Venue, { foreignKey: 'venueId', as: 'venue' });

module.exports = { User, Venue, StaffVenue, AvailableSlot };