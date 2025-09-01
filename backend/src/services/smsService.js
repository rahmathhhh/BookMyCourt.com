const twilio = require('twilio');

// Initialize Twilio client
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && 
    process.env.TWILIO_AUTH_TOKEN && 
    process.env.TWILIO_ACCOUNT_SID.startsWith('AC') && 
    process.env.TWILIO_ACCOUNT_SID !== 'your_twilio_account_sid') {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

// Send SMS using Twilio
const sendSMSViaTwilio = async (to, message) => {
  if (!twilioClient) {
    throw new Error('Twilio not configured');
  }

  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    });

    console.log('SMS sent via Twilio:', result.sid);
    return result;
  } catch (error) {
    console.error('Twilio SMS error:', error);
    throw error;
  }
};

// Send SMS using Dialog API (alternative for Sri Lanka)
const sendSMSViaDialog = async (to, message) => {
  if (!process.env.DIALOG_API_KEY || 
      !process.env.DIALOG_API_SECRET || 
      process.env.DIALOG_API_KEY === 'your_dialog_api_key') {
    throw new Error('Dialog API not configured');
  }

  try {
    const axios = require('axios');
    
    const response = await axios.post('https://api.dialog.lk/sms/send', {
      applicationId: process.env.DIALOG_API_KEY,
      password: process.env.DIALOG_API_SECRET,
      destinationAddresses: [to],
      message: message,
      sourceAddress: process.env.DIALOG_PHONE_NUMBER
    });

    console.log('SMS sent via Dialog:', response.data);
    return response.data;
  } catch (error) {
    console.error('Dialog SMS error:', error);
    throw error;
  }
};

// Main send OTP function
const sendOTP = async (phoneNumber, message) => {
  try {
    // Try Twilio first
    if (twilioClient) {
      return await sendSMSViaTwilio(phoneNumber, message);
    }
    
    // Fallback to Dialog
    if (process.env.DIALOG_API_KEY && process.env.DIALOG_API_KEY !== 'your_dialog_api_key') {
      return await sendSMSViaDialog(phoneNumber, message);
    }
    
    // Development fallback - just log the message
    if (process.env.NODE_ENV === 'development') {
      console.log('📱 SMS (Development):', { to: phoneNumber, message });
      return { success: true, development: true };
    }
    
    throw new Error('No SMS provider configured');
  } catch (error) {
    console.error('SMS sending failed:', error);
    throw error;
  }
};

// Verify OTP (for future use)
const verifyOTP = async (phoneNumber, otp) => {
  // This could be used for OTP verification if needed
  // For now, we'll handle verification in the auth routes
  return true;
};

// Send booking confirmation
const sendBookingConfirmation = async (phoneNumber, bookingDetails) => {
  const message = `Your court booking is confirmed! 
Venue: ${bookingDetails.venueName}
Date: ${bookingDetails.date}
Time: ${bookingDetails.time}
Booking ID: ${bookingDetails.id}
Thank you for choosing BookMyCourt.lk!`;

  return await sendOTP(phoneNumber, message);
};

// Send booking reminder
const sendBookingReminder = async (phoneNumber, bookingDetails) => {
  const message = `Reminder: Your court booking is tomorrow!
Venue: ${bookingDetails.venueName}
Date: ${bookingDetails.date}
Time: ${bookingDetails.time}
Booking ID: ${bookingDetails.id}
See you there!`;

  return await sendOTP(phoneNumber, message);
};

// Send cancellation notification
const sendCancellationNotification = async (phoneNumber, bookingDetails) => {
  const message = `Your court booking has been cancelled.
Venue: ${bookingDetails.venueName}
Date: ${bookingDetails.date}
Time: ${bookingDetails.time}
Booking ID: ${bookingDetails.id}
Refund: ${bookingDetails.refundAmount} LKR`;

  return await sendOTP(phoneNumber, message);
};

module.exports = {
  sendOTP,
  verifyOTP,
  sendBookingConfirmation,
  sendBookingReminder,
  sendCancellationNotification
}; 