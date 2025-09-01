# Book My Court - Sports Venue Booking Platform

A comprehensive sports venue booking platform built with React.js and Node.js, featuring real-time availability, secure payments, and location-based search.

## 🏟️ Features

### For Users
- **Real-time Booking** - Book sports venues with instant confirmation
- **Location-based Search** - Find venues near you with geolocation
- **Multiple Sports** - Support for tennis, badminton, cricket, football, and more
- **Secure Payments** - Integrated PayHere payment gateway
- **Slot Management** - Book up to 4 continuous hours
- **Responsive Design** - Works on desktop and mobile

### For Venue Owners
- **Venue Management** - Add and manage multiple venues
- **Booking Management** - View and manage all bookings
- **Staff Management** - Assign staff to venues
- **Revenue Tracking** - Monitor booking revenue
- **Availability Control** - Block specific dates/times

## 🚀 Tech Stack

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

## 📦 Installation

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

## 🔧 Environment Variables

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

## 📱 Usage

1. **Browse Venues** - Search by location, sport type, or venue name
2. **Select Time Slots** - Choose available 1-hour slots (up to 4 hours)
3. **Book & Pay** - Complete booking with secure payment
4. **Get Confirmation** - Receive instant booking confirmation

## 🏗️ Project Structure

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

## 🔐 Authentication

- **JWT-based** authentication
- **Role-based** access control (User, Venue Owner, Admin)
- **Secure** password hashing with bcrypt

## 💳 Payment Integration

- **PayHere** payment gateway integration
- **Secure** payment processing
- **Real-time** payment status updates
- **Automatic** booking confirmation

## 🗄️ Database Schema

### Key Tables
- **users** - User accounts and profiles
- **venues** - Venue information and details
- **bookings** - Booking records and status
- **payments** - Payment transactions
- **staff_venues** - Staff-venue relationships

## 🚀 Deployment

### Backend Deployment
1. Set up MySQL database
2. Configure environment variables
3. Run database migrations
4. Deploy to your server (Heroku, AWS, etc.)

### Frontend Deployment
1. Build the React app: `npm run build`
2. Deploy to static hosting (Netlify, Vercel, etc.)
3. Configure API endpoints

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For support, email support@bookmycourt.lk or create an issue in the repository.

## 🎯 Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Social media integration
- [ ] Loyalty program
- [ ] Group booking features