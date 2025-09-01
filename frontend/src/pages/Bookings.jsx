import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/authService';

const Bookings = () => {
  const [bookings, setBookings] = useState([]);
  const [venues, setVenues] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        setError('');
        
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }
        
        const response = await api.get('/auth/me');
        
        if (response.data && response.data.user) {
          setUser(response.data.user);
        } else if (response.data && response.data.data && response.data.data.user) {
          setUser(response.data.data.user);
        } else {
          setError('Invalid user data received from server');
          setLoading(false);
        }
      } catch (err) {
        setError('Failed to load user data');
        setLoading(false);
        navigate('/login');
      }
    };

    fetchUser();
  }, [navigate]);

  useEffect(() => {
    if (user && user.id) {
      fetchBookings();
      if (user.role === 'admin') {
        fetchVenues();
      }
    }
  }, [user?.id]);

  // Refetch bookings when venue filter changes for admin
  useEffect(() => {
    if (user?.role === 'admin' && selectedVenue) {
      setLoading(true);
      fetchBookings();
    }
  }, [selectedVenue, user?.role]);

  const fetchVenues = async () => {
    try {
      const response = await api.get('/admin/venues');
      setVenues(response.data.data.venues || []);
    } catch (err) {
      console.error('Failed to fetch venues:', err);
    }
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(''); // Clear any previous errors
      let endpoint = '/bookings';
      
      if (user?.role === 'admin') {
        if (selectedVenue) {
          endpoint = `/admin/venues/${selectedVenue}/bookings`;
        } else {
          endpoint = '/admin/bookings';
        }
      } else if (user?.role === 'staff') {
        endpoint = '/admin/staff/schedule';
      } else {
        // Regular users - get their own bookings
        endpoint = '/bookings/my-bookings';
      }
      
      console.log('🔍 User role detected:', user?.role);
      console.log('🔍 Calling endpoint:', endpoint, 'for user role:', user?.role);
      const response = await api.get(endpoint);
      console.log('🔍 Response received:', response.data);
      
      // Handle different response structures
      let bookingsData = [];
      if (response.data && response.data.data) {
        if (response.data.data.bookings) {
          bookingsData = response.data.data.bookings;
        } else if (response.data.data.schedule) {
          bookingsData = response.data.data.schedule;
        } else {
          bookingsData = response.data.data;
        }
      } else if (response.data) {
        bookingsData = response.data;
      }
      console.log('🔍 Processed bookings data:', bookingsData);
      setBookings(Array.isArray(bookingsData) ? bookingsData : []);
      
    } catch (err) {
      console.error('❌ Failed to fetch bookings:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch bookings');
      setBookings([]); // Reset bookings on error
      

    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    try {
      await api.delete(`/bookings/${bookingId}`);
      setSuccessMsg('Booking cancelled successfully');
      fetchBookings();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel booking');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    return timeString;
  };

  const formatCurrency = (amount) => {
    return `Rs. ${parseFloat(amount).toFixed(2)}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'text-green-800 bg-green-100 border-green-200';
      case 'pending':
        return 'text-yellow-800 bg-yellow-100 border-yellow-200';
      case 'cancelled':
        return 'text-red-800 bg-red-100 border-red-200';
      case 'completed':
        return 'text-blue-800 bg-blue-100 border-blue-200';
      default:
        return 'text-gray-800 bg-gray-100 border-gray-200';
    }
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading user data...</p>
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">{error}</p>
                <button 
                  onClick={() => window.location.reload()} 
                  className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Reload Page
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show error state if user data is invalid
  if (error && !user) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-lg mb-4">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Debug logging
  console.log('🔍 Bookings component state:', { 
    user: user?.role, 
    loading, 
    bookingsCount: bookings.length, 
    selectedVenue,
    error 
  });

  // Manual user fetch function
  const manualFetchUser = async () => {
    try {
      console.log('🔍 Manual user fetch...');
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No token found');
        setLoading(false);
        return;
      }
      
      const response = await api.get('/auth/me');
      console.log('🔍 Manual fetch response:', response.data);
      
      if (response.data && response.data.user) {
        setUser(response.data.user);
      } else if (response.data && response.data.data && response.data.data.user) {
        setUser(response.data.data.user);
      } else {
        setError('Invalid user data structure');
      }
    } catch (err) {
      console.error('❌ Manual user fetch failed:', err);
      setError(err.message || 'Failed to fetch user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {user?.role === 'admin' ? 'All Bookings' : user?.role === 'staff' ? 'My Venue Bookings' : 'My Bookings'}
              </h1>
              <p className="text-gray-600">
                {user?.role === 'admin' ? 'Manage all venue bookings across the system.' : user?.role === 'staff' ? 'View and manage bookings for your assigned venues.' : 'View and manage your personal bookings.'}
              </p>
            </div>
            <div className="flex space-x-2">
              <button 
                onClick={() => {
                  setLoading(true);
                  fetchBookings();
                }}
                className="btn btn-sm"
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        {/* Admin Venue Filter and Summary */}
        {user?.role === 'admin' && (
          <div className="mb-6 space-y-4">
            {/* Venue Filter */}
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <label className="text-sm font-medium text-gray-700">Filter by Venue:</label>
                  <select 
                    className="input w-64"
                    value={selectedVenue} 
                    onChange={(e) => setSelectedVenue(e.target.value)}
                  >
                    <option value="">All Venues</option>
                    {venues.map(venue => (
                      <option key={venue.id} value={venue.id}>
                        {venue.name} - {venue.city}
                      </option>
                    ))}
                  </select>
                </div>
                <button 
                  onClick={fetchBookings}
                  className="btn btn-sm"
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
            </div>

            {/* Bookings Summary */}
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-lg font-semibold text-blue-900">
                    Total Bookings: {bookings.length}
                  </span>
                  {selectedVenue && (
                    <span className="ml-2 text-sm text-blue-700">
                      (Filtered by venue)
                    </span>
                  )}
                </div>
                <div className="text-sm text-blue-600">
                  {loading ? 'Loading...' : 'Last updated: ' + new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Staff Bookings Summary */}
        {user?.role === 'staff' && (
          <div className="mb-6">
            <div className="bg-green-50 rounded-lg border border-green-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-lg font-semibold text-green-900">
                    Total Bookings: {bookings.length}
                  </span>
                  <span className="ml-2 text-sm text-green-700">
                    (For your assigned venues)
                  </span>
                </div>
                <div className="text-sm text-green-600">
                  {loading ? 'Loading...' : 'Last updated: ' + new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {successMsg && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
            <p className="text-green-800">{successMsg}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading bookings...</p>
            {user?.role === 'admin' && selectedVenue && (
              <p className="text-sm text-gray-500 mt-2">Filtering by venue...</p>
            )}
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
            <p className="text-gray-600 mb-6">{user?.role === 'admin' ? 'Try a different venue.' : user?.role === 'staff' ? 'No bookings for your venues yet.' : "You haven't made any bookings yet."}</p>
            {user?.role !== 'admin' && (
              <a
                href="/venues"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Browse Venues
              </a>
            )}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {bookings.map((booking) => (
              <div key={booking.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{booking.venue?.name || booking.Venue?.name || 'Venue'}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(booking.status)}`}>
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {formatDate(booking.bookingDate)}
                    </div>
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                    </div>
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0z" />
                      </svg>
                      {booking.players} player{booking.players > 1 ? 's' : ''}
                    </div>
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      {formatCurrency(booking.amount)}
                    </div>
                  </div>
                  {booking.specialRequests && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Special Requests:</span> {booking.specialRequests}
                      </p>
                    </div>
                  )}
                  <div className="mt-6 flex space-x-2">
                    <button
                      className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50"
                      onClick={() => window.open(`/venues/${booking.venueId}`, '_blank')}
                    >
                      View Venue
                    </button>
                    {user?.role === 'user' && booking.status === 'confirmed' && (
                      <button
                        className="flex-1 px-3 py-2 text-sm font-medium text-red-600 border border-red-600 rounded-md hover:bg-red-50"
                        onClick={() => handleCancelBooking(booking.id)}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
        )}
      </div>
    </div>
  );
};

export default Bookings; 