import { createContext, useContext, useReducer, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: true,
  error: null
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null
      };
    
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null
      };
    
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload
      };
    
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      };
    
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload
      };
    
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };
    
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (token) {
        try {
          dispatch({ type: 'AUTH_START' });
          const response = await authService.getCurrentUser();
          dispatch({
            type: 'AUTH_SUCCESS',
            payload: { user: response.data.user, token }
          });
        } catch (error) {
          localStorage.removeItem('token');
          dispatch({
            type: 'AUTH_FAILURE',
            payload: error.response?.data?.message || 'Authentication failed'
          });
        }
      } else {
        dispatch({ type: 'AUTH_FAILURE', payload: null });
      }
    };

    checkAuth();
  }, []);

  // Login function
  const login = async (credentials) => {
    try {
      dispatch({ type: 'AUTH_START' });
      const response = await authService.login(credentials);
      
      const { user, token } = response.data.data;
      localStorage.setItem('token', token);
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user, token }
      });
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      dispatch({
        type: 'AUTH_FAILURE',
        payload: message
      });
      return { success: false, error: message };
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      dispatch({ type: 'AUTH_START' });
      const response = await authService.register(userData);
      
      // Don't automatically log in - wait for OTP verification
      dispatch({ type: 'LOGOUT' });
      
      return { success: true, registrationData: userData };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      dispatch({
        type: 'AUTH_FAILURE',
        payload: message
      });
      return { success: false, error: message };
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    dispatch({ type: 'LOGOUT' });
  };

  // Update user profile
  const updateProfile = async (userData) => {
    try {
      const response = await authService.updateProfile(userData);
      dispatch({
        type: 'UPDATE_USER',
        payload: response.data.data.user
      });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Profile update failed';
      return { success: false, error: message };
    }
  };

  // Verify OTP
  const verifyOTP = async (otp, registrationData) => {
    try {
      const response = await authService.verifyOTP(otp, registrationData);
      const { user, token } = response.data.data;
      
      // Log in user after successful OTP verification
      localStorage.setItem('token', token);
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user, token }
      });
      
      return { success: true, user };
    } catch (error) {
      const message = error.response?.data?.message || 'OTP verification failed';
      return { success: false, error: message };
    }
  };

  // Resend OTP
  const resendOTP = async (userId) => {
    try {
      await authService.resendOTP(userId);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to resend OTP';
      return { success: false, error: message };
    }
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value = {
    ...state,
    login,
    register,
    logout,
    updateProfile,
    verifyOTP,
    resendOTP,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 