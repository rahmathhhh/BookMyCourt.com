const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');
const Venue = require('../models/Venue');
const { sendBookingConfirmation } = require('../services/smsService');
const crypto = require('crypto');

// Initiating PayHere payment
router.post('/initiate', authenticateToken, async (req, res) => {
  try {
    const { bookingId } = req.body;
    
    const booking = await Booking.findByPk(bookingId);
    if (!booking || booking.userId !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    
    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Booking already paid' });
    }
    
    // Get venue details
    const venue = await Venue.findByPk(booking.venueId);
    const venueName = venue ? venue.name : 'Unknown Venue';
    
    // Ensure user has required fields with fallbacks
    const firstName = req.user.firstName || 'Test';
    const lastName = req.user.lastName || 'User';
    const email = req.user.email || 'test@example.com';
    const phone = req.user.phone || '+94770000000';
    const address = req.user.address || 'Test Address';
    const city = req.user.city || 'Colombo';
    
    const isSandbox = true;
    
    const payHereConfig = {
      sandbox: {
        merchant_id: process.env.PAYHERE_MERCHANT_ID || '1231811',
        base_url: 'https://www.payhere.lk',
        merchant_secret: process.env.PAYHERE_MERCHANT_SECRET || 'MTQyMTE0MTQwMzM5MTgxMTg1MjUwMzk3NzgzOTExNzAwMTE5NDE='
      },
      live: {
        merchant_id: process.env.PAYHERE_MERCHANT_ID || '1231811',
        base_url: 'https://www.payhere.lk',
        merchant_secret: process.env.PAYHERE_MERCHANT_SECRET || 'MTQyMTE0MTQwMzM5MTgxMTg1MjUwMzk3NzgzOTExNzAwMTE5NDE='
      }
    };
    
    const config = isSandbox ? payHereConfig.sandbox : payHereConfig.live;
    
    // Preparing PayHere payment data
    const notifyUrl = process.env.PAYHERE_NOTIFY_URL || 'http://localhost:5000/api/payments/notify';
    console.log('🔗 PayHere notify URL:', notifyUrl);
    
    const payHereData = {
      merchant_id: config.merchant_id,
      return_url: process.env.PAYHERE_RETURN_URL || 'http://localhost:5173/payment-success',
      cancel_url: process.env.PAYHERE_CANCEL_URL || 'http://localhost:5173/payment-cancelled',
      notify_url: notifyUrl,
      order_id: `ORDER_${booking.id}_${Date.now()}`,
      items: `Court Booking at ${venueName}`,
      amount: parseFloat(booking.amount).toFixed(2),
      currency: 'LKR',
      first_name: firstName,
      last_name: lastName,
      email: email,
      phone: phone,
      address: address,
      city: city,
      country: 'Sri Lanka'
    };
    
    // Generating hash using PayHerew formula
    const merchantSecret = config.merchant_secret;
    const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
    const hashString = `${payHereData.merchant_id}${payHereData.order_id}${payHereData.amount}${payHereData.currency}${hashedSecret}`;
    const hash = crypto.createHash('md5').update(hashString).digest('hex').toUpperCase();
    payHereData.hash = hash;
    
    // Add environment info for frontend
    payHereData.isSandbox = isSandbox;
    payHereData.baseUrl = config.base_url;
    
    // Sending data to frontend to redirect to PayHere
    res.json({ success: true, data: payHereData });
  } catch (error) {
    console.error('PayHere initiate error:', error);
    res.status(500).json({ success: false, message: 'Failed to initiate payment' });
  }
});

// PayHere IPN (Instant Payment Notification) callback
const handleIPN = async (req, res) => {
  try {
    console.log(' PayHere IPN received - ngrok is working!');
    console.log(' IPN Data:', req.body);
    
    const {
      merchant_id,
      order_id,
      payment_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig,
      custom_1,
      custom_2,
      method,
      status_message
    } = req.body;
    
    const orderIdParts = order_id.split('_');
    if (orderIdParts.length < 2) {
      console.error('Invalid order_id format:', order_id);
      return res.status(400).json({ success: false, message: 'Invalid order_id format' });
    }
    
    const bookingId = orderIdParts[1]; // Get the booking ID part
    
    // Verify PayHere signature to prevent fake notifications
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET || 'MTQyMTE0MTQwMzM5MTgxMTg1MjUwMzk3NzgzOTExNzAwMTE5NDE=';
    
    // Generating hash using the CORRECT PayHere formula
    const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
    
    const expectedMd5sig = crypto.createHash('md5').update(
      `${merchant_id}${order_id}${payhere_amount}${payhere_currency}${status_code}${hashedSecret}`
    ).digest('hex').toUpperCase();
    
    if (md5sig !== expectedMd5sig) {
      console.error('PayHere signature verification failed');
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }
    
    // Find the booking
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      console.error('Booking not found for ID:', bookingId);
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    
    // Get venue name for SMS
    const venue = await Venue.findByPk(booking.venueId);
    const venueName = venue ? venue.name : 'Unknown Venue';
    
    //payment and booking status based on PayHere status code
    let paymentStatus = 'failed';
    let bookingStatus = 'pending';
    
    if (status_code === '2') {
      paymentStatus = 'paid';
      bookingStatus = 'confirmed';
      console.log('Payment successful for booking:', bookingId);
    } else if (status_code === '0') {
      paymentStatus = 'failed';
      bookingStatus = 'cancelled';
    }
    
    // Updating booking with payment information
    await booking.update({
      paymentStatus: paymentStatus,
      status: bookingStatus,
      paymentId: payment_id,
      paymentMethod: method,
      paymentAmount: payhere_amount,
      paymentCurrency: payhere_currency,
      paymentStatusMessage: status_message
    });
    
    // Send SMS confirmation if payment successful
    if (status_code === '2') {
      try {
        const user = await User.findByPk(booking.userId);
        if (user && user.phone) {
          // Format booking details for SMS
          const bookingDetails = {
            id: booking.id,
            venueName: venueName,
            date: new Date(booking.bookingDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            time: `${booking.startTime} - ${booking.endTime}`
          };
          
          await sendBookingConfirmation(user.phone, bookingDetails);
        }
      } catch (smsError) {
        console.error('SMS sending failed:', smsError);
      }
    }
    
    console.log('Booking updated successfully:', {
      bookingId,
      paymentStatus,
      bookingStatus,
      paymentId: payment_id
    });
    
    // Respond to PayHere
    res.sendStatus(200);
  } catch (error) {
    console.error('PayHere IPN error:', error);
    res.status(500).json({ success: false, message: 'Failed to process IPN' });
  }
};

// Add the IPN route to the router
router.post('/notify', handleIPN);

module.exports = { router, handleIPN };