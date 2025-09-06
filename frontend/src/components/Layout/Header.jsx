import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Bars3Icon, 
  XMarkIcon, 
  UserCircleIcon,
  MapPinIcon,
  CalendarIcon,
  HomeIcon
} from '@heroicons/react/24/outline';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMenuOpen(false);
  };

  const navigation = [
    { name: 'Home', href: '/', icon: HomeIcon },
          { name: 'Venues', href: '/venues', icon: MapPinIcon },
      ...(isAuthenticated ? [
        { 
          name: user?.role === 'admin' ? 'All Bookings' : 
                user?.role === 'staff' ? 'Venue Bookings' : 
                'My Bookings', 
          href: '/bookings', 
          icon: CalendarIcon 
        },
        ...(user?.role === 'admin' || user?.role === 'staff' ? [
          { name: 'Dashboard', href: '/dashboard', icon: UserCircleIcon }
        ] : [])
      ] : [])
  ];

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="60" cy="60" r="58" fill="#FFFFFF" opacity="0.9"/>
                  <rect x="25" y="35" width="70" height="50" rx="8" fill="#2563EB" opacity="0.8"/>
                  <line x1="60" y1="35" x2="60" y2="85" stroke="#FFFFFF" strokeWidth="2"/>
                  <circle cx="60" cy="60" r="12" fill="none" stroke="#FFFFFF" strokeWidth="2"/>
                  <line x1="25" y1="50" x2="25" y2="70" stroke="#FFFFFF" strokeWidth="3"/>
                  <line x1="95" y1="50" x2="95" y2="70" stroke="#FFFFFF" strokeWidth="3"/>
                  <circle cx="40" cy="25" r="6" fill="#F59E0B"/>
                  <path d="M34 25 Q40 20 46 25" stroke="#F59E0B" strokeWidth="2" fill="none"/>
                  <circle cx="80" cy="25" r="6" fill="#10B981"/>
                  <path d="M74 25 Q80 20 86 25" stroke="#10B981" strokeWidth="2" fill="none"/>
                  <path d="M74 25 Q80 30 86 25" stroke="#10B981" strokeWidth="2" fill="none"/>
                  <text x="60" y="105" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="bold" fill="#2563EB">BC</text>
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">BookMyCourt.lk</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="text-gray-700 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors duration-200"
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* User Menu / Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <UserCircleIcon className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-700">
                    {user?.firstName} {user?.lastName}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="btn-outline text-sm"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login" className="btn-outline text-sm">
                  Login
                </Link>
                <Link to="/register" className="btn-primary text-sm">
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700 hover:text-primary-600 p-2"
            >
              {isMenuOpen ? (
                <XMarkIcon className="w-6 h-6" />
              ) : (
                <Bars3Icon className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="text-gray-700 hover:text-primary-600 block px-3 py-2 text-base font-medium transition-colors duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className="flex items-center space-x-2">
                    <item.icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </div>
                </Link>
              ))}
              
              {isAuthenticated ? (
                <div className="pt-4 border-t border-gray-200">
                  <div className="px-3 py-2 text-sm text-gray-500">
                    Welcome, {user?.firstName} {user?.lastName}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left text-gray-700 hover:text-primary-600 block px-3 py-2 text-base font-medium transition-colors duration-200"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="pt-4 border-t border-gray-200 space-y-2">
                  <Link
                    to="/login"
                    className="block w-full text-center btn-outline"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="block w-full text-center btn-primary"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header; 