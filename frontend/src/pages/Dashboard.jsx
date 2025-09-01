import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import VenueMap from '../components/UI/VenueMap';
import api from '../services/authService';

const Dashboard = () => {
  const { user, isLoading, token } = useAuth(); // Make sure token is available
  const [users, setUsers] = useState([]);
  const [venues, setVenues] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [staffForm, setStaffForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '' });
  const [staffMsg, setStaffMsg] = useState('');
  const [selectedVenues, setSelectedVenues] = useState([]);
  const [staffVenues, setStaffVenues] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [availabilityDate, setAvailabilityDate] = useState('');
  const [availabilityVenueId, setAvailabilityVenueId] = useState('');
  const [availabilitySlots, setAvailabilitySlots] = useState([]);
  const [availabilityMsg, setAvailabilityMsg] = useState('');
  const [availabilityChanged, setAvailabilityChanged] = useState(false);

  // Helper to generate 1-hour slots based on opening hours
  const generateSlots = (openingHours, date) => {
    const day = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
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

  // Management action handlers (to be implemented)
  const [editUserId, setEditUserId] = useState(null);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', email: '', phone: '', role: '' });
  const [actionMsg, setActionMsg] = useState('');

  // Venue management state
     const [venueForm, setVenueForm] = useState({
     name: '',
     sportType: '',
     address: '',
     city: '',
     latitude: '',
     longitude: '',
     openingHours: {},
     basePrice: '',
     phone: '',
     images: []
 
   });
  const [venueMsg, setVenueMsg] = useState('');
        const [editVenueId, setEditVenueId] = useState(null);
   const [editVenueForm, setEditVenueForm] = useState({});
   const [selectedVenue, setSelectedVenue] = useState(null);
   const [showVenueDetails, setShowVenueDetails] = useState(false);

  // Opening hours form state
  const daysOfWeek = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  const defaultOpening = { open: '08:00', close: '23:59' };
  const [openingHoursForm, setOpeningHoursForm] = useState({
    monday: { ...defaultOpening },
    tuesday: { ...defaultOpening },
    wednesday: { ...defaultOpening },
    thursday: { ...defaultOpening },
    friday: { ...defaultOpening },
    saturday: { ...defaultOpening },
    sunday: { ...defaultOpening },
  });

  // Edit venue opening hours form state
  const [editOpeningHoursForm, setEditOpeningHoursForm] = useState({});

  const sportTypes = [
    'badminton', 'tennis', 'basketball', 'volleyball', 'football', 'cricket', 'rugby', 'hockey', 'table-tennis', 'squash', 'other'
  ];
  
  // Helper function to capitalize sport type for display
  const capitalizeSportType = (sportType) => {
    if (sportType === 'table-tennis') return 'Table Tennis';
    return sportType.charAt(0).toUpperCase() + sportType.slice(1);
  };
  
  const [venueLocation, setVenueLocation] = useState(null);
  const [activeTab, setActiveTab] = useState('users'); // Track active tab

  const handleStaffInput = (e) => {
    setStaffForm({ ...staffForm, [e.target.name]: e.target.value });
  };

  const handleVenueSelection = (venueId) => {
    setSelectedVenues(prev => 
      prev.includes(venueId) 
        ? prev.filter(id => id !== venueId)
        : [...prev, venueId]
    );
  };

  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    setStaffMsg('');
    try {
      const payload = {
        ...staffForm,
        venueIds: selectedVenues
      };
      const res = await api.post(
        '/admin/create-staff',
        payload
      );
      setStaffMsg('Staff created successfully!');
      setStaffForm({ firstName: '', lastName: '', email: '', phone: '', password: '' });
      setSelectedVenues([]);
      // Refresh the users list to show the new staff member
      fetchUsers();
    } catch (err) {
      if (err.response?.data?.errors) {
        setStaffMsg(err.response.data.errors.map(e => e.msg).join(' | '));
      } else if (err.response?.data?.message) {
        setStaffMsg(err.response.data.message);
      } else {
        setStaffMsg('Failed to create staff');
      }
    }
  };

  const handleEditClick = (user) => {
    setEditUserId(user.id);
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role
    });
    setActionMsg('');
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleEditSave = async (id) => {
    setActionMsg('');
    try {
      await api.put(`/admin/users/${id}`, editForm);
      setEditUserId(null);
      setActionMsg('User updated successfully!');
      fetchUsers();
    } catch (err) {
      setActionMsg(err.response?.data?.message || 'Failed to update user');
    }
  };

  const toggleUserStatus = async (user) => {
    setActionMsg('');
    try {
      await api.put(`/admin/users/${user.id}/status`, { isActive: !user.isActive });
      setActionMsg(`${user.isActive ? 'Deactivated' : 'Activated'} user successfully!`);
      fetchUsers();
    } catch (err) {
      setActionMsg(err.response?.data?.message || 'Failed to update user status');
    }
  };

  const resetUserPassword = async (user) => {
    const newPassword = prompt('Enter new password for user:');
    if (!newPassword) return;
    try {
      await api.put(`/admin/users/${user.id}/password`, { newPassword });
      setActionMsg('Password reset successfully!');
    } catch (err) {
      setActionMsg(err.response?.data?.message || 'Failed to reset password');
    }
  };

  // Staff venue assignment functions
  const [staffAssignmentForm, setStaffAssignmentForm] = useState({ staffId: '', venueIds: [] });
  const [staffAssignmentMsg, setStaffAssignmentMsg] = useState('');
  const [showStaffAssignment, setShowStaffAssignment] = useState(false);
  const [selectedStaffForAssignment, setSelectedStaffForAssignment] = useState(null);

  const handleStaffAssignmentClick = (staff) => {
    setSelectedStaffForAssignment(staff);
    setStaffAssignmentForm({
      staffId: staff.id,
      venueIds: staff.assignedVenues ? staff.assignedVenues.map(v => v.id) : []
    });
    setShowStaffAssignment(true);
    setStaffAssignmentMsg('');
  };

  const handleStaffAssignmentChange = (e) => {
    const { name, value } = e.target;
    if (name === 'venueIds') {
      // Handle multiple venue selection
      const venueId = value;
      setStaffAssignmentForm(prev => ({
        ...prev,
        venueIds: prev.venueIds.includes(venueId)
          ? prev.venueIds.filter(id => id !== venueId)
          : [...prev.venueIds, venueId]
      }));
    } else {
      setStaffAssignmentForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleStaffAssignmentSubmit = async (e) => {
    e.preventDefault();
    setStaffAssignmentMsg('');
    
    try {
      console.log('🔍 Frontend: Sending staff assignment:', staffAssignmentForm);
      
      const response = await api.post(
        `/admin/staff/${staffAssignmentForm.staffId}/assign-venues`,
        { venueIds: staffAssignmentForm.venueIds }
      );
      
      setStaffAssignmentMsg('Staff venue assignment updated successfully!');
      setShowStaffAssignment(false);
      setSelectedStaffForAssignment(null);
      
      // Refresh staff data to show updated assignments
      fetchStaff();
      fetchUsers();
      
    } catch (err) {
      console.error('❌ Staff assignment error:', err);
      setStaffAssignmentMsg(
        err.response?.data?.message || 
        'Failed to update staff venue assignment'
      );
    }
  };

  const removeStaffFromVenue = async (staffId, venueId) => {
    try {
      const currentVenues = staffAssignmentForm.venueIds.filter(id => id !== venueId);
      await api.post(
        `/admin/staff/${staffId}/assign-venues`,
        { venueIds: currentVenues }
      );
      
      setStaffAssignmentMsg('Staff removed from venue successfully!');
      setStaffAssignmentForm(prev => ({
        ...prev,
        venueIds: currentVenues
      }));
      
      // Refresh data
      fetchStaff();
      fetchUsers();
      
    } catch (err) {
      setStaffAssignmentMsg(
        err.response?.data?.message || 
        'Failed to remove staff from venue'
      );
    }
  };

  const deleteUser = async (user) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/admin/users/${user.id}`);
      setActionMsg('User deleted successfully!');
      fetchUsers();
    } catch (err) {
      setActionMsg(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleVenueInput = (e) => {
    setVenueForm({ ...venueForm, [e.target.name]: e.target.value });
  };

  const handleVenueImageChange = (e) => {
    const files = Array.from(e.target.files);
    setVenueForm(prev => ({ ...prev, images: files }));
  };

  const removeVenueImage = (index) => {
    setVenueForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleEditVenueImageChange = (e) => {
    const files = Array.from(e.target.files);
    setEditVenueForm(prev => ({ 
      ...prev, 
      newImages: [...(prev.newImages || []), ...files] 
    }));
  };

  const removeEditVenueImage = (index) => {
    setEditVenueForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const removeEditVenueNewImage = (index) => {
    setEditVenueForm(prev => ({
      ...prev,
      newImages: prev.newImages.filter((_, i) => i !== index)
    }));
  };

  const handleOpeningHoursChange = (day, field, value) => {
    setOpeningHoursForm({
      ...openingHoursForm,
      [day]: { ...openingHoursForm[day], [field]: value }
    });
  };

  const handleEditVenueOpeningHoursChange = (day, field, value) => {
    setEditOpeningHoursForm(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
  };

  const fetchVenues = async () => {
    try {
      const venuesRes = await api.get('/admin/venues');
      setVenues(venuesRes.data.data.venues || []);
    } catch (err) {
      setVenues([]);
    }
  };

  const handleVenueSubmit = async (e) => {
    e.preventDefault();
    setVenueMsg('');
    try {
      // Create FormData for file upload
      const formData = new FormData();
      
      // Add basic venue data
      formData.append('name', venueForm.name);
      formData.append('sportType', venueForm.sportType);
      formData.append('address', venueForm.address);
      formData.append('city', venueForm.city);
      formData.append('latitude', venueForm.latitude);
      formData.append('longitude', venueForm.longitude);
      formData.append('phone', venueForm.phone);
      formData.append('basePrice', venueForm.basePrice);
      formData.append('ownerId', user.id);
      
      // Build openingHours object from form
      const openingHours = {};
      daysOfWeek.forEach(day => {
        if (openingHoursForm[day].open && openingHoursForm[day].close) {
          openingHours[day] = `${openingHoursForm[day].open}-${openingHoursForm[day].close}`;
        }
      });
      formData.append('openingHours', JSON.stringify(openingHours));
      
      // Add images
      if (venueForm.images && venueForm.images.length > 0) {
        venueForm.images.forEach((image, index) => {
          formData.append('images', image);
        });
      }
      
      // Debug: Log the form data being sent
      console.log('🔍 Frontend: Sending venue form data with images:', venueForm.images?.length || 0);
      
      await api.post('/admin/venues', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setVenueMsg('Venue added successfully!');
             setVenueForm({ name: '', sportType: '', address: '', city: '', latitude: '', longitude: '', openingHours: {}, basePrice: '', phone: '', images: [] });
      setVenueLocation(null);
      setOpeningHoursForm({
        monday: { ...defaultOpening },
        tuesday: { ...defaultOpening },
        wednesday: { ...defaultOpening },
        thursday: { ...defaultOpening },
        friday: { ...defaultOpening },
        saturday: { ...defaultOpening },
        sunday: { ...defaultOpening },
      });
      fetchVenues();
    } catch (err) {
      setVenueMsg(err.response?.data?.message || err.message || 'Failed to add venue');
    }
  };

  const handleEditVenueClick = (venue) => {
    setEditVenueId(venue.id);
    setEditVenueForm({ ...venue, newImages: [] });
    // Parse openingHours string values into { open, close } for each day
    const oh = {};
    daysOfWeek.forEach(day => {
      if (venue.openingHours && venue.openingHours[day]) {
        const [open, close] = venue.openingHours[day].split('-');
        oh[day] = { open, close };
      } else {
        oh[day] = { open: '', close: '' };
      }
    });
    setEditOpeningHoursForm(oh);
    setVenueMsg('');
  };

  const handleEditVenueChange = (e) => {
    setEditVenueForm({ ...editVenueForm, [e.target.name]: e.target.value });
  };

  const handleEditOpeningHoursChange = (day, field, value) => {
    setEditOpeningHoursForm({
      ...editOpeningHoursForm,
      [day]: { ...editOpeningHoursForm[day], [field]: value }
    });
  };

  const handleEditVenueSave = async (id) => {
    setVenueMsg('');
    try {
      // Create FormData for file upload
      const formData = new FormData();
      
      // Add basic venue data
      formData.append('name', editVenueForm.name);
      formData.append('sportType', editVenueForm.sportType);
      formData.append('address', editVenueForm.address);
      formData.append('city', editVenueForm.city);
      formData.append('phone', editVenueForm.phone);
      formData.append('basePrice', editVenueForm.basePrice);
      
      // Build openingHours object from edit form
      const openingHours = {};
      daysOfWeek.forEach(day => {
        if (editOpeningHoursForm[day].open && editOpeningHoursForm[day].close) {
          openingHours[day] = `${editOpeningHoursForm[day].open}-${editOpeningHoursForm[day].close}`;
        }
      });
      formData.append('openingHours', JSON.stringify(openingHours));
      
      // Add new images if any
      if (editVenueForm.newImages && editVenueForm.newImages.length > 0) {
        editVenueForm.newImages.forEach((image, index) => {
          formData.append('newImages', image);
        });
      }
      
      // Add current images that weren't removed
      if (editVenueForm.images && editVenueForm.images.length > 0) {
        formData.append('currentImages', JSON.stringify(editVenueForm.images));
      }
      
      await api.put(`/admin/venues/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setEditVenueId(null);
      setVenueMsg('Venue updated successfully!');
      fetchVenues();
    } catch (err) {
      setVenueMsg(err.response?.data?.message || err.message || 'Failed to update venue');
    }
  };

     const handleDeleteVenue = async (venue) => {
     setVenueMsg('');
     try {
       await api.delete(`/admin/venues/${venue.id}`);
       setVenueMsg('Venue deleted successfully!');
       fetchVenues();
     } catch (err) {
       setVenueMsg(err.response?.data?.message || err.message || 'Failed to delete venue');
     }
   };

   const handleViewVenueDetails = (venue) => {
     setSelectedVenue(venue);
     setShowVenueDetails(true);
   };

  // Staff functions
  const handleUpdateBookingStatus = async (bookingId, status) => {
    try {
      await api.put(`/admin/staff/bookings/${bookingId}/status`, { status });
      setActionMsg(`Booking status updated to ${status}`);
      fetchStaffSchedule();
    } catch (err) {
      setActionMsg(err.response?.data?.message || 'Failed to update booking status');
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      await api.delete(`/admin/staff/bookings/${bookingId}`);
      setActionMsg('Booking cancelled successfully');
      fetchStaffSchedule();
    } catch (err) {
      setActionMsg(err.response?.data?.message || 'Failed to cancel booking');
    }
  };

  const fetchStaffSchedule = async () => {
    try {
      const scheduleRes = await api.get('/admin/staff/schedule');
      setBookings(scheduleRes.data.data.bookings || []);
    } catch (err) {
      setBookings([]);
      setActionMsg('Failed to fetch staff schedule');
    }
  };

  const fetchStaffVenues = async () => {
    try {
      setStaffLoading(true);
      console.log('🔍 Frontend: Fetching staff venues for user:', user?.id);
      
      const venuesRes = await api.get('/admin/staff/my-venues');
      console.log('🔍 Frontend: Staff venues response:', venuesRes.data);
      
      setStaffVenues(venuesRes.data.data.venues || []);
    } catch (err) {
      console.error('❌ Frontend: Staff venues error:', err);
      setStaffVenues([]);
    } finally {
      setStaffLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);
      let url = '/admin/bookings';
      
      // If admin has selected a specific venue, filter by that venue
      if (user.role === 'admin' && selectedVenues.length > 0) {
        url = `/admin/venues/${selectedVenues[0]}/bookings`;
      }
      
      const res = await api.get(url);
      setBookings(res.data.data.bookings || []);
    } catch (err) {
      console.error('❌ Fetch bookings error:', err);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailability = async () => {
    if (!availabilityVenueId || !availabilityDate) return;
    setAvailabilityMsg('');
    try {
      console.log('🔍 Frontend: Fetching availability for:', { availabilityVenueId, availabilityDate });
      
      const availRes = await api.get(`/admin/staff/availability`, {
        params: { venueId: availabilityVenueId, date: availabilityDate }
      });

      console.log('🔍 Frontend: Availability response:', availRes.data);

      const venue = staffVenues.find(v => v.id === availabilityVenueId);
      const baseGrid = generateSlots(venue?.openingHours || {}, availabilityDate);

      const blockedSlots = availRes.data?.data?.blockedSlots || [];
      const bookedSlots = availRes.data?.data?.bookedSlots || [];
      
      console.log('🔍 Frontend: Processing slots:', { blockedSlots: blockedSlots.length, bookedSlots: bookedSlots.length });
      console.log('🔍 Frontend: Booked slots data:', bookedSlots);
      console.log('🔍 Frontend: Blocked slots data:', blockedSlots);
      
      // Normalize time format to HH:MM (remove seconds)
      const normalizeTime = (time) => time.substring(0, 5);
      
      const blockedSet = new Set(blockedSlots.filter(s => s.isBlocked).map(s => `${normalizeTime(s.startTime)}-${normalizeTime(s.endTime)}`));
      const bookedSet = new Set(bookedSlots.map(b => `${normalizeTime(b.startTime)}-${normalizeTime(b.endTime)}`));
      
      console.log('🔍 Frontend: Blocked set:', Array.from(blockedSet));
      console.log('🔍 Frontend: Booked set:', Array.from(bookedSet));

      const grid = baseGrid.map(s => {
        const key = `${s.startTime}-${s.endTime}`;
        return {
          ...s,
          booked: bookedSet.has(key),
          blocked: blockedSet.has(key)
        };
      });

      console.log('🔍 Frontend: Final grid:', grid.length, 'slots');
      setAvailabilitySlots(grid);
      setAvailabilityChanged(false);
    } catch (err) {
      console.error('❌ Frontend: Availability error:', err);
      setAvailabilitySlots([]);
      setAvailabilityMsg(err.response?.data?.message || 'Failed to fetch availability');
    }
  };

  const toggleBlockSlot = (index) => {
    setAvailabilitySlots(prev => prev.map((s, i) => i === index ? { ...s, blocked: !s.blocked } : s));
    setAvailabilityChanged(true);
  };

  const saveAvailability = async () => {
    setAvailabilityMsg('');
    if (!availabilityVenueId || !availabilityDate) {
      setAvailabilityMsg('Select a venue and date');
      return;
    }
    try {
      await api.post(`/admin/staff/availability/bulk`, {
        venueId: availabilityVenueId,
        date: availabilityDate,
        slots: availabilitySlots.map(s => ({ startTime: s.startTime, endTime: s.endTime, isBlocked: !!s.blocked }))
      });
      setAvailabilityMsg('Availability saved');
      setAvailabilityChanged(false);
      fetchAvailability();
    } catch (err) {
      setAvailabilityMsg(err.response?.data?.message || 'Failed to save availability');
    }
  };

  const cleanupExpiredBookings = async () => {
    try {
      const res = await api.post('/bookings/cleanup-expired', {});
      setAvailabilityMsg(`Cleaned up ${res.data.data.deletedCount} expired bookings`);
      // Refresh availability to show updated slots
      if (availabilityVenueId && availabilityDate) {
        fetchAvailability();
      }
    } catch (err) {
      setAvailabilityMsg(err.response?.data?.message || 'Failed to cleanup expired bookings');
    }
  };

  const handleVenueMapClick = (loc) => {
    setVenueLocation(loc);
    setVenueForm({ ...venueForm, latitude: loc.lat, longitude: loc.lng });
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const usersRes = await api.get('/admin/users');
      setUsers(usersRes.data.data.users || []);
    } catch (err) {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const staffRes = await api.get('/admin/staff');
      // Update users list with staff that have venue assignments
      const updatedUsers = users.map(user => {
        if (user.role === 'staff') {
          const staffData = staffRes.data.data.staff.find(s => s.id === user.id);
          return staffData || user;
        }
        return user;
      });
      setUsers(updatedUsers);
    } catch (err) {
      console.error('Failed to fetch staff with venues:', err);
    }
  };

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchUsers();
      fetchVenues();
    } else if (user && user.role === 'staff') {
      fetchStaffVenues();
      fetchStaffSchedule();
    }
  }, [user, token]);

  useEffect(() => {
    if (users.length > 0) {
      fetchStaff();
    }
  }, [users.length]);



  // Initialize Google Maps Autocomplete for venue address
  useEffect(() => {
    const initializeAutocomplete = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        const input = document.getElementById('venue-address');
        if (input) {
          console.log('🔍 Found venue-address input, initializing autocomplete');
          
          // Check if autocomplete is already initialized
          if (input.getAttribute('data-autocomplete-initialized')) {
            console.log('✅ Autocomplete already initialized');
            return;
          }
          
          const autocomplete = new window.google.maps.places.Autocomplete(input, {
            types: ['establishment', 'geocode']
          });
          
          autocomplete.addListener('place_changed', () => {
            console.log('🎯 Place selected from autocomplete!');
            const place = autocomplete.getPlace();
            console.log('📍 Place data:', place);
            
            if (place.geometry) {
              // Extract city from address components
              let city = '';
              let fullAddress = place.formatted_address;
              
              for (const component of place.address_components) {
                if (component.types.includes('locality')) {
                  city = component.long_name;
                }
              }
              
              setVenueForm(prev => ({
                ...prev,
                address: fullAddress,
                city: city || prev.city,
                latitude: place.geometry.location.lat(),
                longitude: place.geometry.location.lng()
              }));
              
              // Update venue location for the map
              setVenueLocation({
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng()
              });
              
              console.log('✅ Form updated with place data');
            }
          });
          
          // Mark as initialized
          input.setAttribute('data-autocomplete-initialized', 'true');
          console.log('✅ Autocomplete initialized successfully');
        } else {
          console.log('❌ venue-address input not found yet');
        }
      } else {
        console.log('❌ Google Maps not ready yet');
      }
    };

    // Wait for DOM to be ready
    const timer1 = setTimeout(initializeAutocomplete, 500);
    const timer2 = setTimeout(initializeAutocomplete, 1500);
    const timer3 = setTimeout(initializeAutocomplete, 3000);
    
    // If Google Maps isn't loaded yet, wait for it
    if (!window.google) {
      const checkGoogleMaps = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(checkGoogleMaps);
          console.log('🌍 Google Maps loaded, initializing autocomplete');
          initializeAutocomplete();
        }
      }, 200);
      
      // Cleanup after 15 seconds
      setTimeout(() => clearInterval(checkGoogleMaps), 15000);
    }
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Please log in to view your dashboard.</div>;
  }

  // Separate users by role
  const staffList = users.filter(u => u.role === 'staff');
  const normalUsers = users.filter(u => u.role === 'user');

  return (
    <div className="min-h-screen bg-gray-50 flex">
      

      {/* Main Content */}
      <div className="flex-1">
                 {/* Header */}
         <div className="bg-white shadow-sm border-b">
           <div className="px-6 py-4">
             <h1 className="text-2xl font-bold text-gray-900">
               {user.role === 'admin' ? 'Admin Dashboard' : 
                user.role === 'staff' ? 'Staff Dashboard' : 
                'Dashboard Overview'}
             </h1>
             <p className="text-gray-600 mt-1">Welcome back, {user.firstName}!</p>
           </div>
         </div>

              <div className="px-6 py-8">
        {/* Stats Cards */}
        {user.role === 'admin' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6 border-l-4 border-blue-500 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">{users.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6 border-l-4 border-green-500 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-xl">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-600">Total Venues</p>
                <p className="text-3xl font-bold text-gray-900">{venues.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6 border-l-4 border-purple-500 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                <p className="text-3xl font-bold text-gray-900">{bookings.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6 border-l-4 border-orange-500 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-600">Staff Members</p>
                <p className="text-3xl font-bold text-gray-900">{staffList.length}</p>
              </div>
            </div>
          </div>
        </div>
        )}

                 {/* Quick Actions - Only for Admin */}
         {user.role === 'admin' && (
           <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
             <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <button 
                 onClick={() => document.getElementById('create-staff-section')?.scrollIntoView({ behavior: 'smooth' })}
                 className="flex flex-col items-center p-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 cursor-pointer"
               >
                 <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                 </svg>
                 <span className="font-medium">Add Staff</span>
               </button>
               
               <button 
                 onClick={() => setActiveTab('venues')}
                 className="flex flex-col items-center p-4 bg-green-500 text-white rounded-lg hover:bg-green-600 cursor-pointer"
               >
                 <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                 </svg>
                 <span className="font-medium">Add Venue</span>
               </button>
             </div>
           </div>
         )}

                 {/* Section Divider - Only for Admin */}
         {user.role === 'admin' && (
           <div className="flex items-center my-8">
             <div className="flex-1 border-t border-gray-200"></div>
             <span className="px-4 text-sm font-medium text-gray-500 bg-gray-50">Management Panel</span>
             <div className="flex-1 border-t border-gray-200"></div>
           </div>
         )}

                 {/* Navigation Tabs */}
         {user.role === 'admin' && (
           <div className="bg-white rounded-lg shadow-sm border">
             <div className="border-b border-gray-200">
               <nav className="flex space-x-1 px-6">
                 <button 
                   onClick={() => setActiveTab('users')}
                   className={`px-6 py-4 text-sm font-medium transition-all duration-200 relative ${
                     activeTab === 'users' 
                       ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
                       : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                   }`}
                 >
                   Users & Staff
                   {activeTab === 'users' && (
                     <div className="absolute -bottom-px left-0 right-0 h-0.5 bg-blue-600"></div>
                   )}
                 </button>
                 <button 
                   onClick={() => setActiveTab('venues')}
                   className={`px-6 py-4 text-sm font-medium transition-all duration-200 relative ${
                     activeTab === 'venues' 
                       ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
                       : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                   }`}
                 >
                   Venues
                   {activeTab === 'venues' && (
                     <div className="absolute -bottom-px left-0 right-0 h-0.5 bg-blue-600"></div>
                   )}
                 </button>

               </nav>
             </div>

                         <div className="p-6">
               {/* Users & Staff Section */}
               {activeTab === 'users' && (
                 <div className="space-y-8">
                   {/* Create Staff Form */}
                   <div id="create-staff-section" className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Staff Member</h3>
                  <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleStaffSubmit}>
                    <input name="firstName" value={staffForm.firstName} onChange={handleStaffInput} placeholder="First Name" className="input" required />
                    <input name="lastName" value={staffForm.lastName} onChange={handleStaffInput} placeholder="Last Name" className="input" required />
                    <input name="email" type="email" value={staffForm.email} onChange={handleStaffInput} placeholder="Email" className="input" required />
                    <input name="phone" value={staffForm.phone} onChange={handleStaffInput} placeholder="Phone (+94...)" className="input" required />
                    <input name="password" type="password" value={staffForm.password} onChange={handleStaffInput} placeholder="Password" className="input" required />
                    <div className="col-span-1 md:col-span-2">
                      <div className="font-semibold mb-2 text-gray-700">Assign Venues</div>
                      <div className="flex flex-wrap gap-2">
                                                 {venues.map(v => (
                           <label key={v.id} className="flex items-center bg-white px-3 py-2 rounded-lg border">
                             <input
                               type="checkbox"
                               value={v.id}
                               checked={selectedVenues.includes(v.id)}
                               onChange={() => handleVenueSelection(v.id)}
                               className="mr-2"
                             />
                             {v.name} ({capitalizeSportType(v.sportType)})
                           </label>
                         ))}
                      </div>
                    </div>
                    <button type="submit" className="btn col-span-1 md:col-span-2">Create Staff Member</button>
                  </form>
                  {staffMsg && <div className="mt-4 text-center text-sm text-blue-600">{staffMsg}</div>}
                </div>

                {/* Staff List */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Staff Members</h3>
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700">Active Staff ({staffList.length})</h4>
                    </div>
                    {loading ? (
                      <div className="p-6 text-center text-gray-500">Loading staff...</div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {staffList.map(u => (
                          <div key={u.id} className="px-6 py-4 hover:bg-gray-50">
                            {editUserId === u.id ? (
                              // Edit Mode
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <input
                                    name="firstName"
                                    value={editForm.firstName}
                                    onChange={handleEditChange}
                                    className="input text-sm"
                                    placeholder="First Name"
                                  />
                                  <input
                                    name="lastName"
                                    value={editForm.lastName}
                                    onChange={handleEditChange}
                                    className="input text-sm"
                                    placeholder="Last Name"
                                  />
                                  <input
                                    name="email"
                                    value={editForm.email}
                                    onChange={handleEditChange}
                                    className="input text-sm"
                                    placeholder="Email"
                                  />
                                  <input
                                    name="phone"
                                    value={editForm.phone}
                                    onChange={handleEditChange}
                                    className="input text-sm"
                                    placeholder="Phone"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <button className="btn btn-sm" onClick={() => handleEditSave(u.id)}>Save</button>
                                  <button className="btn btn-sm btn-secondary" onClick={() => setEditUserId(null)}>Cancel</button>
                                </div>
                              </div>
                            ) : (
                              // View Mode
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                      <span className="text-blue-600 font-semibold">{u.firstName[0]}{u.lastName[0]}</span>
                                    </div>
                                    <div>
                                      <div className="font-medium text-gray-900">{u.firstName} {u.lastName}</div>
                                      <div className="text-sm text-gray-500">{u.email} • {u.phone}</div>
                                      {u.assignedVenues && u.assignedVenues.length > 0 && (
                                        <div className="text-xs text-gray-400 mt-1">
                                          Venues: {u.assignedVenues.map(v => v.name).join(', ')}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-1 text-xs rounded-full ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {u.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                  <button className="btn btn-sm" onClick={() => handleEditClick(u)}>Edit</button>
                                  <button className="btn btn-sm btn-primary" onClick={() => handleStaffAssignmentClick(u)}>Assign Venues</button>
                                  <button className="btn btn-sm btn-danger" onClick={() => deleteUser(u)}>Delete</button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        {staffList.length === 0 && (
                          <div className="p-6 text-center text-gray-500">No staff members found.</div>
                        )}
                      </div>
                    )}
                  </div>
                  {actionMsg && <div className="mt-4 text-center text-sm text-blue-600">{actionMsg}</div>}
                </div>

                {/* Normal Users List */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Regular Users</h3>
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700">All Users ({normalUsers.length})</h4>
                    </div>
                    {loading ? (
                      <div className="p-6 text-center text-gray-500">Loading users...</div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {normalUsers.map(u => (
                          <div key={u.id} className="px-6 py-4 hover:bg-gray-50">
                            {editUserId === u.id ? (
                              // Edit Mode
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <input
                                    name="firstName"
                                    value={editForm.firstName}
                                    onChange={handleEditChange}
                                    className="input text-sm"
                                    placeholder="First Name"
                                  />
                                  <input
                                    name="lastName"
                                    value={editForm.lastName}
                                    onChange={handleEditChange}
                                    className="input text-sm"
                                    placeholder="Last Name"
                                  />
                                  <input
                                    name="email"
                                    value={editForm.email}
                                    onChange={handleEditChange}
                                    className="input text-sm"
                                    placeholder="Email"
                                  />
                                  <input
                                    name="phone"
                                    value={editForm.phone}
                                    onChange={handleEditChange}
                                    className="input text-sm"
                                    placeholder="Phone"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <button className="btn btn-sm" onClick={() => handleEditSave(u.id)}>Save</button>
                                  <button className="btn btn-sm btn-secondary" onClick={() => setEditUserId(null)}>Cancel</button>
                                </div>
                              </div>
                            ) : (
                              // View Mode
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                      <span className="text-gray-600 font-semibold">{u.firstName[0]}{u.lastName[0]}</span>
                                    </div>
                                    <div>
                                      <div className="font-medium text-gray-900">{u.firstName} {u.lastName}</div>
                                      <div className="text-sm text-gray-500">{u.email} • {u.phone}</div>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-1 text-xs rounded-full ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {u.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                  <button className="btn btn-sm" onClick={() => handleEditClick(u)}>Edit</button>
                                  <button className="btn btn-sm btn-danger" onClick={() => deleteUser(u)}>Delete</button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        {normalUsers.length === 0 && (
                          <div className="p-6 text-center text-gray-500">No regular users found.</div>
                        )}
                      </div>
                    )}
                  </div>
                  {actionMsg && <div className="mt-4 text-center text-sm text-blue-600">{actionMsg}</div>}
                                   </div>
                 </div>
               )}
             </div>
           </div>
                  )}
         
         {/* Venues Tab Content */}
         {user.role === 'admin' && activeTab === 'venues' && (
           <div className="bg-white rounded-lg shadow-sm border p-6">
             <h2 className="text-xl font-bold mb-4 text-gray-900">Venue Management</h2>
                           <form className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleVenueSubmit}>
                <input name="name" value={venueForm.name} onChange={handleVenueInput} placeholder="Venue Name" className="input" required />
                <select name="sportType" value={venueForm.sportType} onChange={handleVenueInput} className="input" required>
                  <option value="">Select Sport Type</option>
                  {sportTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
                
                {/* Address field with Google Maps Autocomplete */}
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Venue Location
                  </label>
                  <input
                    type="text"
                    id="venue-address"
                    placeholder="Start typing venue address..."
                    className="input w-full"
                    onChange={(e) => setVenueForm(prev => ({ ...prev, address: e.target.value }))}
                    value={venueForm.address}
                    required
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Type to see address suggestions from Google Maps
                  </div>
                </div>
                
                <input name="city" value={venueForm.city} onChange={handleVenueInput} placeholder="City" className="input" required />
                <input name="phone" value={venueForm.phone || ''} onChange={handleVenueInput} placeholder="Phone (+94...)" className="input" required />
                <input name="latitude" value={venueForm.latitude} onChange={handleVenueInput} placeholder="Latitude" className="input" required readOnly />
                <input name="longitude" value={venueForm.longitude} onChange={handleVenueInput} placeholder="Longitude" className="input" required readOnly />
                <input name="basePrice" value={venueForm.basePrice} onChange={handleVenueInput} placeholder="Base Price" className="input" required />
                
                {/* Image Upload */}
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Venue Images
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleVenueImageChange}
                    className="input w-full"
                    placeholder="Select venue images..."
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    You can select multiple images. Supported formats: JPG, PNG, GIF
                  </div>
                  {/* Preview selected images */}
                  {venueForm.images && venueForm.images.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {venueForm.images.map((image, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(image)}
                            alt={`Preview ${index + 1}`}
                            className="w-20 h-20 object-cover rounded border"
                          />
                          <button
                            type="button"
                            onClick={() => removeVenueImage(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
               <div className="col-span-1 md:col-span-2">
                 <div className="font-semibold mb-2">Opening Hours</div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                   {daysOfWeek.map(day => (
                     <div key={day} className="flex items-center gap-2">
                       <span className="capitalize w-20">{day}:</span>
                       <input type="time" value={openingHoursForm[day].open} onChange={e => handleOpeningHoursChange(day, 'open', e.target.value)} className="input w-24" required={!!openingHoursForm[day].close} />
                       <span>-</span>
                       <input type="time" value={openingHoursForm[day].close} onChange={e => handleOpeningHoursChange(day, 'close', e.target.value)} className="input w-24" required={!!openingHoursForm[day].open} />
                     </div>
                   ))}
                 </div>
               </div>
               <button type="submit" className="btn col-span-1 md:col-span-2">Add Venue</button>
               
               
             </form>
             
             {/* Edit Venue Form */}
             {editVenueId && (
               <div className="mb-8 p-6 bg-gray-50 rounded-lg border">
                 <h3 className="text-lg font-semibold mb-4 text-gray-900">Edit Venue</h3>
                 <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={(e) => { e.preventDefault(); handleEditVenueSave(editVenueId); }}>
                   <input name="name" value={editVenueForm.name || ''} onChange={handleEditVenueChange} placeholder="Venue Name" className="input" required />
                   <select name="sportType" value={editVenueForm.sportType || ''} onChange={handleEditVenueChange} className="input" required>
                     <option value="">Select Sport Type</option>
                     {sportTypes.map(type => <option key={type} value={type}>{capitalizeSportType(type)}</option>)}
                   </select>
                   <input name="address" value={editVenueForm.address || ''} onChange={handleEditVenueChange} placeholder="Address" className="input" required />
                   <input name="city" value={editVenueForm.city || ''} onChange={handleEditVenueChange} placeholder="City" className="input" required />
                   <input name="phone" value={editVenueForm.phone || ''} onChange={handleEditVenueChange} placeholder="Phone" className="input" required />
                   <input name="basePrice" value={editVenueForm.basePrice || ''} onChange={handleEditVenueChange} placeholder="Base Price" className="input" required />
                   
                   {/* Image Management */}
                   <div className="col-span-1 md:col-span-2">
                     <div className="font-semibold mb-2">Venue Images</div>
                     
                     {/* Current Images */}
                     {editVenueForm.images && editVenueForm.images.length > 0 && (
                       <div className="mb-4">
                         <p className="text-sm text-gray-600 mb-2">Current Images:</p>
                         <div className="flex flex-wrap gap-2">
                           {editVenueForm.images.map((image, index) => (
                             <div key={index} className="relative">
                               <img
                                 src={image}
                                 alt={`Current ${index + 1}`}
                                 className="w-20 h-20 object-cover rounded border"
                               />
                               <button
                                 type="button"
                                 onClick={() => removeEditVenueImage(index)}
                                 className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                               >
                                 ×
                               </button>
                             </div>
                           ))}
                         </div>
                       </div>
                     )}
                     
                     {/* Add New Images */}
                     <div className="mb-4">
                       <label className="block text-sm font-medium text-gray-700 mb-2">
                         Add New Images
                       </label>
                       <input
                         type="file"
                         multiple
                         accept="image/*"
                         onChange={handleEditVenueImageChange}
                         className="input w-full"
                         placeholder="Select additional venue images..."
                       />
                       <div className="text-xs text-gray-500 mt-1">
                         You can select multiple images. Supported formats: JPG, PNG, GIF
                       </div>
                     </div>
                     
                     {/* Preview New Images */}
                     {editVenueForm.newImages && editVenueForm.newImages.length > 0 && (
                       <div className="mb-4">
                         <p className="text-sm text-gray-600 mb-2">New Images to Add:</p>
                         <div className="flex flex-wrap gap-2">
                           {editVenueForm.newImages.map((image, index) => (
                             <div key={index} className="relative">
                               <img
                                 src={URL.createObjectURL(image)}
                                 alt={`New ${index + 1}`}
                                 className="w-20 h-20 object-cover rounded border"
                               />
                               <button
                                 type="button"
                                 onClick={() => removeEditVenueNewImage(index)}
                                 className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                               >
                                 ×
                               </button>
                             </div>
                           ))}
                         </div>
                       </div>
                     )}
                   </div>
                   
                   <div className="col-span-1 md:col-span-2">
                     <div className="font-semibold mb-2">Opening Hours</div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                       {daysOfWeek.map(day => (
                         <div key={day} className="flex items-center gap-2">
                           <span className="capitalize w-20">{day}:</span>
                           <input type="time" value={editOpeningHoursForm[day]?.open || ''} onChange={e => handleEditOpeningHoursChange(day, 'open', e.target.value)} className="input w-24" />
                           <span>-</span>
                           <input type="time" value={editOpeningHoursForm[day]?.close || ''} onChange={e => handleEditOpeningHoursChange(day, 'close', e.target.value)} className="input w-24" />
                         </div>
                       ))}
                     </div>
                   </div>
                   
                   <div className="col-span-1 md:col-span-2 flex gap-2">
                     <button type="submit" className="btn">Save Changes</button>
                     <button type="button" onClick={() => setEditVenueId(null)} className="btn btn-secondary">Cancel</button>
                   </div>
                 </form>
               </div>
             )}
             
             <div className="mb-8">
               <VenueMap pickMode selectedLocation={venueLocation} onMapClick={handleVenueMapClick} />
               <div className="text-sm text-gray-500 mt-2">Click on the map to set the venue location.</div>
             </div>
             {venueMsg && <div className="mb-4 text-center text-sm text-blue-600">{venueMsg}</div>}
             
             {/* Venues List */}
             {loading ? <p>Loading venues...</p> : (
               <div className="space-y-4">
                 <h3 className="text-lg font-semibold text-gray-900">Existing Venues</h3>
                 <div className="space-y-4">
                   {venues.map(v => (
                     <div key={v.id} className="bg-white rounded-lg border p-4">
                                               <div className="flex gap-4">
                          {/* Venue Image */}
                         <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                           {v.images && v.images.length > 0 ? (
                             <img 
                               src={v.images[0]} 
                               alt={v.name}
                               className="w-full h-full object-cover"
                             />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center text-gray-400">
                               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                               </svg>
                             </div>
                           )}
                         </div>
                         
                          {/* Venue Details */}
                         <div className="flex-1">
                           <div className="flex items-center justify-between mb-2">
                             <h3 className="text-lg font-semibold text-gray-900">{v.name}</h3>
                             <span className={`px-2 py-1 text-xs rounded-full ${v.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                               {v.isActive ? 'Active' : 'Inactive'}
                             </span>
                           </div>
                                                       <p className="text-gray-600 mb-1">{capitalizeSportType(v.sportType)} • {v.city}</p>
                           <p className="text-gray-500 text-sm mb-2">{v.address}</p>
                           <p className="text-green-600 font-medium">Rs. {v.basePrice} LKR</p>
                           
                         </div>
                         
                         {/* Action Buttons */}
                         <div className="flex flex-col gap-2">
                           <button className="btn btn-xs" onClick={() => handleViewVenueDetails(v)}>View Details</button>
                           <button className="btn btn-xs" onClick={() => handleEditVenueClick(v)}>Edit</button>
                           <button className="btn btn-xs btn-danger" onClick={() => {
                             if (window.confirm(`Are you sure you want to delete "${v.name}"? This action cannot be undone.`)) {
                               handleDeleteVenue(v);
                             }
                           }}>Delete</button>
                         </div>
                       </div>
                     </div>
                   ))}
                   {venues.length === 0 && <p className="text-gray-500 text-center py-4">No venues found.</p>}
                 </div>
               </div>
             )}
           </div>
         )}
         
         {/* Admin Bookings Tab Content */}

         
         
          {user.role === 'staff' && (
            <>
              <h2 className="text-xl font-bold mb-4">My Assigned Venues</h2>
              {staffLoading ? <p>Loading venues...</p> : (
                <div className="mb-8">
                  {staffVenues.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {staffVenues.map(venue => (
                        <div key={venue.id} className="card p-4">
                          <h3 className="font-semibold text-lg">{venue.name}</h3>
                          <p className="text-gray-600">{venue.sportType}</p>
                          <p className="text-sm text-gray-500">{venue.address}, {venue.city}</p>
                          <p className="text-sm font-medium">Base Price: {venue.basePrice} LKR</p>
                          <div className="mt-2">
                            <span className={`px-2 py-1 text-xs rounded ${venue.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {venue.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No venues assigned to you yet.</p>
                  )}
                </div>
              )}

              <h2 className="text-xl font-bold mb-4">My Schedule</h2>
              

              
              {loading ? <p>Loading schedule...</p> : (
                <div>
                  {bookings.length > 0 ? (
                    <ul className="divide-y divide-gray-200">
                      {bookings.map(b => (
                        <li key={b.id} className="py-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-semibold">
                                {b.bookingDate} {b.startTime}-{b.endTime}
                              </div>
                              <div className="text-sm text-gray-600">
                                Venue: {b.Venue?.name || 'Unknown'} ({b.Venue?.sportType || 'Unknown'})
                              </div>
                              <div className="text-sm text-gray-600">
                                User: {b.User?.firstName} {b.User?.lastName} ({b.User?.phone || 'No phone'})
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <span className={`px-2 py-1 text-xs rounded ${
                                b.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                b.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {b.status === 'pending' ? 'awaiting payment' : b.status}
                              </span>
                              {b.status === 'pending' && (
                                <>
                                  <button 
                                    className="btn btn-xs btn-danger"
                                    onClick={() => handleCancelBooking(b.id)}
                                  >
                                    Cancel
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500">No bookings found for your assigned venues.</p>
                  )}
                </div>
              )}

              <h2 className="text-xl font-bold mt-10 mb-4">Manage Availability</h2>
              <div className="card p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <select className="input" value={availabilityVenueId} onChange={e => setAvailabilityVenueId(e.target.value)}>
                    <option value="">Select Venue</option>
                    {staffVenues.map(v => (
                      <option key={v.id} value={v.id}>{v.name} - {v.city}</option>
                    ))}
                  </select>
                  <input type="date" className="input" value={availabilityDate} onChange={e => setAvailabilityDate(e.target.value)} />
                  <button className="btn" onClick={fetchAvailability}>Load</button>
                </div>

                <div className="mb-2 text-sm text-gray-600">Click slots to toggle unavailable. Booked slots are red and cannot be changed.</div>
                <div className="mb-2 text-sm text-gray-500">💡 Use "Cleanup Expired" to remove abandoned OTP bookings that block slots.</div>
                
                {/* Color Legend */}
                <div className="flex items-center gap-3 mb-3 text-xs text-gray-700">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 rounded bg-white border border-primary-600"></span>
                    Available
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 rounded bg-gray-200 border border-gray-300"></span>
                    Unavailable (Staff Blocked)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 rounded bg-red-500 border border-red-600"></span>
                    Booked (Cannot Change)
                  </span>
                </div>

                {/* Slot Grid */}
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2 max-w-2xl mb-4">
                  {availabilitySlots.map((slot, idx) => (
                    <button
                      key={`${slot.startTime}-${slot.endTime}`}
                      type="button"
                      className={`rounded-full w-20 h-12 flex items-center justify-center border text-sm font-medium transition-all duration-150
                        ${slot.booked ? 'bg-red-500 text-white border-red-600 cursor-not-allowed' :
                          slot.blocked ? 'bg-gray-200 text-gray-600 border-gray-300' :
                          'bg-white text-primary-600 border-primary-600 hover:bg-primary-100'}
                      `}
                      disabled={slot.booked || !availabilityVenueId || !availabilityDate}
                      onClick={() => toggleBlockSlot(idx)}
                      title={`${slot.startTime} - ${slot.endTime}${slot.booked ? ' (Booked)' : slot.blocked ? ' (Unavailable)' : ' (Available)'}`}
                    >
                      {slot.startTime}
                    </button>
                  ))}
                  {availabilitySlots.length === 0 && (
                    <div className="text-sm text-gray-500 col-span-full">Load a venue and date to manage slots.</div>
                  )}
                </div>
                <div className="mt-3">
                  <button className="btn" onClick={saveAvailability} disabled={!availabilityVenueId || !availabilityDate || !availabilityChanged}>Save Availability</button>
                  {availabilityChanged && <span className="ml-2 text-sm text-orange-600">You have unsaved changes</span>}
                  <button className="btn btn-secondary ml-2" onClick={cleanupExpiredBookings}>Cleanup Expired</button>
                </div>
                {availabilityMsg && <div className="text-sm text-blue-600 mt-2">{availabilityMsg}</div>}
              </div>
            </>
          )}
          {user.role === 'user' && (
            <div className="text-center text-gray-600">Welcome to your dashboard! Use the navigation to explore bookings and venues.</div>
          )}
                 </div>
       </div>
       
       {/* Venue Details Modal */}
       {showVenueDetails && selectedVenue && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
             <div className="p-6">
               <div className="flex justify-between items-center mb-6">
                 <h2 className="text-2xl font-bold text-gray-900">{selectedVenue.name}</h2>
                 <button 
                   onClick={() => setShowVenueDetails(false)}
                   className="text-gray-400 hover:text-gray-600"
                 >
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                   </svg>
                 </button>
               </div>
               
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {/* Left Column - Image and Details */}
                                   <div>
                    {/* Venue Details */}
                   <div className="space-y-4">
                     <div className="flex items-center gap-2">
                                               <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full">
                          {capitalizeSportType(selectedVenue.sportType)}
                        </span>
                       <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                         selectedVenue.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                       }`}>
                         {selectedVenue.isActive ? 'Active' : 'Inactive'}
                       </span>
                     </div>
                     
                     <div>
                       <h3 className="text-lg font-semibold text-gray-900 mb-2">Location</h3>
                       <p className="text-gray-700">{selectedVenue.address}</p>
                       <p className="text-gray-600 font-medium">{selectedVenue.city}</p>
                     </div>
                     
                     <div>
                       <h3 className="text-lg font-semibold text-gray-900 mb-2">Contact</h3>
                       <p className="text-gray-700">{selectedVenue.phone}</p>
                     </div>
                     
                     <div>
                       <h3 className="text-lg font-semibold text-gray-900 mb-2">Price</h3>
                       <p className="text-2xl font-bold text-green-600">Rs. {selectedVenue.basePrice} LKR</p>
                     </div>
                     
                     
                   </div>
                 </div>
                 
                 {/* Right Column - Map and Opening Hours */}
                 <div>
                   {/* Map */}
                   <div className="mb-6">
                     <h3 className="text-lg font-semibold text-gray-900 mb-2">Location Map</h3>
                     <div className="h-64 bg-gray-200 rounded-lg overflow-hidden">
                       <VenueMap 
                         selectedLocation={{
                           lat: parseFloat(selectedVenue.latitude),
                           lng: parseFloat(selectedVenue.longitude)
                         }}
                       />
                     </div>
                   </div>
                   
                   {/* Opening Hours */}
                   <div>
                     <h3 className="text-lg font-semibold text-gray-900 mb-2">Opening Hours</h3>
                     <div className="space-y-2">
                       {Object.entries(selectedVenue.openingHours || {}).map(([day, hours]) => (
                         <div key={day} className="flex justify-between items-center py-2 border-b border-gray-100">
                           <span className="capitalize font-medium text-gray-700">{day}</span>
                           <span className="text-gray-600">{hours}</span>
                         </div>
                       ))}
                     </div>
                   </div>
                 </div>
               </div>
        </div>
      </div>
         </div>
       )}

       {/* Staff Venue Assignment Modal */}
       {showStaffAssignment && selectedStaffForAssignment && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
             <div className="p-6">
               <div className="flex justify-between items-center mb-6">
                 <h2 className="text-2xl font-bold text-gray-900">
                   Assign Venues to {selectedStaffForAssignment.firstName} {selectedStaffForAssignment.lastName}
                 </h2>
                 <button 
                   onClick={() => setShowStaffAssignment(false)}
                   className="text-gray-400 hover:text-gray-600"
                 >
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                   </svg>
                 </button>
               </div>

               <form onSubmit={handleStaffAssignmentSubmit}>
                 <div className="mb-6">
                   <h3 className="text-lg font-semibold text-gray-900 mb-3">Select Venues</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                     {venues.map(venue => (
                       <label key={venue.id} className="flex items-center p-3 border rounded-lg hover:bg-gray-50">
                         <input
                           type="checkbox"
                           name="venueIds"
                           value={venue.id}
                           checked={staffAssignmentForm.venueIds.includes(venue.id)}
                           onChange={handleStaffAssignmentChange}
                           className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                         />
                         <div>
                           <div className="font-medium text-gray-900">{venue.name}</div>
                           <div className="text-sm text-gray-600">
                             {capitalizeSportType(venue.sportType)} • {venue.city}
                           </div>
                         </div>
                       </label>
                     ))}
                   </div>
                 </div>

                 {staffAssignmentMsg && (
                   <div className={`mb-4 p-3 rounded-lg text-sm ${
                     staffAssignmentMsg.includes('successfully') 
                       ? 'bg-green-100 text-green-800' 
                       : 'bg-red-100 text-red-800'
                   }`}>
                     {staffAssignmentMsg}
                   </div>
                 )}

                 <div className="flex gap-3">
                   <button 
                     type="submit" 
                     className="btn btn-primary flex-1"
                   >
                     Update Assignments
                   </button>
                   <button 
                     type="button" 
                     onClick={() => setShowStaffAssignment(false)}
                     className="btn btn-secondary flex-1"
                   >
                     Cancel
                   </button>
                 </div>
               </form>
             </div>
           </div>
         </div>
       )}
    </div>
  );
};

export default Dashboard; 