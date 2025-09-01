const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const { authenticateToken } = require('../middleware/auth');
const axios = require('axios');
const User = require('../models/User');
const Venue = require('../models/Venue');
const { sendBookingConfirmation } = require('../services/smsService');
const crypto = require('crypto'); // For hash calculation

// Placeholder for payments routes
router.get('/', (req, res) => {
  res.json({ message: 'Payments routes - to be implemented' });
});

// Initiate PayHere payment
router.post('/initiate', authenticateToken, async (req, res) => {
  try {
    const { bookingId } = req.body;
    console.log('🔍 Payment initiation for booking:', bookingId);
    
    const booking = await Booking.findByPk(bookingId);
    if (!booking || booking.userId !== req.user.id) {
      console.log('❌ Booking not found or unauthorized');
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    

    
    if (booking.paymentStatus === 'paid') {
      console.log('❌ Booking already paid');
      return res.status(400).json({ success: false, message: 'Booking already paid' });
    }
    
    // Get venue details for better item description
    const venue = await Venue.findByPk(booking.venueId);
    const venueName = venue ? venue.name : 'Unknown Venue';
    
    console.log('🔍 Preparing PayHere data for venue:', venueName);
    
    // Ensure user has required fields with fallbacks
    const firstName = req.user.firstName || 'Test';
    const lastName = req.user.lastName || 'User';
    const email = req.user.email || 'test@example.com';
    const phone = req.user.phone || '+94770000000';
    const address = req.user.address || 'Test Address';
    const city = req.user.city || 'Colombo';
    
    console.log('🔍 User data:', { firstName, lastName, email, phone, address, city });
    
    // Use sandbox for testing - switch to live when ready
    const isSandbox = true; // Set to false for live payments
    
    const payHereConfig = {
      sandbox: {
        merchant_id: process.env.PAYHERE_SANDBOX_MERCHANT_ID || '1231811', // Your actual sandbox merchant ID
        base_url: 'https://www.payhere.lk',
        merchant_secret: process.env.PAYHERE_SANDBOX_MERCHANT_SECRET || 'MTQyMTE0MTQwMzM5MTgxMTg1MjUwMzk3NzgzOTExNzAwMTE5NDE=' // Your actual sandbox secret
      },
      live: {
        merchant_id: process.env.PAYHERE_LIVE_MERCHANT_ID || '1231811',
        base_url: 'https://www.payhere.lk',
        merchant_secret: process.env.PAYHERE_LIVE_MERCHANT_SECRET || 'MTQyMTE0MTQwMzM5MTgxMTg1MjUwMzk3NzgzOTExNzAwMTE5NDE='
      }
    };
    
    const config = isSandbox ? payHereConfig.sandbox : payHereConfig.live;
    
    console.log(`🔧 Using ${isSandbox ? 'SANDBOX' : 'LIVE'} environment`);
    console.log(`🔧 Merchant ID: ${config.merchant_id}`);
    console.log(`🔧 Base URL: ${config.base_url}`);
    
    // Prepare PayHere payment data - using official documentation format
    const payHereData = {
      merchant_id: config.merchant_id,
      return_url: process.env.PAYHERE_RETURN_URL || 'http://localhost:5173/payment-success',
      cancel_url: process.env.PAYHERE_CANCEL_URL || 'http://localhost:5173/payment-cancelled',
      notify_url: process.env.PAYHERE_NOTIFY_URL || 'http://localhost:5000/api/payments/notify',
      order_id: `ORDER_${booking.id}_${Date.now()}`, // Fixed: Include booking ID for proper lookup
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
      // All required fields as per PayHere documentation
    };
    
    // Generate hash using PayHere's correct formula
    // Check if merchant secret is Base64 encoded and decode if necessary
    let merchantSecret = config.merchant_secret;
    console.log('🔍 Original merchant secret:', merchantSecret);
    
    try {
      // Try to decode if it's Base64
      const decoded = Buffer.from(merchantSecret, 'base64').toString('utf8');
      console.log('🔍 Decoded Base64 result:', decoded);
      
      if (decoded && decoded.length > 0) {
        console.log('🔍 Using decoded merchant secret:', decoded);
        merchantSecret = decoded;
      } else {
        console.log('🔍 Decoded result invalid, using original');
      }
    } catch (error) {
      console.log('🔍 Base64 decode failed, using original:', error.message);
    }
    
    const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
    const hashString = `${payHereData.merchant_id}${payHereData.order_id}${payHereData.amount}${payHereData.currency}${hashedSecret}`;
    const hash = crypto.createHash('md5').update(hashString).digest('hex').toUpperCase();
    payHereData.hash = hash;
    
    // Debug: Show hash generation details
    console.log('🔍 Hash generation details:');
    console.log('  - Original Secret:', config.merchant_secret);
    console.log('  - Decoded Secret:', merchantSecret);
    console.log('  - Hashed Secret:', hashedSecret);
    console.log('  - Hash String:', hashString);
    console.log('  - Final Hash:', hash);
    console.log('  - Hash Length:', hash.length);
    
    // Add environment info for frontend
    payHereData.isSandbox = isSandbox;
    payHereData.baseUrl = config.base_url;
    
    console.log('✅ PayHere data prepared:', payHereData);
    
    // Send data to frontend to redirect to PayHere
    res.json({ success: true, data: payHereData });
  } catch (error) {
    console.error('❌ PayHere initiate error:', error);
    res.status(500).json({ success: false, message: 'Failed to initiate payment' });
  }
});

// Debug endpoint - Get payment data without initiating
router.get('/initiate/:bookingId', authenticateToken, async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    // Find the booking
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    
    if (booking.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to view this booking' });
    }
    
    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Booking already paid' });
    }
    
    // Get venue details for better item description
    const venue = await Venue.findByPk(booking.venueId);
    const venueName = venue ? venue.name : 'Unknown Venue';
    
    // Ensure user has required fields with fallbacks
    const firstName = req.user.firstName || 'Test';
    const lastName = req.user.lastName || 'User';
    const email = req.user.email || 'test@example.com';
    const phone = req.user.phone || '+94770000000';
    const address = req.user.address || 'Test Address';
    const city = req.user.city || 'Colombo';
    
    // Prepare PayHere payment data - using official documentation format
    const payHereData = {
      merchant_id: process.env.PAYHERE_MERCHANT_ID || '1231811', // User's actual PayHere merchant ID
      return_url: process.env.PAYHERE_RETURN_URL || 'http://localhost:5173/payment-success',
      cancel_url: process.env.PAYHERE_CANCEL_URL || 'http://localhost:5173/payment-cancelled',
      notify_url: process.env.PAYHERE_NOTIFY_URL || 'http://localhost:5000/api/payments/notify',
      order_id: `ORDER_${booking.id}_${Date.now()}`, // Fixed: Include booking ID for proper lookup
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
      // All required fields as per PayHere documentation
    };
    
         // Generate hash using PayHere's correct formula
     // Check if merchant secret is Base64 encoded and decode if necessary
     let merchantSecret = process.env.PAYHERE_SANDBOX_MERCHANT_SECRET || 'MTQyMTE0MTQwMzM5MTgxMTg1MjUwMzk3NzgzOTExNzAwMTE5NDE=';
    console.log('🔍 Original merchant secret:', merchantSecret);
    
    try {
      // Try to decode if it's Base64
      const decoded = Buffer.from(merchantSecret, 'base64').toString('utf8');
      console.log('🔍 Decoded Base64 result:', decoded);
      
      if (decoded && decoded.length > 0 && !decoded.includes('')) {
        console.log('🔍 Using decoded merchant secret:', decoded);
        merchantSecret = decoded;
      } else {
        console.log('🔍 Decoded result invalid, using original');
      }
    } catch (error) {
      console.log('🔍 Base64 decode failed, using original:', error.message);
    }
    
    const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
    const hashString = `${payHereData.merchant_id}${payHereData.order_id}${payHereData.amount}${payHereData.currency}${hashedSecret}`;
    const hash = crypto.createHash('md5').update(hashString).digest('hex').toUpperCase();
    payHereData.hash = hash;
    
    res.json({ success: true, data: payHereData });
  } catch (error) {
    console.error('❌ PayHere debug error:', error);
    res.status(500).json({ success: false, message: 'Failed to get payment data' });
  }
});

