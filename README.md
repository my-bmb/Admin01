# Bite Me Buddy - Admin Orders Management System

A complete, production-ready admin dashboard for managing orders, customers, and analytics for the Bite Me Buddy platform.

## Features

### 1. Dashboard
- Real-time statistics and charts
- Today's orders overview
- Revenue trends and analytics
- Order status distribution
- Most ordered items

### 2. Orders Management
- Complete order listing with search and filters
- Order details modal with full information
- Payment details management
- Status updates and tracking
- Bulk actions and exports

### 3. Customers Management
- Customer listing with search
- Detailed customer profiles
- Address management with map links
- Order history and statistics

### 4. Items Management
- Services and menu items listing
- Category filtering
- Popular items tracking

### 5. Statistics & Analytics
- Revenue trends over time
- Order distribution charts
- Payment method analysis
- Customer acquisition metrics
- Hourly order patterns

### 6. Maps Integration
- **NO Google Maps API Key Required**
- Clickable Google Maps links using latitude/longitude
- Address visualization without API costs
- Directions and street view links

## Technology Stack

- **Backend**: Flask (Python)
- **Database**: PostgreSQL with psycopg
- **Image Storage**: Cloudinary
- **Frontend**: Bootstrap 5, Chart.js, Font Awesome
- **Authentication**: Flask-Login
- **Date Handling**: pytz for timezone support

## Database Schema

The system connects to your existing Bite Me Buddy database with these tables:

1. `users` - Customer information
2. `services` - Service listings
3. `menu` - Menu items
4. `cart` - Shopping carts
5. `orders` - Order records
6. `order_items` - Individual order items
7. `payments` - Payment transactions
8. `addresses` - Customer addresses
9. `reviews` - Customer reviews
10. `notifications` - System notifications

## Installation

### 1. Prerequisites
- Python 3.8+
- PostgreSQL database
- Cloudinary account (for image storage)

### 2. Environment Variables

Create a `.env` file in the project root:

```env
# Flask Configuration
SECRET_KEY=your-secret-key-here
FLASK_ENV=production

# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database_name

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Admin Credentials (for demo)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
