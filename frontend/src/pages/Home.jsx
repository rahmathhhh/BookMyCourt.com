import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import VenueMap from '../components/UI/VenueMap';

const Home = () => {
  const { user, isAuthenticated } = useAuth();
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLocation, setSearchLocation] = useState('');
  const [searchSport, setSearchSport] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchVenues();
    // Auto-request location on page load
    requestLocationPermission();
  }, []);

  const requestLocationPermission = () => {
    if (!navigator.geolocation) {
      return; // Silently fail if geolocation not supported
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setSearchLocation('Current Location');
      },
      (error) => {
        // Silently handle errors - don't show alerts on page load
        console.log('Location access denied or unavailable');
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  const fetchVenues = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/venues');
      const data = await response.json();
      if (data.success && data.data && data.data.venues) {
        setVenues(data.data.venues.slice(0, 4)); // Show only 4 featured venues
      }
    } catch (error) {
      console.error('Error fetching venues:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // Navigate to venues page with search parameters using React Router
    const searchParams = new URLSearchParams();
    if (searchLocation) searchParams.append('location', searchLocation);
    if (searchSport) searchParams.append('sport', searchSport);
    
    // If we have user location coordinates, pass them
    if (userLocation) {
      searchParams.append('lat', userLocation.lat);
      searchParams.append('lng', userLocation.lng);
      searchParams.append('radius', '10'); // 10km radius
    }
    
    navigate(`/venues?${searchParams.toString()}`);
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Hero Section with Search */}
      <div className="relative bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Book Your Perfect Court
              </h1>
            <p className="text-xl md:text-2xl mb-12 text-blue-100">
              Find and book sports venues near you in minutes
            </p>
            
            {/* Large Search Bar */}
            <div className="max-w-4xl mx-auto">
              <form onSubmit={handleSearch} className="bg-white rounded-2xl shadow-2xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      placeholder="Enter city or we'll use your location"
                      value={searchLocation}
                      onChange={(e) => setSearchLocation(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                    {userLocation && (
                      <p className="text-xs text-green-600 mt-1">
                        📍 Using your location: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sport Type
                    </label>
                    <select
                      value={searchSport}
                      onChange={(e) => setSearchSport(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    >
                      <option value="">All Sports</option>
                      <option value="tennis">Tennis</option>
                      <option value="badminton">Badminton</option>
                      <option value="cricket">Cricket</option>
                      <option value="football">Football</option>
                      <option value="basketball">Basketball</option>
                      <option value="swimming">Swimming</option>
                    </select>
                  </div>
                  
                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold py-3 px-8 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 transform hover:scale-105 shadow-lg"
                    >
                      Search Venues
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Venues Section */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Featured Venues
            </h2>
            <p className="text-xl text-gray-600">
              Discover the most popular sports venues in your area
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-50 rounded-xl shadow-lg overflow-hidden animate-pulse">
                  <div className="h-48 bg-gray-300"></div>
                  <div className="p-6">
                    <div className="h-4 bg-gray-300 rounded mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {venues.map((venue) => (
                <div key={venue.id} className="bg-gray-50 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                  <div className="h-48 bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center">
                    <span className="text-white text-2xl font-bold">{venue.name.charAt(0)}</span>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {venue.name}
                    </h3>
                    <p className="text-gray-600 mb-3">
                      {venue.sportType} • {venue.city}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-blue-600">
                        Rs. {venue.basePrice}
                      </span>
                <Link
                        to={`/venues/${venue.id}`}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-300"
                >
                        View Details
                </Link>
              </div>
                </div>
              </div>
              ))}
            </div>
          )}

          {/* View All Venues Button */}
          <div className="text-center mt-12">
            <Link
              to="/venues"
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              View All Venues
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          </div>
        </div>

      {/* Features Section */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose Book My Court?
            </h2>
            <p className="text-xl text-gray-600">
              Professional sports venue management with proven reliability
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Real-time Availability</h3>
              <p className="text-gray-600">Advanced booking system with instant slot confirmation and real-time updates</p>
            </div>

            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Verified Venues</h3>
              <p className="text-gray-600">Quality-assured facilities with comprehensive venue verification and maintenance standards</p>
            </div>

            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Secure Payments</h3>
              <p className="text-gray-600">Enterprise-grade payment processing with multiple payment methods and transaction security</p>
            </div>
                </div>
          </div>
        </div>

      {/* Sports We Offer Section */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Sports We Offer
            </h2>
            <p className="text-xl text-gray-600">
              From individual sports to team activities, we have venues for every passion
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {[
              { name: 'Tennis', icon: '🎾', color: 'from-green-400 to-green-600' },
              { name: 'Badminton', icon: '🏸', color: 'from-blue-400 to-blue-600' },
              { name: 'Cricket', icon: '🏏', color: 'from-yellow-400 to-yellow-600' },
              { name: 'Football', icon: '⚽', color: 'from-green-500 to-green-700' },
              { name: 'Basketball', icon: '🏀', color: 'from-orange-400 to-orange-600' },
              { name: 'Swimming', icon: '🏊', color: 'from-cyan-400 to-cyan-600' },
              { name: 'Volleyball', icon: '🏐', color: 'from-red-400 to-red-600' },
              { name: 'Table Tennis', icon: '🏓', color: 'from-purple-400 to-purple-600' },
              { name: 'Squash', icon: '🥎', color: 'from-indigo-400 to-indigo-600' },
              { name: 'Golf', icon: '⛳', color: 'from-emerald-400 to-emerald-600' },
              { name: 'Athletics', icon: '🏃', color: 'from-pink-400 to-pink-600' },
              { name: 'Gym', icon: '💪', color: 'from-gray-400 to-gray-600' }
            ].map((sport) => (
              <div key={sport.name} className="text-center group">
                <div className={`bg-gradient-to-br ${sport.color} rounded-2xl p-6 mb-4 transform group-hover:scale-105 transition-all duration-300 shadow-lg group-hover:shadow-xl`}>
                  <div className="text-4xl mb-2">{sport.icon}</div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{sport.name}</h3>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* About Our System Section */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                What is Book My Court?
          </h2>
              <p className="text-lg text-gray-600 mb-6">
                Book My Court is Sri Lanka's premier sports venue booking platform that connects sports enthusiasts 
                with premium facilities across the country. We're revolutionizing how people discover, book, and 
                enjoy sports venues.
              </p>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="bg-blue-100 rounded-full p-2 mr-4 mt-1">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Smart Booking System</h3>
                    <p className="text-gray-600">Book slots up to 4 hours in advance with real-time availability updates</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="bg-blue-100 rounded-full p-2 mr-4 mt-1">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Venue Management</h3>
                    <p className="text-gray-600">Comprehensive admin tools for venue owners and staff to manage bookings</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="bg-blue-100 rounded-full p-2 mr-4 mt-1">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Secure Payments</h3>
                    <p className="text-gray-600">Integrated PayHere payment gateway with instant booking confirmations</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl p-8 text-white text-center">
              <div className="text-6xl mb-4">🏟️</div>
              <h3 className="text-2xl font-bold mb-4">Join Thousands of Sports Enthusiasts</h3>
              <p className="text-blue-100 mb-6">
                Whether you're a professional athlete, weekend warrior, or just getting started, 
                we have the perfect venue for your next game.
              </p>
            <Link
              to="/venues"
                className="inline-block bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-200"
            >
                Explore Venues
            </Link>
          </div>
        </div>
        </div>
      </div>

      {/* Motivational Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Elevate Your Game
          </h2>
          <p className="text-xl mb-8 text-blue-100 max-w-3xl mx-auto">
            Whether you're a professional athlete or a weekend warrior, 
            our platform provides the infrastructure you need to focus on what matters most - your performance.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-300 mb-2">500+</div>
              <div className="text-blue-100">Premium Venues</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-300 mb-2">10,000+</div>
              <div className="text-blue-100">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-300 mb-2">99.9%</div>
              <div className="text-blue-100">Uptime</div>
            </div>
            </div>
          </div>
        </div>
    </div>
  );
};

export default Home; 