// Test endpoint for Quick Test button
router.post('/test', async (req, res) => {
  try {
    console.log('🧪 Creating test payment data for Quick Test button');
    
    // Use sandbox for testing
    const isSandbox = true;
    
         const payHereConfig = {
       sandbox: {
         merchant_id: process.env.PAYHERE_SANDBOX_MERCHANT_ID || '1231811',
         base_url: 'https://www.payhere.lk',
         merchant_secret: process.env.PAYHERE_SANDBOX_MERCHANT_SECRET || 'MTQyMTE0MTQwMzM5MTgxMTg1MjUwMzk3NzgzOTExNzAwMTE5NDE='
       }
     };
    
    const config = payHereConfig.sandbox;
    
    console.log(`🔧 Using SANDBOX environment for test`);
    console.log(`🔧 Merchant ID: ${config.merchant_id}`);
    
    // Create test payment data
    const payHereData = {
      merchant_id: config.merchant_id,
      return_url: process.env.PAYHERE_RETURN_URL || 'http://localhost:5173/payment-success',
      cancel_url: process.env.PAYHERE_CANCEL_URL || 'http://localhost:5173/payment-cancelled',
      notify_url: 'http://localhost:5173/api/payments/notify', // Match request origin domain
      order_id: `TEST_${Date.now()}`,
      items: 'Test Court Booking',
      amount: '100.00',
      currency: 'LKR',
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      phone: '+94770000000',
      address: 'Test Address',
      city: 'Colombo',
      country: 'Sri Lanka'
    };
    
    // Generate hash using PayHere's correct formula
    // Check if merchant secret is Base64 encoded and decode if necessary
    let merchantSecret = config.merchant_secret;
    console.log('🔍 Original merchant secret:', merchantSecret);
    
    try {
      // Try to decode if it's Base64
      const decoded = Buffer.from(merchantSecret, 'base64').toString('utf8');
      console.log('🔍 Decoded Base64 result:', decoded);
      
      if (decoded && decoded.length > 0) {
        console.log('🔍 Using decoded merchant secret:', decoded);
        merchantSecret = decoded;
      } else {
        console.log('🔍 Decoded result invalid, using original');
      }
    } catch (error) {
      console.log('🔍 Base64 decode failed, using original:', error.message);
    }
    
    const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
    const hashString = `${payHereData.merchant_id}${payHereData.order_id}${payHereData.amount}${payHereData.currency}${hashedSecret}`;
    const hash = crypto.createHash('md5').update(hashString).digest('hex').toUpperCase();
    payHereData.hash = hash;
    
    // Debug: Show hash generation details
    console.log('🔍 Hash generation details:');
    console.log('  - Original Secret:', config.merchant_secret);
    console.log('  - Decoded Secret:', merchantSecret);
    console.log('  - Hashed Secret:', hashedSecret);
    console.log('  - Hash String:', hashString);
    console.log('  - Final Hash:', hash);
    console.log('  - Hash Length:', hash.length);
    
    // Add environment info for frontend
    payHereData.isSandbox = isSandbox;
    payHereData.baseUrl = config.base_url;
    
    console.log('✅ Test payment data prepared:', payHereData);
    
    res.json({ success: true, data: payHereData });
  } catch (error) {
    console.error('❌ Test payment error:', error);
    res.status(500).json({ success: false, message: 'Failed to create test payment data' });
  }
});

