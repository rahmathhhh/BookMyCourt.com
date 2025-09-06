import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PaymentSuccess = () => {
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

    if (paymentId && statusCode === '2') { // Status code 2 = Success
      setPaymentDetails({
        paymentId,
        orderId,
        amount,
        currency,
        status: 'Success'
      });
    } else {
      setPaymentDetails({
        status: 'Failed',
        message: 'Payment was not successful'
      });
    }
    setLoading(false);
  }, [searchParams]);

  const handleViewBookings = () => {
    navigate('/bookings');
  };

  const handleGoHome = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-green-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Processing payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-green-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Success Icon */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-green-600 to-green-700 rounded-2xl flex items-center justify-center mb-6">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {paymentDetails?.status === 'Success' ? 'Payment Successful!' : 'Payment Failed'}
          </h2>
          <p className="text-gray-600">
            {paymentDetails?.status === 'Success' 
              ? 'Your court booking has been confirmed and payment processed successfully.'
              : 'There was an issue with your payment. Please try again.'
            }
          </p>
        </div>

        {/* Payment Details */}
        {paymentDetails?.status === 'Success' && (
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Payment ID:</span>
                <span className="font-medium text-gray-900">{paymentDetails.paymentId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Order ID:</span>
                <span className="font-medium text-gray-900">{paymentDetails.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-medium text-gray-900">
                  {paymentDetails.amount} {paymentDetails.currency}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="font-medium text-green-600">✓ Confirmed</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-4">
          {paymentDetails?.status === 'Success' ? (
            <>
              <button
                onClick={handleViewBookings}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-base font-semibold bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transform hover:scale-105 transition-all duration-200"
              >
                View My Bookings
              </button>
              <button
                onClick={handleGoHome}
                className="w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-xl shadow-lg text-base font-semibold bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transform hover:scale-105 transition-all duration-200"
              >
                Book Another Court
              </button>
            </>
          ) : (
            <button
              onClick={handleGoHome}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-base font-semibold bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform hover:scale-105 transition-all duration-200"
            >
              Try Again
            </button>
          )}
        </div>

        {/* Additional Info */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            {paymentDetails?.status === 'Success' 
              ? 'You will receive a confirmation email shortly.'
              : 'If you have any questions, please contact our support team.'
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
