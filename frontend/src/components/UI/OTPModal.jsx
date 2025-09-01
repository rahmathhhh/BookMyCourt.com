import { useState, useEffect } from 'react';

const OTPModal = ({ 
  isOpen, 
  onClose, 
  onVerify, 
  title = "Enter OTP", 
  message = "Please enter the OTP sent to your phone",
  loading = false,
  error = null,
  resendOTP = null,
  countdown = 0
}) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [inputRefs, setInputRefs] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setOtp(['', '', '', '', '', '']);
      // Focus first input
      if (inputRefs[0]) {
        inputRefs[0].focus();
      }
    }
  }, [isOpen, inputRefs]);

  const handleInputChange = (index, value) => {
    if (value.length > 1) return; // Prevent multiple characters
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Move to next input if value entered
    if (value && index < 5) {
      inputRefs[index + 1]?.focus();
    }

    // Auto-submit if all digits entered
    if (newOtp.every(digit => digit !== '') && index === 5) {
      handleVerify();
    }
  };

  const handleKeyDown = (index, e) => {
    // Move to previous input on backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs[index - 1]?.focus();
    }
  };

  const handleVerify = () => {
    const otpString = otp.join('');
    if (otpString.length === 6) {
      onVerify(otpString);
    }
  };

  const handleResend = () => {
    if (resendOTP && countdown === 0) {
      resendOTP();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-600 mb-6">{message}</p>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* OTP Input Fields */}
          <div className="flex justify-center space-x-2 mb-6">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={el => {
                  if (el) inputRefs[index] = el;
                }}
                type="text"
                maxLength="1"
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-12 text-center border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none text-lg font-semibold"
                disabled={loading}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleVerify}
              disabled={loading || otp.join('').length !== 6}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </div>

          {/* Resend OTP */}
          {resendOTP && (
            <div className="mt-4 text-center">
              <button
                onClick={handleResend}
                disabled={countdown > 0 || loading}
                className="text-primary-600 hover:text-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OTPModal; 