// PayHere IPN (Instant Payment Notification) callback
router.post('/notify', async (req, res) => {
  try {
    console.log('📩 PayHere IPN received:', req.body);
    
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
    
    // Extract booking ID from order_id (format: ORDER_${bookingId}_${timestamp})
    const orderIdParts = order_id.split('_');
    if (orderIdParts.length < 2) {
      console.error('❌ Invalid order_id format:', order_id);
      return res.status(400).json({ success: false, message: 'Invalid order_id format' });
    }
    
    const bookingId = orderIdParts[1]; // Get the booking ID part
    console.log('🔍 Extracted booking ID:', bookingId);
    
    // Verify PayHere signature to prevent fake notifications
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET || 'MTQxNzk1NjI0NjMxMDY1ODM4Njc1Mzg2OTQ1OTIzNTM1NDM2Mjg0';
    const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
    const expectedMd5sig = crypto.createHash('md5').update(
      `${merchant_id}${order_id}${payhere_amount}${payhere_currency}${status_code}${hashedSecret}`
    ).digest('hex').toUpperCase();
    
    console.log('🔍 Signature verification:', {
      received: md5sig,
      expected: expectedMd5sig,
      match: md5sig === expectedMd5sig
    });
    
    if (md5sig !== expectedMd5sig) {
      console.error('❌ Invalid signature - possible fake notification');
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }
    
    // Find the booking
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      console.error('❌ Booking not found:', bookingId);
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    
    // Update booking based on payment status
    let paymentStatus = 'pending';
    let bookingStatus = 'pending';
    
    switch (parseInt(status_code)) {
      case 2: // Success
        paymentStatus = 'paid';
        bookingStatus = 'confirmed';
        console.log('✅ Payment successful for booking:', bookingId);
        break;
      case 0: // Pending
        paymentStatus = 'pending';
        bookingStatus = 'pending';
        console.log('⏳ Payment pending for booking:', bookingId);
        break;
      case -1: // Cancelled
        paymentStatus = 'cancelled';
        bookingStatus = 'cancelled';
        console.log('❌ Payment cancelled for booking:', bookingId);
        break;
      case -2: // Failed
        paymentStatus = 'failed';
        bookingStatus = 'cancelled';
        console.log('❌ Payment failed for booking:', bookingId);
        break;
      case -3: // Chargedback
        paymentStatus = 'chargedback';
        bookingStatus = 'cancelled';
        console.log('❌ Payment charged back for booking:', bookingId);
        break;
      default:
        console.log('❓ Unknown payment status:', status_code);
    }
    
    // Update booking
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
          await sendBookingConfirmation(user.phone, booking.id, venueName);
        }
      } catch (smsError) {
        console.error('❌ SMS sending failed:', smsError);
      }
    }
    
    console.log('✅ Booking updated successfully:', {
      bookingId,
      paymentStatus,
      bookingStatus,
      paymentId: payment_id
    });
    
    // Respond to PayHere
    res.sendStatus(200);
  } catch (error) {
    console.error('❌ PayHere IPN error:', error);
    res.status(500).json({ success: false, message: 'Failed to process IPN' });
  }
});

module.exports = router; 