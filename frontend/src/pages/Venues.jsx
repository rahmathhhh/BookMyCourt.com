import React, { useEffect, useState } from 'react';
import VenueMap from '../components/UI/VenueMap';
import axios from 'axios';
import { Link, useSearchParams } from 'react-router-dom';

const Venues = () => {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get search parameters from homepage
  const [searchTerm, setSearchTerm] = useState(searchParams.get('location') || '');
  const [selectedSport, setSelectedSport] = useState(searchParams.get('sport') || '');
  const [selectedCity, setSelectedCity] = useState('');
  const [userLat, setUserLat] = useState(searchParams.get('lat') || null);
  const [userLng, setUserLng] = useState(searchParams.get('lng') || null);
  const [searchRadius, setSearchRadius] = useState(searchParams.get('radius') || '10');
  const [locationInput, setLocationInput] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    const fetchVenues = async () => {
      try {
        let url = '/api/venues';
        const params = new URLSearchParams();
        
        if (selectedSport) params.append('sportType', selectedSport);
        if (selectedCity) params.append('city', selectedCity);
        if (userLat && userLng) {
          params.append('lat', userLat);
          params.append('lng', userLng);
          params.append('radius', searchRadius);
        }
        
        if (params.toString()) {
          url += `?${params.toString()}`;
        }
        
        const res = await axios.get(url);
        setVenues(res.data.data.venues || []);
      } catch (err) {
        setVenues([]);
      } finally {
        setLoading(false);
      }
    };
    fetchVenues();
  }, [selectedSport, selectedCity, userLat, userLng, searchRadius]);

  // Filter venues based on search and filters
  const filteredVenues = venues.filter(venue => {
    const matchesSearch = !searchTerm || 
      venue.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      venue.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSport = !selectedSport || venue.sportType.toLowerCase() === selectedSport.toLowerCase();
    const matchesCity = !selectedCity || venue.city === selectedCity;
    
    return matchesSearch && matchesSport && matchesCity;
  });

  // Get unique sports and cities for filters
  const uniqueSports = [...new Set(venues.map(venue => venue.sportType))];
  const uniqueCities = [...new Set(venues.map(venue => venue.city))];

  // Update URL when filters change
  const updateFilters = (newSearchTerm, newSport, newCity) => {
    const params = new URLSearchParams();
    if (newSearchTerm) params.set('location', newSearchTerm);
    if (newSport) params.set('sport', newSport);
    if (newCity) params.set('city', newCity);
    setSearchParams(params);
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    updateFilters(value, selectedSport, selectedCity);
  };

  const handleSportChange = (value) => {
    setSelectedSport(value);
    updateFilters(searchTerm, value, selectedCity);
  };

  const handleCityChange = (value) => {
    setSelectedCity(value);
    updateFilters(searchTerm, selectedSport, value);
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedSport('');
    setSelectedCity('');
    setLocationInput('');
    setUserLat(null);
    setUserLng(null);
    setSearchRadius('10');
    setSearchParams({});
  };

  // Geolocation function
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    setLocationLoading(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        setUserLat(lat.toString());
        setUserLng(lng.toString());
        setLocationInput('Current Location');
        
        // Update URL params
        const params = new URLSearchParams();
        if (selectedSport) params.set('sport', selectedSport);
        if (selectedCity) params.set('city', selectedCity);
        params.set('lat', lat.toString());
        params.set('lng', lng.toString());
        params.set('radius', searchRadius);
        setSearchParams(params);
        
        setLocationLoading(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Unable to get your location. Please try again or enter a city manually.');
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  // Handle location input change
  const handleLocationInputChange = (value) => {
    setLocationInput(value);
    if (value.trim() === '') {
      // Clear location-based search
      setUserLat(null);
      setUserLng(null);
      setSearchRadius('10');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            {searchTerm || selectedSport || selectedCity || locationInput ? 'Search Results' : 'Available Sports Venues'}
          </h1>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            {searchTerm || selectedSport || selectedCity || locationInput 
              ? `Found ${filteredVenues.length} venues matching your criteria`
              : 'Browse through our curated selection of premium sports courts and facilities. Use the filters below to find exactly what you\'re looking for.'
            }
          </p>
          {userLat && userLng && (
            <div className="bg-blue-500/20 backdrop-blur-sm rounded-xl p-4 border border-blue-300/30">
              <div className="flex items-center justify-center gap-2 text-blue-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-medium">
                 Showing venues within {searchRadius}km of your location
                </span>
                <button
                  onClick={() => {
                    setUserLat(null);
                    setUserLng(null);
                    setSearchRadius('10');
                  }}
                  className="ml-2 px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors duration-200"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Filters Section */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <svg className="w-6 h-6 mr-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 7.707A1 1 0 013 7V3z" clipRule="evenodd" />
              </svg>
              Filter Venues
            </h3>
            
            {/* Search Results Summary */}
            {(searchTerm || selectedSport || selectedCity || locationInput) && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="text-blue-800">
                    <span className="font-semibold">Showing {filteredVenues.length} of {venues.length} venues</span>
                    {searchTerm && <span className="ml-2">• Search: "{searchTerm}"</span>}
                    {locationInput && <span className="ml-2">• Location: {locationInput}</span>}
                    {selectedSport && <span className="ml-2">• Sport: {selectedSport}</span>}
                    {selectedCity && <span className="ml-2">• City: {selectedCity}</span>}
                  </div>
                  <button
                    onClick={clearAllFilters}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium underline"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search Venues</label>
                <input
                  type="text"
                  placeholder="Search by name or city..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>

              {/* Location Input with Geolocation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter city or use my location"
                    value={locationInput}
                    onChange={(e) => handleLocationInputChange(e.target.value)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                  <button
                    onClick={getCurrentLocation}
                    disabled={locationLoading}
                    className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center min-w-[60px]"
                    title="Use My Location"
                  >
                    {locationLoading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Sport Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sport Type</label>
                <select
                  value={selectedSport}
                  onChange={(e) => handleSportChange(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                >
                  <option value="">All Sports</option>
                  {uniqueSports.map(sport => (
                    <option key={sport} value={sport}>{sport}</option>
                  ))}
                </select>
              </div>
              
              {/* City Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <select
                  value={selectedCity}
                  onChange={(e) => handleCityChange(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                >
                  <option value="">All Cities</option>
                  {uniqueCities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              {/* Radius Filter (only show when using location) */}
              {userLat && userLng && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search Radius</label>
                  <select
                    value={searchRadius}
                    onChange={(e) => setSearchRadius(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  >
                    <option value="5">5 km</option>
                    <option value="10">10 km</option>
                    <option value="20">20 km</option>
                    <option value="50">50 km</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Venues Grid */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <svg className="w-7 h-7 mr-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M19 10a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H10V6.25zm0 2.25h.008v.008H10v-.008zM10 12.75h.008v.008H10v-.008z" clipRule="evenodd" />
              </svg>
              Available Venues
            </h2>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
              <p className="text-xl text-gray-600">Discovering amazing venues...</p>
            </div>
          ) : filteredVenues.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-xl">
              <div className="w-20 h-20 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="60" cy="60" r="58" fill="#2563EB" opacity="0.1"/>
                  <rect x="25" y="35" width="70" height="50" rx="8" fill="#2563EB" opacity="0.3"/>
                  <line x1="60" y1="35" x2="60" y2="85" stroke="#2563EB" strokeWidth="2"/>
                  <circle cx="60" cy="60" r="12" fill="none" stroke="#2563EB" strokeWidth="2"/>
                  <line x1="25" y1="50" x2="25" y2="70" stroke="#2563EB" strokeWidth="3"/>
                  <line x1="95" y1="50" x2="95" y2="70" stroke="#2563EB" strokeWidth="3"/>
                  <circle cx="40" cy="25" r="6" fill="#F59E0B"/>
                  <path d="M34 25 Q40 20 46 25" stroke="#F59E0B" strokeWidth="2" fill="none"/>
                  <circle cx="80" cy="25" r="6" fill="#10B981"/>
                  <path d="M74 25 Q80 20 86 25" stroke="#10B981" strokeWidth="2" fill="none"/>
                  <path d="M74 25 Q80 30 86 25" stroke="#10B981" strokeWidth="2" fill="none"/>
                  <text x="60" y="105" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="bold" fill="#2563EB">BC</text>
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No venues found</h3>
              <p className="text-gray-600 mb-6">
                {venues.length === 0 
                  ? "We're working on adding more venues. Check back soon!"
                  : "Try adjusting your search or filters to find more venues."
                }
              </p>
              {venues.length > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all duration-200"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredVenues.map((venue) => (
                <div key={venue.id} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  {/* Venue Image */}
                  <div className="h-48 overflow-hidden">
                    {venue.images && venue.images.length > 0 ? (
                      <img 
                        src={venue.images[0]} 
                        alt={venue.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="bg-gradient-to-br from-blue-400 to-blue-600 h-full flex items-center justify-center">
                        <div className="text-center text-white">
                          <div className="w-16 h-16 mx-auto mb-3 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                            <svg className="w-10 h-10" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="60" cy="60" r="58" fill="#FFFFFF" opacity="0.9"/>
                              <rect x="25" y="35" width="70" height="50" rx="8" fill="#FFFFFF" opacity="0.8"/>
                              <line x1="60" y1="35" x2="60" y2="85" stroke="#2563EB" strokeWidth="2"/>
                              <circle cx="60" cy="60" r="12" fill="none" stroke="#2563EB" strokeWidth="2"/>
                              <line x1="25" y1="50" x2="25" y2="70" stroke="#2563EB" strokeWidth="3"/>
                              <line x1="95" y1="50" x2="95" y2="70" stroke="#2563EB" strokeWidth="3"/>
                              <circle cx="40" cy="25" r="6" fill="#F59E0B"/>
                              <path d="M34 25 Q40 20 46 25" stroke="#F59E0B" strokeWidth="2" fill="none"/>
                              <circle cx="80" cy="25" r="6" fill="#10B981"/>
                              <path d="M74 25 Q80 20 86 25" stroke="#10B981" strokeWidth="2" fill="none"/>
                              <path d="M74 25 Q80 30 86 25" stroke="#10B981" strokeWidth="2" fill="none"/>
                              <text x="60" y="105" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="bold" fill="#2563EB">BC</text>
                            </svg>
                          </div>
                          <p className="text-lg font-semibold">{venue.sportType} Court</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Venue Info */}
                  <div className="p-6">
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{venue.name}</h3>
                      <div className="flex items-center text-gray-600 mb-3">
                        <svg className="w-4 h-4 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        <span>{venue.city}</span>
                      </div>
                      <div className="flex items-center text-gray-600 mb-3">
                        <svg className="w-4 h-4 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" />
                        </svg>
                        <span>Open: {venue.openingHours?.monday || '08:00-22:00'}</span>
                      </div>
                      
                      {/* Facilities */}
                      {venue.facilities && (
                        <div className="flex items-center text-gray-600 mb-3">
                          <svg className="w-4 h-4 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <span className="text-sm">{venue.facilities}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Price */}
                    <div className="bg-blue-50 rounded-lg p-3 mb-4">
                      <div className="text-2xl font-bold text-blue-600">Rs. {venue.basePrice}</div>
                      <div className="text-blue-600 text-sm">per hour</div>
                    </div>
                    
                    {/* Action Button */}
                    <Link 
                      to={`/venues/${venue.id}`} 
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200 transform hover:scale-105 shadow-lg text-center block"
                    >
                      View Details & Book
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Venues; 