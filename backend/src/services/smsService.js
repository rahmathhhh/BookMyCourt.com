const twilio = require('twilio');

// Initializez Twilio client
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && 
    process.env.TWILIO_AUTH_TOKEN && 
    process.env.TWILIO_ACCOUNT_SID.startsWith('AC') && 
    process.env.TWILIO_ACCOUNT_SID !== 'your_twilio_account_sid') {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

// Send SMS using SMSAPI.LK (Primary - Sri Lankan provider)
const sendSMSViaSMSAPI = async (to, message) => {
  if (!process.env.SMSAPI_API_TOKEN || 
      !process.env.SMSAPI_SENDER_ID || 
      process.env.SMSAPI_API_TOKEN === 'your_smsapi_api_token') {
    throw new Error('SMSAPI.LK not configured');
  }

  try {
    const axios = require('axios');
    
    // Format phone number (remove + if present, ensure it starts with country code)
    let formattedPhone = to.replace(/^\+/, '');
    if (!formattedPhone.startsWith('94')) {
      formattedPhone = '94' + formattedPhone;
    }
    
    console.log('📤 Sending SMS via SMSAPI.LK:', {
      recipient: formattedPhone,
      sender_id: process.env.SMSAPI_SENDER_ID,
      message: message.substring(0, 50) + '...'
    });
    
    const response = await axios.post('https://dashboard.smsapi.lk/api/v3/sms/send', {
      recipient: formattedPhone,
      sender_id: process.env.SMSAPI_SENDER_ID,
      type: 'plain',
      message: message
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.SMSAPI_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    console.log('📥 SMSAPI.LK Response:', response.data);
    
    // Check if the response indicates an error
    if (response.data.status === 'error') {
      throw new Error(`SMSAPI.LK Error: ${response.data.message}`);
    }
    
    console.log('✅ SMS sent via SMSAPI.LK:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ SMSAPI.LK SMS error:', error.response?.data || error.message);
    throw error;
  }
};

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
    // Try SMSAPI.LK first (Primary - Sri Lankan provider)
    if (process.env.SMSAPI_API_TOKEN && process.env.SMSAPI_API_TOKEN !== 'your_smsapi_api_token') {
      return await sendSMSViaSMSAPI(phoneNumber, message);
    }
    
    // Fallback to Twilio
    if (twilioClient) {
      return await sendSMSViaTwilio(phoneNumber, message);
    }
    
    // Fallback to Dialog
    if (process.env.DIALOG_API_KEY && process.env.DIALOG_API_KEY !== 'your_dialog_api_key') {
      return await sendSMSViaDialog(phoneNumber, message);
    }
    
    // Development fallback - just log the message
    if (process.env.NODE_ENV === 'development') {
      console.log(' SMS (Development):', { to: phoneNumber, message });
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
  return true;
};

// Send booking confirmation
const sendBookingConfirmation = async (phoneNumber, bookingDetails) => {
  const message = `Booking confirmed! 
Venue: ${bookingDetails.venueName}
Date: ${bookingDetails.date}
Time: ${bookingDetails.time}
ID: ${bookingDetails.id}
Thanks! BookMyCourt.lk`;

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