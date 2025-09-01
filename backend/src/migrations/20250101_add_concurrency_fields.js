'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('bookings', 'expires_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Booking expiration time for concurrency handling'
    });

    await queryInterface.addColumn('bookings', 'reserved_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'When the slot was temporarily reserved'
    });

    // Update the status enum to include 'expired'
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_bookings_status" ADD VALUE 'expired';
    `);

    // Add indexes for efficient queries
    await queryInterface.addIndex('bookings', ['expires_at'], {
      name: 'bookings_expires_at_idx'
    });

    await queryInterface.addIndex('bookings', ['status', 'expires_at'], {
      name: 'bookings_status_expires_at_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes
    await queryInterface.removeIndex('bookings', 'bookings_expires_at_idx');
    await queryInterface.removeIndex('bookings', 'bookings_status_expires_at_idx');

    // Remove columns
    await queryInterface.removeColumn('bookings', 'expires_at');
    await queryInterface.removeColumn('bookings', 'reserved_at');

    // Note: PostgreSQL doesn't support removing enum values easily
    // The 'expired' value will remain in the enum but won't be used
  }
};
