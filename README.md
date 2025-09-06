# BookMyCourt.lk - Sports Venue Booking System

A comprehensive web-based sports venue booking platform developed for Sri Lanka, featuring real-time availability management, secure payment processing, and location-based venue discovery.

## Features

### For Users
- **OTP Authentication** - Secure mobile number verification for account registration
- **Real-time Booking** - Book sports venues with instant confirmation
- **Google Maps Integration** - Find venues with interactive map and location search
- **Multiple Sports** - Support for tennis, badminton, cricket, football, and more
- **Secure Payments** - Integrated PayHere payment gateway with SSL encryption
- **Slot Management** - Book up to 4 continuous hours with concurrency control
- **Review System** - Rate and review venues after completed bookings
- **SMS Notifications** - Receive booking confirmations via SMS
- **Responsive Design** - Mobile-first design optimized for Sri Lankan users

### For Venue Owners
- **Venue Management** - Add and manage multiple venues with image uploads
- **Real-time Calendar** - Update venue availability in real-time
- **Booking Management** - View and manage all bookings with status updates
- **Staff Management** - Assign staff to venues with role-based access
- **Revenue Tracking** - Monitor booking revenue and payment status
- **Availability Control** - Block specific dates/times and manage slots

### For Administrators
- **User Management** - Manage all users, venue owners, and staff accounts
- **System Monitoring** - Monitor system performance and booking analytics
- **Payment Oversight** - Track all payment transactions and reconciliations
- **Content Management** - Approve venues and manage system content

## Technology Stack

### Frontend
- **React.js** - User interface
- **React Router** - Navigation
- **Axios** - API calls
- **Tailwind CSS** - Styling
- **React Context** - State management

### Backend
- **Node.js** - Server runtime
- **Express.js** - Web framework
- **Sequelize** - Database ORM
- **MySQL** - Database
- **JWT** - Authentication
- **Multer** - File uploads
- **PayHere** - Payment gateway

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MySQL (v8 or higher)
- npm or yarn

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
npm start
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

##  Environment Variables

### Backend (.env)
```env
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=bookmycourt
JWT_SECRET=your_jwt_secret
PAYHERE_MERCHANT_ID=your_merchant_id
PAYHERE_MERCHANT_SECRET=your_merchant_secret
```

##  Usage

1. **Browse Venues** - Search by location, sport type, or venue name
2. **Select Time Slots** - Choose available 1-hour slots (up to 4 hours)
3. **Book & Pay** - Complete booking with secure payment
4. **Get Confirmation** - Receive instant booking confirmation

##  Project Structure

```
BookMyCourt.lk/
├── frontend/                 # React.js frontend
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React contexts
│   │   ├── services/       # API services
│   │   └── utils/          # Utility functions
│   └── public/             # Static assets
├── backend/                 # Node.js backend
│   ├── src/
│   │   ├── controllers/    # Route controllers
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Custom middleware
│   │   └── config/         # Configuration files
│   └── uploads/            # File uploads
└── README.md               # Project documentation
```

##  Authentication

- **JWT-based** authentication
- **Role-based** access control (User, Venue Owner, Admin)
- **Secure** password hashing with bcrypt

##  Payment Integration

- **PayHere** payment gateway integration
- **Secure** payment processing
- **Real-time** payment status updates
- **Automatic** booking confirmation

##  Database Schema

### Key Tables
- **users** - User accounts and profiles
- **venues** - Venue information and details
- **bookings** - Booking records and status
- **payments** - Payment transactions
- **staff_venues** - Staff-venue relationships

##  Deployment

### Backend Deployment
1. Set up MySQL database
2. Configure environment variables
3. Run database migrations
4. Deploy to your server (Heroku, AWS, etc.)

### Frontend Deployment
1. Build the React app: `npm run build`
2. Deploy to static hosting (Netlify, Vercel, etc.)
3. Configure API endpoints

##  Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

##  License

This project is licensed under the MIT License.

##  Support

For support, email support@bookmycourt.lk or create an issue in the repository.

##  Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Social media integration
- [ ] Loyalty program
- [ ] Group booking features
