const Booking = require('../models/Booking');
const { Op } = require('sequelize');

class CleanupService {
  static async cleanupExpiredBookings() {
    try {
      console.log('🧹 Starting cleanup of expired bookings...');
      
      // For now, just return 0 since we don't have the findExpired method
      // This will be implemented in the next step
      console.log(` No expired bookings to clean up yet`);
      return 0;
    } catch (error) {
      console.error(' Error during cleanup:', error);
      throw error;
    }
  }
  
  static async cleanupExpiredOTP() {
    try {
      console.log(' Starting cleanup of expired OTP bookings...');
      
      const now = new Date();
      const deletedCount = await Booking.destroy({
        where: {
          status: 'pending',
          otpExpiresAt: {
            [Op.lt]: now
          }
        }
      });
      
      console.log(` Cleaned up ${deletedCount} expired OTP bookings`);
      return deletedCount;
    } catch (error) {
      console.error(' Error during OTP cleanup:', error);
      throw error;
    }
  }

  static async cleanupExpiredReservations() {
    try {
      console.log(' Starting cleanup of expired reservations...');
      
      const now = new Date();
      const expiredReservations = await Booking.findExpiredReservations();
      console.log(` Found ${expiredReservations.length} expired reservations`);
      
      if (expiredReservations.length > 0) {
        // Deleting expired reservations completely since they're no longer valid
        const deletedCount = await Booking.destroy({
          where: {
            status: 'pending',
            otpExpiresAt: {
              [Op.lt]: now
            }
          }
        });
        
        console.log(`✅ Deleted ${deletedCount} expired reservations`);
        return deletedCount;
      }
      
      return 0;
    } catch (error) {
      console.error(' Error during reservation cleanup:', error);
      throw error;
    }
  }
  
  static async runFullCleanup() {
    try {
      console.log(' Starting full cleanup process...');
      
      const [expiredCount, otpCount, reservationCount] = await Promise.all([
        this.cleanupExpiredBookings(),
        this.cleanupExpiredOTP(),
        this.cleanupExpiredReservations()
      ]);
      
      console.log(` Full cleanup completed: ${expiredCount} expired bookings, ${otpCount} expired OTP bookings, ${reservationCount} expired reservations`);
      
      return { expiredCount, otpCount, reservationCount };
    } catch (error) {
      console.error(' Full cleanup failed:', error);
      throw error;
    }
  }
}

module.exports = CleanupService;
