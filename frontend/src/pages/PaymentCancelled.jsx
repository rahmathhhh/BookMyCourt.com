import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PaymentCancelled = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Extract payment details 
    const paymentId = searchParams.get('payment_id');
    const orderId = searchParams.get('order_id');
    const statusCode = searchParams.get('status_code');
    const amount = searchParams.get('payhere_amount');
    const currency = searchParams.get('payhere_currency');

    setPaymentDetails({
      paymentId,
      orderId,
      amount,
      currency,
      statusCode,
      status: 'Cancelled'
    });
    setLoading(false);
  }, [searchParams]);

  const handleTryAgain = () => {
    navigate('/venues');
  };

  const handleViewBookings = () => {
    navigate('/bookings');
  };

  const handleGoHome = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 via-white to-yellow-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Processing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 via-white to-yellow-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Cancelled Icon */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-yellow-600 to-yellow-700 rounded-2xl flex items-center justify-center mb-6">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Payment Cancelled</h2>
          <p className="text-gray-600">
            Your payment was cancelled. No charges have been made to your account.
          </p>
        </div>

        {/* Payment Details */}
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h3>
          <div className="space-y-3">
            {paymentDetails?.orderId && (
              <div className="flex justify-between">
                <span className="text-gray-600">Order ID:</span>
                <span className="font-medium text-gray-900">{paymentDetails.orderId}</span>
              </div>
            )}
            {paymentDetails?.amount && (
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-medium text-gray-900">
                  {paymentDetails.amount} {paymentDetails.currency}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className="font-medium text-yellow-600">✗ Cancelled</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <button
            onClick={handleTryAgain}
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-base font-semibold bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform hover:scale-105 transition-all duration-200"
          >
            Try Payment Again
          </button>
          <button
            onClick={handleViewBookings}
            className="w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-xl shadow-lg text-base font-semibold bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transform hover:scale-105 transition-all duration-200"
          >
            View My Bookings
          </button>
          <button
            onClick={handleGoHome}
            className="w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-xl shadow-lg text-base font-semibold bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transform hover:scale-105 transition-all duration-200"
          >
            Go to Homepage
          </button>
        </div>

        {/* Additional Info */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            Your booking slot has been released. You can try booking again or contact our support team if you need assistance.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancelled;
