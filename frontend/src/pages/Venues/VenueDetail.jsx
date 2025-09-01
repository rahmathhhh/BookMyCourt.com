import React, { useEffect, useState } from 'react';
import api from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';
import VenueMap from '../../components/UI/VenueMap';
import { useLocation, useParams } from 'react-router-dom';

const VenueDetail = () => {
  const { id } = useParams();
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  

  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    bookingDate: '',
    players: 1,
    specialRequests: '',
    equipment: []
  });
  const [formError, setFormError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [slotMsg, setSlotMsg] = useState('');
  const [currentBookingId, setCurrentBookingId] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
     const [slots, setSlots] = useState([]);
   const [slotLoading, setSlotLoading] = useState(false);
   const [currentBooking, setCurrentBooking] = useState(null);
   const [selectedSlots, setSelectedSlots] = useState([]);
   const [slotRefreshTrigger, setSlotRefreshTrigger] = useState(0);

  // Helper to generate 1-hour slots based on opening hours
  const generateSlots = (openingHours, date) => {
    console.log('DEBUG openingHours:', openingHours, 'date:', date);
    const day = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    console.log('DEBUG day key:', day, 'hours for day:', openingHours ? openingHours[day] : undefined);
    let hours = openingHours[day];
    // Fallback to default if missing or invalid
    if (!hours || (typeof hours === 'object' && (!hours.open || !hours.close))) {
      hours = { open: '08:00', close: '24:00' };
    }
    let open, close;
    if (typeof hours === 'string') {
      [open, close] = hours.split('-');
    } else if (typeof hours === 'object' && hours.open && hours.close) {
      open = hours.open;
      close = hours.close;
    } else {
      return [];
    }
    if (close === '00:00') close = '24:00'; // Treat midnight as end of day
    const slots = [];
    let start = open;
    while (start < close) {
      let [h, m] = start.split(':').map(Number);
      let endH = h + 1;
      let end = (endH < 10 ? '0' : '') + endH + ':' + (m < 10 ? '0' : '') + m;
      if (end > close) break;
      slots.push({ startTime: start, endTime: end });
      start = end;
    }
    return slots;
  };

     // Fetch slot availability for the selected date
   useEffect(() => {
     if (!venue || !form.bookingDate) return;
     
     const fetchSlots = () => {
       setSlotLoading(true);
       api.get(`/bookings/slots?venueId=${venue.id}&date=${form.bookingDate}`)
         .then(res => {
           // Normalize time format to HH:MM (remove seconds)
           const normalizeTime = (time) => time.substring(0, 5);
           
           const bookings = res.data.data.bookings || [];
           const availability = res.data.data.availability || [];
           
           // Create sets for different slot states
           const bookedPairs = new Set();
           const reservedPairs = new Set();
           
           bookings.forEach(booking => {
             const key = `${normalizeTime(booking.startTime)}-${normalizeTime(booking.endTime)}`;
             if (booking.status === 'confirmed') {
               bookedPairs.add(key);
             } else if (booking.status === 'pending' && booking.otpExpiresAt && new Date(booking.otpExpiresAt) > new Date()) {
               reservedPairs.add(key);
             }
           });
           
           // Treat availability as a blacklist: only slots present with isBlocked=true are unavailable
           const blockedSet = new Set(availability.filter(a => a.isBlocked).map(a => `${normalizeTime(a.startTime)}-${normalizeTime(a.endTime)}`));

           const allSlots = generateSlots(venue.openingHours, form.bookingDate);
           const enriched = allSlots.map(slot => {
             // Use startTime/endTime to match backend format
             const key = `${slot.startTime}-${slot.endTime}`;
             const isBooked = bookedPairs.has(key);
             const isReserved = reservedPairs.has(key);
             const isBlocked = blockedSet.has(key);
             return { ...slot, booked: isBooked, reserved: isReserved, blocked: isBlocked };
                       });
            
            setSlots(enriched);
         })
         .catch(() => setSlots([]))
         .finally(() => setSlotLoading(false));
     };

     // Initial fetch
     fetchSlots();
     
           // Set up auto-refresh every 30 seconds for better performance
      const interval = setInterval(fetchSlots, 30000); // 30 seconds
     
     // Cleanup interval on unmount or date change
     return () => clearInterval(interval);
   }, [venue, form.bookingDate, slotRefreshTrigger]);

   // Force refresh slots when slotRefreshTrigger changes (for any date)
   useEffect(() => {
     if (slotRefreshTrigger > 0 && venue && form.bookingDate) {
       // Immediately trigger a re-fetch of slots
       const fetchSlots = async () => {
         setSlotLoading(true);
         try {
           const res = await api.get(`/bookings/slots?venueId=${venue.id}&date=${form.bookingDate}`);
           
           // Normalize time format to HH:MM (remove seconds)
           const normalizeTime = (time) => time.substring(0, 5);
           
           const bookings = res.data.data.bookings || [];
           const availability = res.data.data.availability || [];
           
           // Create sets for different slot states
           const bookedPairs = new Set();
           const reservedPairs = new Set();
           
           bookings.forEach(booking => {
             const key = `${normalizeTime(booking.startTime)}-${normalizeTime(booking.endTime)}`;
             if (booking.status === 'confirmed') {
               bookedPairs.add(key);
             } else if (booking.status === 'pending' && booking.otpExpiresAt && new Date(booking.otpExpiresAt) > new Date()) {
               reservedPairs.add(key);
             }
           });
           
           // Treat availability as a blacklist: only slots present with isBlocked=true are unavailable
           const blockedSet = new Set(availability.filter(a => a.isBlocked).map(a => `${normalizeTime(a.startTime)}-${normalizeTime(a.endTime)}`));

           const allSlots = generateSlots(venue.openingHours, form.bookingDate);
           const enriched = allSlots.map(slot => {
             // Use startTime/endTime to match backend format
             const key = `${slot.startTime}-${slot.endTime}`;
             const isBooked = bookedPairs.has(key);
             const isReserved = reservedPairs.has(key);
             const isBlocked = blockedSet.has(key);
             return { ...slot, booked: isBooked, reserved: isReserved, blocked: isBlocked };
                       });
            
            setSlots(enriched);
         } catch (error) {
           console.error('Error refreshing slots:', error);
         } finally {
           setSlotLoading(false);
         }
       };
       
       // Execute immediately
       fetchSlots();
     }
   }, [slotRefreshTrigger, venue, form.bookingDate]);

       // Simplified cleanup - removed frequent interval checks for better performance

  useEffect(() => {
    const fetchVenue = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/venues/${id}`);
        setVenue(res.data.data.venue);
      } catch (err) {
        setVenue(null);
      } finally {
        setLoading(false);
      }
    };
    fetchVenue();
  }, [id]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setFormError(null);
    setSuccessMsg(null);
  };

  const handleSlotSelect = (slot) => {
    setFormError(null);
    setSuccessMsg(null);
    setSlotMsg('');
    if (slot.booked || slot.blocked || slot.reserved) return;
    // If not selected, try to add
    if (!selectedSlots.find(s => s.startTime === slot.startTime)) {
      if (selectedSlots.length === 0) {
        setSelectedSlots([slot]);
      } else if (selectedSlots.length < 4) {
        // Check if adjacent
        const times = [...selectedSlots, slot].map(s => s.startTime).sort();
        const idxs = times.map(t => slots.findIndex(s => s.startTime === t));
        const min = Math.min(...idxs);
        const max = Math.max(...idxs);
        if (max - min + 1 === times.length) {
          setSelectedSlots([...selectedSlots, slot].sort((a, b) => a.startTime.localeCompare(b.startTime)));
        } else {
          setSlotMsg('Please select up to 4 continuous slots only.');
        }
      } else {
        setSlotMsg('You can select a maximum of 4 slots.');
      }
    } else {
      // Deselect slot
      setSelectedSlots(selectedSlots.filter(s => s.startTime !== slot.startTime));
    }
  };

  // Helper function to start payment with SDK
  const startPaymentWithSDK = (payHereData) => {
    try {
      // Set up PayHere event handlers
      window.payhere.onCompleted = function onCompleted(orderId) {
        console.log("✅ Payment completed. OrderID:", orderId);
        setSuccessMsg('Payment completed successfully!');
      };

      window.payhere.onDismissed = function onDismissed() {
        console.log("❌ Payment dismissed by user");
        setFormError('Payment was cancelled. Please try again.');
      };

      window.payhere.onError = function onError(error) {
        console.log("❌ Payment error:", error);
        setFormError('Payment error: ' + error);
      };

      // Start the payment
      window.payhere.startPayment(payHereData);
    } catch (sdkError) {
      console.error('❌ PayHere SDK error:', sdkError);
      setFormError('Payment SDK error. Please try again.');
    }
  };

  const handlePayment = async () => {
    console.log('🔍 Initiating payment for booking:', currentBookingId);
    setPaymentLoading(true);
    
    try {
      const res = await api.post('/payments/initiate', { bookingId: currentBookingId });
      console.log('✅ Payment initiation response:', res.data);
      
      if (res.data.success) {
        // Use PayHere SDK instead of manual form submission
        const payHereData = res.data.data;
        console.log('🔍 PayHere data received:', payHereData);
        
        // Show success message
        setSuccessMsg('Redirecting to PayHere for payment...');
        
        // Use PayHere SDK to start payment
        if (window.payhere && window.payhere.startPayment) {
          console.log('✅ PayHere SDK found, starting payment...');
          console.log('🔍 Payment data:', payHereData);
          startPaymentWithSDK(payHereData);
        } else {
          console.log('⏳ PayHere SDK not loaded yet, trying to load it now...');
          
          // Try to load the SDK if it's not available
          if (!document.querySelector('script[src*="payhere.js"]')) {
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = 'https://www.payhere.lk/lib/payhere.js';
            script.async = true;
            
            script.onload = () => {
              console.log('✅ PayHere SDK script loaded, waiting for object...');
              
              // Wait for SDK to be ready
              let attempts = 0;
              const maxAttempts = 100; // 10 seconds
              
              const checkSDK = setInterval(() => {
                attempts++;
                if (window.payhere && window.payhere.startPayment) {
                  clearInterval(checkSDK);
                  console.log('✅ PayHere SDK ready, starting payment...');
                  startPaymentWithSDK(payHereData);
                } else if (attempts >= maxAttempts) {
                  clearInterval(checkSDK);
                  console.error('❌ PayHere SDK failed to become ready after 10 seconds');
                  setFormError('Payment system not ready. Please refresh and try again.');
                }
              }, 100);
            };
            
            script.onerror = () => {
              console.error('❌ Failed to load PayHere SDK script');
              setFormError('Failed to load payment system. Please refresh and try again.');
            };
            
            document.head.appendChild(script);
          } else {
            // Script exists but SDK not ready, wait for it
            console.log('⏳ Script exists, waiting for SDK to be ready...');
            let attempts = 0;
            const maxAttempts = 100; // 10 seconds
            
            const waitForSDK = setInterval(() => {
              attempts++;
              if (window.payhere && window.payhere.startPayment) {
                clearInterval(waitForSDK);
                console.log('✅ PayHere SDK ready, starting payment...');
                startPaymentWithSDK(payHereData);
              } else if (attempts >= maxAttempts) {
                clearInterval(waitForSDK);
                console.error('❌ PayHere SDK failed to become ready after 10 seconds');
                setFormError('Payment system not ready. Please refresh and try again.');
            }
          }, 100);
        }
      }
      }
    } catch (err) {
      console.error('❌ Payment initiation error:', err);
      setFormError(err.response?.data?.message || 'Failed to initiate payment');
    } finally {
      setPaymentLoading(false);
    }
  };





  // Handle PayHere notifications (IPN callbacks)
  const handlePayHereNotification = async (notificationData) => {
    try {
      console.log('📩 PayHere notification received:', notificationData);
      
      // Forward notification to backend
      const response = await api.post('/payments/notify', notificationData);
      
      if (response.data.success) {
        console.log('✅ Notification forwarded to backend successfully');
      } else {
        console.error('❌ Failed to forward notification:', response.data.message);
      }
    } catch (error) {
      console.error('❌ Error forwarding notification:', error);
    }
  };

  // Check if this is a PayHere notification callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentId = urlParams.get('payment_id');
    const statusCode = urlParams.get('status_code');
    
    if (paymentId && statusCode) {
      console.log('🔍 PayHere callback detected:', { paymentId, statusCode });
      // Handle the callback
      const notificationData = {
        payment_id: paymentId,
        status_code: statusCode,
        // Add other callback parameters as needed
      };
      handlePayHereNotification(notificationData);
    }
  }, []);

     // Simplified PayHere SDK loading
   useEffect(() => {
     if (window.payhere && window.payhere.startPayment) {
       return; // Already loaded
     }

     if (!document.querySelector('script[src*="payhere.js"]')) {
       const script = document.createElement('script');
       script.src = 'https://www.payhere.lk/lib/payhere.js';
       script.async = true;
       document.head.appendChild(script);
     }
   }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedSlots.length === 0) {
      setFormError('Please select at least one slot.');
      return;
    }

    if (selectedSlots.length > 4) {
      setFormError('You can select maximum 4 continuous slots.');
      return;
    }

    // Check if slots are continuous
    const sortedSlots = [...selectedSlots].sort((a, b) => 
      a.startTime.localeCompare(b.startTime)
    );
    
    for (let i = 1; i < sortedSlots.length; i++) {
      if (sortedSlots[i].startTime !== sortedSlots[i-1].endTime) {
        setFormError('Please select continuous slots only.');
        return;
      }
    }

    setFormError(null);
    setSlotMsg('');

    try {
      // Calculate total amount
      const totalAmount = selectedSlots.length * (venue?.basePrice || 0);
      
      // Debug amount calculation
      console.log('🔍 Amount calculation:', {
        selectedSlots: selectedSlots.length,
        venueBasePrice: venue?.basePrice,
        totalAmount: totalAmount
      });
      
      // Create booking directly (no OTP needed)
      const res = await api.post('/bookings', {
        venueId: id,
        bookingDate: form.bookingDate,
        startTime: selectedSlots[0].startTime,
        endTime: selectedSlots[selectedSlots.length - 1].endTime,
        amount: totalAmount,
        currency: 'LKR',
        players: form.players,
        specialRequests: form.specialRequests,
        equipment: form.equipment
      });

             if (res.data.success) {
         setSuccessMsg('Booking created successfully! Proceed to payment.');
         setCurrentBookingId(res.data.data.booking.id);
         setCurrentBooking(res.data.data.booking);
         setShowPayment(true);
         
                   // Force refresh slots to show the new reservation status
          // Always trigger slot refresh regardless of current form date
          setSlotRefreshTrigger(prev => prev + 1);
         
         // Reset form but keep the date
         setForm({ ...form, players: 1, specialRequests: '' });
         setSelectedSlots([]);
         setSlotMsg('');
       }
    } catch (err) {
      if (err.response?.status === 409) {
        setFormError('Selected slots are no longer available. Please refresh and try again.');
      } else {
        setFormError(err.response?.data?.message || 'Failed to create booking.');
      }
    }
  };

  // Removed handleOTPVerify, handleOTPClose, handleResendOTP as per edit hint

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Hero Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Venue Info */}
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">{venue ? venue.name : `Venue ID: ${id}`}</h1>
              {venue && (
                <>
                  <div className="flex items-center mb-4">
                    <div className="flex items-center">
                                             {[...Array(5)].map((_, i) => (
                         <svg key={i} className={`w-5 h-5 ${i < 4 ? 'text-yellow-300' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 24 24">
                           <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                         </svg>
                       ))}
                    </div>
                    <span className="ml-2 text-blue-100">4.0 (24 reviews)</span>
                  </div>
                  <div className="space-y-2 text-blue-100">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      <span>{venue.city} • {venue.sportType}</span>
                    </div>
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      <span>Open: {venue.openingHours?.monday || '08:00-22:00'}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Venue Image */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 overflow-hidden">
              {venue?.images && venue.images.length > 0 ? (
                <img 
                  src={venue.images[0]} 
                  alt={venue.name}
                  className="w-full h-48 object-cover rounded-xl mb-4"
                />
              ) : (
                <div className="text-center">
                  <div className="text-6xl mb-4">🏟️</div>
                  <h3 className="text-2xl font-bold mb-2">{venue ? venue.name : 'Venue'}</h3>
                  <p className="text-blue-200">Sports Court</p>
                </div>
              )}
              {venue && (
                <div className="mt-4 p-3 bg-white/20 rounded-lg">
                  <div className="text-3xl font-bold text-yellow-300">Rs. {venue.basePrice}</div>
                  <div className="text-blue-100 text-sm">per hour</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Booking Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Slot Selection Card */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                <svg className="w-8 h-8 mr-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                Select Your Time Slots
              </h2>
              
                             {/* Date Picker */}
               <div className="mb-8">
                 <label className="block text-lg font-semibold text-gray-700 mb-3">Select Date</label>
                 <input
                   type="date"
                   name="bookingDate"
                   value={form.bookingDate}
                   onChange={handleChange}
                   className="w-full px-6 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500 focus:border-blue-500 text-lg transition-all duration-200"
                   required
                 />
               </div>

              {/* Slot Selection */}
              {form.bookingDate && (
                <div className="mb-8">
                  <label className="block text-lg font-semibold text-gray-700 mb-4">Select a 1-hour Slot</label>
                  {slotLoading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading available slots...</p>
                    </div>
                                     ) : slots.length === 0 ? (
                     <div className="text-center py-12 bg-gray-50 rounded-xl">
                       <div className="text-4xl mb-4">📅</div>
                       <p className="text-gray-600 text-lg">No slots available for this day.</p>
                       <p className="text-gray-500 text-sm mt-2">This could mean all slots are booked, blocked by staff, or the venue is closed.</p>
                     </div>
                  ) : (
                    <>
                                             {/* Color Legend */}
                       <div className="mb-6 flex flex-wrap gap-4 text-sm">
                         <span className="flex items-center gap-2">
                           <div className="w-4 h-4 bg-white border-2 border-blue-500 rounded-full"></div>
                           <span className="text-gray-700 font-medium">Available</span>
                         </span>
                         <span className="flex items-center gap-2">
                           <div className="w-4 h-4 bg-orange-400 rounded-full"></div>
                           <span className="text-gray-700 font-medium">Reserved</span>
                         </span>
                         <span className="flex items-center gap-2">
                           <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
                           <span className="text-gray-700 font-medium">Unavailable</span>
                         </span>
                         <span className="flex items-center gap-2">
                           <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                           <span className="text-gray-700 font-medium">Booked</span>
                         </span>
                       </div>
                      
                      

                      {/* Slot Grid */}
                      <div className="grid grid-cols-4 md:grid-cols-6 gap-3 max-w-3xl">
                        {slots.map((slot, idx) => (
                          <button
                            key={`${slot.startTime}-${slot.endTime}`}
                            type="button"
                            className={`rounded-xl w-20 h-14 flex items-center justify-center border-2 text-sm font-semibold transition-all duration-200 transform hover:scale-105
                              ${slot.booked ? 'bg-red-500 text-white border-red-600 cursor-not-allowed shadow-lg' :
                                slot.reserved ? 'bg-orange-400 text-white border-orange-500 cursor-not-allowed shadow-lg' :
                                slot.blocked ? 'bg-gray-300 text-gray-600 border-gray-400 cursor-not-allowed' :
                                selectedSlots.some(s => s.startTime === slot.startTime) ? 'bg-blue-600 text-white border-blue-600 shadow-xl scale-110' :
                                'bg-white text-blue-600 border-blue-500 hover:bg-blue-50 hover:border-blue-600 hover:shadow-md'
                              }
                            `}
                            disabled={slot.booked || slot.blocked || slot.reserved}
                            onClick={() => handleSlotSelect(slot)}
                            title={`${slot.startTime} - ${slot.endTime}${slot.booked ? ' (Booked)' : slot.reserved ? ' (Reserved)' : slot.blocked ? ' (Unavailable)' : ' (Available)'}`}
                          >
                            {slot.startTime}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Slot Message */}
              {slotMsg && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-yellow-800 font-medium">{slotMsg}</span>
                  </div>
                </div>
              )}

              {/* Additional Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-lg font-semibold text-gray-700 mb-3">Number of Players</label>
                  <input
                    type="number"
                    name="players"
                    min={1}
                    max={20}
                    value={form.players}
                    onChange={handleChange}
                    className="w-full px-6 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500 focus:border-blue-500 text-lg transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-lg font-semibold text-gray-700 mb-3">Special Requests</label>
                  <textarea
                    name="specialRequests"
                    value={form.specialRequests}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-6 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500 focus:border-blue-500 text-lg transition-all duration-200 resize-none"
                    placeholder="Any special requirements..."
                  />
                </div>
              </div>

              {/* Error/Success Messages */}
              {(formError || successMsg) && (
                <div className={`mb-6 p-4 rounded-xl border-2 ${
                  formError 
                    ? 'bg-red-50 border-red-200 text-red-800' 
                    : 'bg-green-50 border-green-200 text-green-800'
                }`}>
                  <div className="flex items-center">
                    {formError ? (
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                    <span className="font-medium">{formError || successMsg}</span>
                  </div>
                </div>
              )}

              {/* Book Now Button */}
              <button
                type="submit"
                onClick={handleSubmit}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-8 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                    Processing...
                  </div>
                ) : (
                  'Book Now'
                )}
              </button>
            </div>

            {/* Payment Section */}
            {showPayment && (
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <svg className="w-7 h-7 mr-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
                  </svg>
                  Complete Payment
                </h3>
                <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl p-6 mb-6 border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-3">Booking Summary</h4>
                  <div className="space-y-2 text-blue-800">
                    <div className="flex justify-between">
                      <span>Amount:</span>
                      <span className="font-bold text-lg">Rs. {currentBooking?.amount || (selectedSlots.length * (venue?.basePrice || 0))}</span>
                    </div>
                  </div>
                </div>
                
                
                
                                 <div className="flex justify-center">
                   <button
                     onClick={handlePayment}
                     disabled={paymentLoading}
                     className="w-full max-w-md bg-gradient-to-r from-green-600 to-green-700 text-white py-4 px-6 rounded-xl font-semibold hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg"
                   >
                     {paymentLoading ? (
                       <div className="flex items-center justify-center">
                         <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                         Processing...
                       </div>
                     ) : (
                       'Pay Now'
                     )}
                   </button>
                 </div>
              </div>
            )}
          </div>

          {/* Right Column - Info Cards */}
          <div className="space-y-6">
            {/* Venue Details Card */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <svg className="w-6 h-6 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                Venue Details
              </h3>
              {venue && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600 font-medium">Sport Type:</span>
                    <span className="font-semibold text-gray-900">{venue.sportType}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600 font-medium">Base Price:</span>
                    <span className="font-bold text-blue-600 text-lg">Rs. {venue.basePrice}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600 font-medium">City:</span>
                    <span className="font-semibold text-gray-900">{venue.city}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600 font-medium">Status:</span>
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">Active</span>
                  </div>
                  
                </div>
              )}
            </div>

            {/* Location Card with Map */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <svg className="w-6 h-6 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                Location
              </h3>
                             {venue && venue.latitude && venue.longitude ? (
                 <div className="h-48 bg-gray-200 rounded-xl overflow-hidden relative group cursor-pointer">
                   <VenueMap 
                     selectedLocation={{
                       lat: parseFloat(venue.latitude),
                       lng: parseFloat(venue.longitude)
                     }}
                   />
                   {/* Click overlay with directions button */}
                   <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                     <button
                       onClick={() => {
                         const url = `https://www.google.com/maps/dir/?api=1&destination=${venue.latitude},${venue.longitude}&destination_place_id=${venue.name}`;
                         window.open(url, '_blank');
                       }}
                       className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-blue-700 transform hover:scale-105 shadow-lg"
                     >
                       <svg className="w-4 h-4 mr-2 inline" fill="currentColor" viewBox="0 0 20 20">
                         <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                       </svg>
                       Get Directions
                     </button>
                   </div>
                 </div>
               ) : (
                                 <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl p-6 text-center">
                   <div className="text-4xl mb-3">📍</div>
                   <p className="text-blue-800 font-medium mb-2">Venue Location</p>
                   <p className="text-blue-700 text-sm mb-4">{venue?.address}, {venue?.city}</p>
                   {venue && venue.latitude && venue.longitude && (
                     <button
                       onClick={() => {
                         const url = `https://www.google.com/maps/dir/?api=1&destination=${venue.latitude},${venue.longitude}&destination_place_id=${venue.name}`;
                         window.open(url, '_blank');
                       }}
                       className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transform hover:scale-105 shadow-lg"
                     >
                       <svg className="w-4 h-4 mr-2 inline" fill="currentColor" viewBox="0 0 20 20">
                         <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                       </svg>
                       Get Directions
                     </button>
                   )}
                 </div>
              )}
            </div>
            
            {/* Facilities Card */}
            {venue && venue.facilities && (
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <svg className="w-6 h-6 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Facilities
                </h3>
                <div className="p-4 bg-blue-50 rounded-xl">
                  <p className="text-gray-800 font-medium">{venue.facilities}</p>
                </div>
              </div>
            )}
            
            {/* Opening Hours Card */}
            {venue && venue.openingHours && (
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <svg className="w-6 h-6 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  Opening Hours
                </h3>
                <div className="space-y-2">
                  {Object.entries(venue.openingHours).map(([day, hours]) => (
                    <div key={day} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <span className="capitalize font-medium text-gray-700">{day}</span>
                      <span className="text-gray-600">{hours}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
        </div>
      </div>
    </div>
  );
};

export default VenueDetail; 