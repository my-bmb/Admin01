# admin_orders_management/app.py
import os
import json
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from functools import wraps

import pytz
from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
import psycopg
from psycopg.rows import dict_row
import cloudinary
import cloudinary.uploader
import cloudinary.api
from dotenv import load_dotenv

# Import local modules
from config import Config
from utils import (
    parse_location_data, 
    format_ist_datetime, 
    generate_map_link,
    calculate_statistics,
    upload_to_cloudinary
)

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__, 
    template_folder='templates',
    static_folder='static',
    static_url_path='/static'
)
app.config.from_object(Config)

# Configure Cloudinary
cloudinary.config(
    cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
    api_key=os.environ.get('CLOUDINARY_API_KEY'),
    api_secret=os.environ.get('CLOUDINARY_API_SECRET'),
    secure=True
)

# Flask-Login setup
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
login_manager.login_message = 'Please log in to access this page.'

# Timezone setup
IST = pytz.timezone('Asia/Kolkata')

# Database connection
def get_db_connection():
    """Establish database connection"""
    database_url = os.environ.get('DATABASE_URL')
    
    if not database_url:
        raise ValueError("DATABASE_URL environment variable is not set")
    
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)
    
    try:
        conn = psycopg.connect(database_url, row_factory=dict_row)
        return conn
    except Exception as e:
        logger.error(f"Database connection error: {e}")
        raise

# User class for Flask-Login
class AdminUser(UserMixin):
    def __init__(self, id, username, email, role):
        self.id = id
        self.username = username
        self.email = email
        self.role = role

@login_manager.user_loader
def load_user(user_id):
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # In production, you'd have an admin_users table
                # For demo, using a simple check
                admin_users = {
                    '1': AdminUser('1', 'admin', 'admin@bitemebuddy.com', 'superadmin'),
                    '2': AdminUser('2', 'manager', 'manager@bitemebuddy.com', 'manager')
                }
                return admin_users.get(user_id)
    except Exception as e:
        logger.error(f"Error loading user: {e}")
        return None

# Initialize database tables
def init_database():
    """Initialize required database tables if missing"""
    try:
        logger.info("Initializing database tables...")
        
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Check if admin_users table exists
                cur.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = 'admin_users'
                    )
                """)
                admin_table_exists = cur.fetchone()['exists']
                
                if not admin_table_exists:
                    logger.info("Creating admin_users table...")
                    
                    # Create admin_users table
                    cur.execute("""
                        CREATE TABLE admin_users (
                            id SERIAL PRIMARY KEY,
                            username VARCHAR(50) UNIQUE NOT NULL,
                            email VARCHAR(100) UNIQUE NOT NULL,
                            password_hash VARCHAR(255) NOT NULL,
                            full_name VARCHAR(100),
                            role VARCHAR(20) DEFAULT 'admin',
                            is_active BOOLEAN DEFAULT TRUE,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            last_login TIMESTAMP
                        )
                    """)
                    
                    # Create admin_sessions table
                    cur.execute("""
                        CREATE TABLE admin_sessions (
                            session_id SERIAL PRIMARY KEY,
                            user_id INTEGER REFERENCES admin_users(id) ON DELETE CASCADE,
                            token VARCHAR(255) UNIQUE NOT NULL,
                            ip_address VARCHAR(45),
                            user_agent TEXT,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            expires_at TIMESTAMP,
                            is_active BOOLEAN DEFAULT TRUE
                        )
                    """)
                    
                    # Create admin_activities table for logging
                    cur.execute("""
                        CREATE TABLE admin_activities (
                            activity_id SERIAL PRIMARY KEY,
                            user_id INTEGER REFERENCES admin_users(id) ON DELETE CASCADE,
                            activity_type VARCHAR(50) NOT NULL,
                            description TEXT NOT NULL,
                            ip_address VARCHAR(45),
                            user_agent TEXT,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        )
                    """)
                    
                    logger.info("Admin tables created successfully!")
                
                # Check for existing tables and log status
                tables_to_check = ['users', 'orders', 'order_items', 'payments', 'addresses']
                for table in tables_to_check:
                    cur.execute(f"""
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_name = '{table}'
                        )
                    """)
                    exists = cur.fetchone()['exists']
                    logger.info(f"Table '{table}': {'Exists' if exists else 'Missing'}")
                
                conn.commit()
        
        logger.info("Database initialization completed!")
        return True
        
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        return False

# Custom decorator for role-based access
def role_required(role):
    def decorator(f):
        @wraps(f)
        @login_required
        def decorated_function(*args, **kwargs):
            if current_user.role != role and current_user.role != 'superadmin':
                flash('You do not have permission to access this page.', 'error')
                return redirect(url_for('dashboard'))
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# ============================================
# AUTHENTICATION ROUTES
# ============================================

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()
        
        # For demo purposes - in production, use proper authentication
        if username == 'admin' and password == 'admin123':
            user = AdminUser('1', 'admin', 'admin@bitemebuddy.com', 'superadmin')
            login_user(user)
            flash('Login successful!', 'success')
            logger.info(f"Admin user '{username}' logged in")
            return redirect(url_for('dashboard'))
        elif username == 'manager' and password == 'manager123':
            user = AdminUser('2', 'manager', 'manager@bitemebuddy.com', 'manager')
            login_user(user)
            flash('Login successful!', 'success')
            logger.info(f"Manager user '{username}' logged in")
            return redirect(url_for('dashboard'))
        else:
            flash('Invalid username or password', 'error')
            logger.warning(f"Failed login attempt for username: {username}")
    
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logger.info(f"User '{current_user.username}' logged out")
    logout_user()
    flash('You have been logged out.', 'success')
    return redirect(url_for('login'))

# ============================================
# DASHBOARD ROUTES
# ============================================

@app.route('/')
@app.route('/dashboard')
@login_required
def dashboard():
    """Main dashboard showing today's orders and statistics"""
    try:
        # Get filter parameter
        filter_type = request.args.get('filter', 'today')
        
        # Calculate date ranges
        today = datetime.now(IST).date()
        start_date = end_date = None
        
        if filter_type == 'today':
            start_date = today
            end_date = today
        elif filter_type == 'week':
            start_date = today - timedelta(days=today.weekday())
            end_date = today
        elif filter_type == 'month':
            start_date = today.replace(day=1)
            end_date = today
        else:  # all time
            start_date = None
            end_date = None
        
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Get today's orders
                cur.execute("""
                    SELECT 
                        o.order_id,
                        o.user_name,
                        o.user_phone,
                        o.total_amount,
                        o.status,
                        o.order_date,
                        COUNT(oi.order_item_id) as item_count
                    FROM orders o
                    LEFT JOIN order_items oi ON o.order_id = oi.order_id
                    WHERE DATE(o.order_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') = %s
                    GROUP BY o.order_id
                    ORDER BY o.order_date DESC
                    LIMIT 50
                """, (today,))
                
                todays_orders = cur.fetchall()
                
                # Format dates for display
                for order in todays_orders:
                    order['order_date_formatted'] = format_ist_datetime(order['order_date'])
                
                # Get statistics
                stats = calculate_statistics(conn, filter_type)
                
                # Get recent activities
                cur.execute("""
                    SELECT 
                        o.order_id,
                        o.user_name,
                        o.status,
                        o.order_date,
                        CASE 
                            WHEN o.status = 'pending' THEN 'warning'
                            WHEN o.status = 'processing' THEN 'info'
                            WHEN o.status = 'completed' THEN 'success'
                            WHEN o.status = 'cancelled' THEN 'danger'
                            ELSE 'secondary'
                        END as status_badge
                    FROM orders o
                    ORDER BY o.order_date DESC
                    LIMIT 10
                """)
                
                recent_activities = cur.fetchall()
                
                # Get order status distribution
                cur.execute("""
                    SELECT 
                        status,
                        COUNT(*) as count,
                        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM orders), 1) as percentage
                    FROM orders
                    GROUP BY status
                    ORDER BY count DESC
                """)
                
                status_distribution = cur.fetchall()
                
                # Get top ordered items
                cur.execute("""
                    SELECT 
                        oi.item_name,
                        oi.item_type,
                        SUM(oi.quantity) as total_quantity,
                        SUM(oi.total) as total_revenue
                    FROM order_items oi
                    GROUP BY oi.item_name, oi.item_type
                    ORDER BY total_quantity DESC
                    LIMIT 10
                """)
                
                top_items = cur.fetchall()
        
        return render_template('dashboard.html',
                             todays_orders=todays_orders,
                             stats=stats,
                             recent_activities=recent_activities,
                             status_distribution=status_distribution,
                             top_items=top_items,
                             filter_type=filter_type,
                             current_date=today.strftime('%d %B %Y'))
        
    except Exception as e:
        logger.error(f"Dashboard error: {e}")
        flash(f'Error loading dashboard: {str(e)}', 'error')
        return render_template('dashboard.html',
                             todays_orders=[],
                             stats={},
                             recent_activities=[],
                             status_distribution=[],
                             top_items=[],
                             filter_type='today')

# ============================================
# ORDERS MANAGEMENT ROUTES
# ============================================

@app.route('/orders')
@login_required
def orders():
    """Orders management page with search and filters"""
    try:
        # Get query parameters
        search = request.args.get('search', '')
        status = request.args.get('status', '')
        start_date = request.args.get('start_date', '')
        end_date = request.args.get('end_date', '')
        page = int(request.args.get('page', 1))
        per_page = 20
        
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Build dynamic query
                query = """
                    SELECT 
                        o.order_id,
                        o.user_id,
                        o.user_name,
                        o.user_phone,
                        o.user_email,
                        o.total_amount,
                        o.status,
                        o.order_date,
                        o.delivery_location,
                        COUNT(oi.order_item_id) as item_count,
                        p.payment_status,
                        p.payment_mode
                    FROM orders o
                    LEFT JOIN order_items oi ON o.order_id = oi.order_id
                    LEFT JOIN payments p ON o.order_id = p.order_id
                    WHERE 1=1
                """
                
                params = []
                
                # Add search conditions
                if search:
                    query += """
                        AND (o.user_name ILIKE %s 
                        OR o.user_phone ILIKE %s 
                        OR o.user_email ILIKE %s 
                        OR CAST(o.order_id AS TEXT) ILIKE %s)
                    """
                    search_param = f"%{search}%"
                    params.extend([search_param, search_param, search_param, search_param])
                
                # Add status filter
                if status:
                    query += " AND o.status = %s"
                    params.append(status)
                
                # Add date filters
                if start_date:
                    query += " AND DATE(o.order_date) >= %s"
                    params.append(start_date)
                
                if end_date:
                    query += " AND DATE(o.order_date) <= %s"
                    params.append(end_date)
                
                # Add grouping and ordering
                query += """
                    GROUP BY o.order_id, o.user_id, o.user_name, o.user_phone, 
                             o.user_email, o.total_amount, o.status, o.order_date, 
                             o.delivery_location, p.payment_status, p.payment_mode
                    ORDER BY o.order_date DESC
                """
                
                # Get total count for pagination
                count_query = f"SELECT COUNT(*) FROM ({query}) AS subquery"
                cur.execute(count_query, params)
                total_count = cur.fetchone()['count']
                
                # Add pagination
                query += " LIMIT %s OFFSET %s"
                params.extend([per_page, (page - 1) * per_page])
                
                # Execute main query
                cur.execute(query, params)
                orders_list = cur.fetchall()
                
                # Format dates and amounts
                for order in orders_list:
                    order['order_date_formatted'] = format_ist_datetime(order['order_date'])
                    order['total_amount_formatted'] = f"₹{order['total_amount']:,.2f}"
                    
                    # Status badge class
                    status_class = {
                        'pending': 'warning',
                        'processing': 'info',
                        'completed': 'success',
                        'cancelled': 'danger',
                        'delivered': 'success'
                    }.get(order['status'], 'secondary')
                    order['status_class'] = status_class
                
                # Get status counts for filter
                cur.execute("""
                    SELECT status, COUNT(*) as count
                    FROM orders
                    GROUP BY status
                    ORDER BY count DESC
                """)
                status_counts = cur.fetchall()
        
        total_pages = (total_count + per_page - 1) // per_page
        
        return render_template('orders.html',
                             orders=orders_list,
                             search=search,
                             status=status,
                             start_date=start_date,
                             end_date=end_date,
                             page=page,
                             total_pages=total_pages,
                             total_count=total_count,
                             status_counts=status_counts)
        
    except Exception as e:
        logger.error(f"Orders page error: {e}")
        flash(f'Error loading orders: {str(e)}', 'error')
        return render_template('orders.html',
                             orders=[],
                             search='',
                             status='',
                             start_date='',
                             end_date='',
                             page=1,
                             total_pages=1,
                             total_count=0,
                             status_counts=[])

@app.route('/api/orders/<int:order_id>')
@login_required
def get_order_details(order_id):
    """Get complete order details for modal"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Get order basic info
                cur.execute("""
                    SELECT 
                        o.*,
                        p.payment_status,
                        p.payment_mode,
                        p.transaction_id,
                        p.payment_date,
                        p.razorpay_order_id,
                        p.razorpay_payment_id,
                        p.razorpay_signature
                    FROM orders o
                    LEFT JOIN payments p ON o.order_id = p.order_id
                    WHERE o.order_id = %s
                """, (order_id,))
                
                order = cur.fetchone()
                
                if not order:
                    return jsonify({'success': False, 'message': 'Order not found'})
                
                # Get order items
                cur.execute("""
                    SELECT 
                        oi.*,
                        CASE 
                            WHEN oi.item_type = 'service' THEN s.photo
                            WHEN oi.item_type = 'menu' THEN m.photo
                            ELSE oi.item_photo
                        END as item_photo_cloudinary
                    FROM order_items oi
                    LEFT JOIN services s ON oi.item_type = 'service' AND oi.item_id = s.id
                    LEFT JOIN menu m ON oi.item_type = 'menu' AND oi.item_id = m.id
                    WHERE oi.order_id = %s
                    ORDER BY oi.order_item_id
                """, (order_id,))
                
                order_items = cur.fetchall()
                
                # Get customer details
                cur.execute("""
                    SELECT 
                        u.*,
                        a.full_name as address_name,
                        a.phone as address_phone,
                        a.address_line1,
                        a.address_line2,
                        a.landmark,
                        a.city,
                        a.state,
                        a.pincode,
                        a.latitude,
                        a.longitude
                    FROM users u
                    LEFT JOIN addresses a ON u.id = a.user_id AND a.is_default = TRUE
                    WHERE u.id = %s
                """, (order['user_id'],))
                
                customer = cur.fetchone()
                
                # Format dates
                if order.get('order_date'):
                    order['order_date_formatted'] = format_ist_datetime(order['order_date'])
                
                if order.get('delivery_date'):
                    order['delivery_date_formatted'] = format_ist_datetime(order['delivery_date'])
                
                if order.get('payment_date'):
                    order['payment_date_formatted'] = format_ist_datetime(order['payment_date'])
                
                # Generate map link if coordinates exist
                if customer and customer.get('latitude') and customer.get('longitude'):
                    customer['map_link'] = generate_map_link(
                        customer['latitude'], 
                        customer['longitude']
                    )
                
                # Format amounts
                order['total_amount_formatted'] = f"₹{order['total_amount']:,.2f}"
                
                for item in order_items:
                    item['price_formatted'] = f"₹{item['price']:,.2f}"
                    item['total_formatted'] = f"₹{item['total']:,.2f}"
                    
                    # Use Cloudinary photo if available
                    if not item.get('item_photo') and item.get('item_photo_cloudinary'):
                        item['item_photo'] = item['item_photo_cloudinary']
                
                return jsonify({
                    'success': True,
                    'order': order,
                    'order_items': order_items,
                    'customer': customer
                })
                
    except Exception as e:
        logger.error(f"Error getting order details for {order_id}: {e}")
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/orders/<int:order_id>/update-status', methods=['POST'])
@login_required
@role_required('superadmin')
def update_order_status(order_id):
    """Update order status"""
    try:
        data = request.get_json()
        new_status = data.get('status')
        notes = data.get('notes', '')
        
        if not new_status:
            return jsonify({'success': False, 'message': 'Status is required'})
        
        valid_statuses = ['pending', 'processing', 'completed', 'cancelled', 'delivered']
        if new_status not in valid_statuses:
            return jsonify({'success': False, 'message': 'Invalid status'})
        
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Update order status
                cur.execute("""
                    UPDATE orders 
                    SET status = %s, notes = COALESCE(%s, notes)
                    WHERE order_id = %s
                    RETURNING order_id, status
                """, (new_status, notes, order_id))
                
                updated_order = cur.fetchone()
                
                if not updated_order:
                    return jsonify({'success': False, 'message': 'Order not found'})
                
                # Log the activity
                cur.execute("""
                    INSERT INTO orders_status_history 
                    (order_id, old_status, new_status, changed_by, notes)
                    VALUES (%s, (SELECT status FROM orders WHERE order_id = %s), %s, %s, %s)
                """, (order_id, order_id, new_status, current_user.username, notes))
                
                conn.commit()
                
                logger.info(f"Order {order_id} status updated to {new_status} by {current_user.username}")
                
                return jsonify({
                    'success': True,
                    'message': f'Order status updated to {new_status}',
                    'order_id': order_id,
                    'new_status': new_status
                })
                
    except Exception as e:
        logger.error(f"Error updating order status for {order_id}: {e}")
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/orders/<int:order_id>/update-payment', methods=['POST'])
@login_required
@role_required('superadmin')
def update_payment_status(order_id):
    """Update payment status"""
    try:
        data = request.get_json()
        payment_status = data.get('payment_status')
        transaction_id = data.get('transaction_id', '')
        
        if not payment_status:
            return jsonify({'success': False, 'message': 'Payment status is required'})
        
        valid_statuses = ['pending', 'completed', 'failed', 'refunded', 'cancelled']
        if payment_status not in valid_statuses:
            return jsonify({'success': False, 'message': 'Invalid payment status'})
        
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Update payment status
                cur.execute("""
                    UPDATE payments 
                    SET payment_status = %s, 
                        transaction_id = CASE WHEN %s != '' THEN %s ELSE transaction_id END,
                        payment_date = CASE WHEN %s = 'completed' THEN CURRENT_TIMESTAMP ELSE payment_date END
                    WHERE order_id = %s
                    RETURNING payment_id, payment_status
                """, (payment_status, transaction_id, transaction_id, payment_status, order_id))
                
                updated_payment = cur.fetchone()
                
                if not updated_payment:
                    # Try to create payment record if it doesn't exist
                    cur.execute("""
                        INSERT INTO payments (order_id, user_id, amount, payment_mode, payment_status, transaction_id)
                        SELECT 
                            o.order_id, 
                            o.user_id, 
                            o.total_amount, 
                            o.payment_mode, 
                            %s, 
                            %s
                        FROM orders o
                        WHERE o.order_id = %s
                        RETURNING payment_id, payment_status
                    """, (payment_status, transaction_id, order_id))
                    updated_payment = cur.fetchone()
                
                conn.commit()
                
                logger.info(f"Payment for order {order_id} updated to {payment_status} by {current_user.username}")
                
                return jsonify({
                    'success': True,
                    'message': f'Payment status updated to {payment_status}',
                    'order_id': order_id,
                    'payment_status': payment_status
                })
                
    except Exception as e:
        logger.error(f"Error updating payment for order {order_id}: {e}")
        return jsonify({'success': False, 'message': str(e)})

# ============================================
# STATISTICS ROUTES
# ============================================

@app.route('/statistics')
@login_required
def statistics():
    """Statistics and analytics page"""
    try:
        # Get date range parameters
        period = request.args.get('period', 'week')
        start_date = request.args.get('start_date', '')
        end_date = request.args.get('end_date', '')
        
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Calculate statistics
                stats = calculate_statistics(conn, period, start_date, end_date)
                
                # Get daily orders for chart
                if period == 'custom' and start_date and end_date:
                    cur.execute("""
                        SELECT 
                            DATE(order_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') as date,
                            COUNT(*) as order_count,
                            SUM(total_amount) as total_revenue
                        FROM orders
                        WHERE DATE(order_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') BETWEEN %s AND %s
                        GROUP BY DATE(order_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')
                        ORDER BY date
                    """, (start_date, end_date))
                else:
                    # Default to last 7 days
                    cur.execute("""
                        SELECT 
                            DATE(order_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') as date,
                            COUNT(*) as order_count,
                            SUM(total_amount) as total_revenue
                        FROM orders
                        WHERE order_date >= CURRENT_DATE - INTERVAL '7 days'
                        GROUP BY DATE(order_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')
                        ORDER BY date
                    """)
                
                daily_data = cur.fetchall()
                
                # Get top categories
                cur.execute("""
                    SELECT 
                        item_type as category,
                        COUNT(*) as order_count,
                        SUM(total) as total_revenue
                    FROM order_items
                    GROUP BY item_type
                    ORDER BY total_revenue DESC
                """)
                
                categories = cur.fetchall()
                
                # Get payment method distribution
                cur.execute("""
                    SELECT 
                        COALESCE(payment_mode, 'Unknown') as method,
                        COUNT(*) as order_count,
                        SUM(amount) as total_amount
                    FROM payments
                    WHERE payment_status = 'completed'
                    GROUP BY payment_mode
                    ORDER BY total_amount DESC
                """)
                
                payment_methods = cur.fetchall()
        
        return render_template('statistics.html',
                             stats=stats,
                             daily_data=daily_data,
                             categories=categories,
                             payment_methods=payment_methods,
                             period=period,
                             start_date=start_date,
                             end_date=end_date)
        
    except Exception as e:
        logger.error(f"Statistics page error: {e}")
        flash(f'Error loading statistics: {str(e)}', 'error')
        return render_template('statistics.html',
                             stats={},
                             daily_data=[],
                             categories=[],
                             payment_methods=[],
                             period='week',
                             start_date='',
                             end_date='')

@app.route('/api/statistics/chart-data')
@login_required
def get_chart_data():
    """Get chart data for AJAX requests"""
    try:
        chart_type = request.args.get('type', 'daily_orders')
        period = request.args.get('period', 'week')
        
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                
                if chart_type == 'daily_orders':
                    # Daily orders and revenue
                    cur.execute("""
                        SELECT 
                            TO_CHAR(DATE(order_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata'), 'Mon DD') as label,
                            DATE(order_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') as date,
                            COUNT(*) as orders,
                            COALESCE(SUM(total_amount), 0) as revenue
                        FROM orders
                        WHERE order_date >= CURRENT_DATE - INTERVAL '30 days'
                        GROUP BY DATE(order_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')
                        ORDER BY date
                    """)
                    
                    data = cur.fetchall()
                    
                    return jsonify({
                        'success': True,
                        'labels': [item['label'] for item in data],
                        'datasets': [
                            {
                                'label': 'Orders',
                                'data': [item['orders'] for item in data],
                                'borderColor': 'rgb(75, 192, 192)',
                                'backgroundColor': 'rgba(75, 192, 192, 0.2)'
                            },
                            {
                                'label': 'Revenue (₹)',
                                'data': [float(item['revenue']) for item in data],
                                'borderColor': 'rgb(54, 162, 235)',
                                'backgroundColor': 'rgba(54, 162, 235, 0.2)',
                                'yAxisID': 'y1'
                            }
                        ]
                    })
                
                elif chart_type == 'status_distribution':
                    # Order status distribution
                    cur.execute("""
                        SELECT 
                            status,
                            COUNT(*) as count
                        FROM orders
                        GROUP BY status
                    """)
                    
                    data = cur.fetchall()
                    
                    status_colors = {
                        'pending': '#ffc107',
                        'processing': '#17a2b8',
                        'completed': '#28a745',
                        'cancelled': '#dc3545',
                        'delivered': '#20c997'
                    }
                    
                    return jsonify({
                        'success': True,
                        'labels': [item['status'].title() for item in data],
                        'datasets': [{
                            'data': [item['count'] for item in data],
                            'backgroundColor': [status_colors.get(item['status'], '#6c757d') for item in data]
                        }]
                    })
                
                elif chart_type == 'top_items':
                    # Top ordered items
                    cur.execute("""
                        SELECT 
                            item_name,
                            SUM(quantity) as total_quantity
                        FROM order_items
                        GROUP BY item_name
                        ORDER BY total_quantity DESC
                        LIMIT 10
                    """)
                    
                    data = cur.fetchall()
                    
                    return jsonify({
                        'success': True,
                        'labels': [item['item_name'] for item in data],
                        'datasets': [{
                            'label': 'Quantity Sold',
                            'data': [item['total_quantity'] for item in data],
                            'backgroundColor': 'rgba(153, 102, 255, 0.6)'
                        }]
                    })
                
                else:
                    return jsonify({'success': False, 'message': 'Invalid chart type'})
                
    except Exception as e:
        logger.error(f"Chart data error: {e}")
        return jsonify({'success': False, 'message': str(e)})

# ============================================
# CUSTOMERS MANAGEMENT ROUTES
# ============================================

@app.route('/customers')
@login_required
def customers():
    """Customers management page"""
    try:
        search = request.args.get('search', '')
        page = int(request.args.get('page', 1))
        per_page = 20
        
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Build query
                query = """
                    SELECT 
                        u.id,
                        u.full_name,
                        u.phone,
                        u.email,
                        u.profile_pic,
                        u.location,
                        u.created_at,
                        u.last_login,
                        u.is_active,
                        COUNT(o.order_id) as total_orders,
                        COALESCE(SUM(o.total_amount), 0) as total_spent
                    FROM users u
                    LEFT JOIN orders o ON u.id = o.user_id
                    WHERE 1=1
                """
                
                params = []
                
                if search:
                    query += """
                        AND (u.full_name ILIKE %s 
                        OR u.phone ILIKE %s 
                        OR u.email ILIKE %s)
                    """
                    search_param = f"%{search}%"
                    params.extend([search_param, search_param, search_param])
                
                query += """
                    GROUP BY u.id, u.full_name, u.phone, u.email, u.profile_pic, 
                             u.location, u.created_at, u.last_login, u.is_active
                    ORDER BY u.created_at DESC
                """
                
                # Get total count
                count_query = f"SELECT COUNT(*) FROM ({query}) AS subquery"
                cur.execute(count_query, params)
                total_count = cur.fetchone()['count']
                
                # Add pagination
                query += " LIMIT %s OFFSET %s"
                params.extend([per_page, (page - 1) * per_page])
                
                cur.execute(query, params)
                customers_list = cur.fetchall()
                
                # Format dates
                for customer in customers_list:
                    if customer.get('created_at'):
                        customer['created_at_formatted'] = format_ist_datetime(customer['created_at'])
                    
                    if customer.get('last_login'):
                        customer['last_login_formatted'] = format_ist_datetime(customer['last_login'])
                    
                    customer['total_spent_formatted'] = f"₹{customer['total_spent']:,.2f}"
        
        total_pages = (total_count + per_page - 1) // per_page
        
        return render_template('customers.html',
                             customers=customers_list,
                             search=search,
                             page=page,
                             total_pages=total_pages,
                             total_count=total_count)
        
    except Exception as e:
        logger.error(f"Customers page error: {e}")
        flash(f'Error loading customers: {str(e)}', 'error')
        return render_template('customers.html',
                             customers=[],
                             search='',
                             page=1,
                             total_pages=1,
                             total_count=0)

@app.route('/api/customers/<int:customer_id>')
@login_required
def get_customer_details(customer_id):
    """Get complete customer details"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Get customer info
                cur.execute("""
                    SELECT 
                        u.*,
                        a.address_id,
                        a.full_name as address_name,
                        a.phone as address_phone,
                        a.address_line1,
                        a.address_line2,
                        a.landmark,
                        a.city,
                        a.state,
                        a.pincode,
                        a.latitude,
                        a.longitude,
                        a.is_default
                    FROM users u
                    LEFT JOIN addresses a ON u.id = a.user_id
                    WHERE u.id = %s
                    ORDER BY a.is_default DESC, a.created_at DESC
                """, (customer_id,))
                
                customer_data = cur.fetchall()
                
                if not customer_data:
                    return jsonify({'success': False, 'message': 'Customer not found'})
                
                # Get customer orders summary
                cur.execute("""
                    SELECT 
                        status,
                        COUNT(*) as count,
                        SUM(total_amount) as total_amount
                    FROM orders
                    WHERE user_id = %s
                    GROUP BY status
                """, (customer_id,))
                
                orders_summary = cur.fetchall()
                
                # Get recent orders
                cur.execute("""
                    SELECT 
                        order_id,
                        total_amount,
                        status,
                        order_date
                    FROM orders
                    WHERE user_id = %s
                    ORDER BY order_date DESC
                    LIMIT 5
                """, (customer_id,))
                
                recent_orders = cur.fetchall()
                
                # Format data
                customer = customer_data[0]
                
                if customer.get('created_at'):
                    customer['created_at_formatted'] = format_ist_datetime(customer['created_at'])
                
                if customer.get('last_login'):
                    customer['last_login_formatted'] = format_ist_datetime(customer['last_login'])
                
                # Generate map links for addresses
                addresses = []
                for addr in customer_data:
                    if addr.get('latitude') and addr.get('longitude'):
                        addr['map_link'] = generate_map_link(addr['latitude'], addr['longitude'])
                    addresses.append(addr)
                
                return jsonify({
                    'success': True,
                    'customer': customer,
                    'addresses': addresses,
                    'orders_summary': orders_summary,
                    'recent_orders': recent_orders
                })
                
    except Exception as e:
        logger.error(f"Error getting customer details for {customer_id}: {e}")
        return jsonify({'success': False, 'message': str(e)})

# ============================================
# ITEMS MANAGEMENT ROUTES
# ============================================

@app.route('/items')
@login_required
def items():
    """Services and Menu items management"""
    try:
        item_type = request.args.get('type', 'all')
        category = request.args.get('category', '')
        search = request.args.get('search', '')
        
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Get services
                services_query = """
                    SELECT 
                        s.*,
                        'service' as item_type,
                        (SELECT COUNT(*) FROM order_items WHERE item_type = 'service' AND item_id = s.id) as times_ordered
                    FROM services s
                    WHERE 1=1
                """
                
                services_params = []
                
                if search and item_type in ['all', 'service']:
                    services_query += " AND s.name ILIKE %s"
                    services_params.append(f"%{search}%")
                
                if category and item_type in ['all', 'service']:
                    services_query += " AND s.category = %s"
                    services_params.append(category)
                
                services_query += " ORDER BY s.position, s.name"
                
                cur.execute(services_query, services_params)
                services = cur.fetchall()
                
                # Get menu items
                menu_query = """
                    SELECT 
                        m.*,
                        'menu' as item_type,
                        (SELECT COUNT(*) FROM order_items WHERE item_type = 'menu' AND item_id = m.id) as times_ordered
                    FROM menu m
                    WHERE 1=1
                """
                
                menu_params = []
                
                if search and item_type in ['all', 'menu']:
                    menu_query += " AND m.name ILIKE %s"
                    menu_params.append(f"%{search}%")
                
                if category and item_type in ['all', 'menu']:
                    menu_query += " AND m.category = %s"
                    menu_params.append(category)
                
                menu_query += " ORDER BY m.position, m.name"
                
                cur.execute(menu_query, menu_params)
                menu_items = cur.fetchall()
                
                # Get categories
                cur.execute("""
                    SELECT category, 'service' as type FROM services 
                    WHERE category IS NOT NULL 
                    GROUP BY category
                    UNION
                    SELECT category, 'menu' as type FROM menu 
                    WHERE category IS NOT NULL 
                    GROUP BY category
                    ORDER BY category
                """)
                
                categories = cur.fetchall()
                
                # Combine items based on filter
                items_list = []
                if item_type in ['all', 'service']:
                    items_list.extend(services)
                if item_type in ['all', 'menu']:
                    items_list.extend(menu_items)
                
                # Format prices
                for item in items_list:
                    item['price_formatted'] = f"₹{item['price']:,.2f}"
                    item['final_price_formatted'] = f"₹{item['final_price']:,.2f}"
                    if item.get('discount'):
                        item['discount_formatted'] = f"₹{item['discount']:,.2f}"
        
        return render_template('items.html',
                             items=items_list,
                             item_type=item_type,
                             category=category,
                             search=search,
                             categories=categories)
        
    except Exception as e:
        logger.error(f"Items page error: {e}")
        flash(f'Error loading items: {str(e)}', 'error')
        return render_template('items.html',
                             items=[],
                             item_type='all',
                             category='',
                             search='',
                             categories=[])

# ============================================
# UTILITY ROUTES
# ============================================

@app.route('/health')
def health_check():
    """Health check endpoint"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
        
        return jsonify({
            'status': 'healthy',
            'service': 'Admin Orders Management',
            'database': 'connected',
            'timestamp': datetime.now(IST).isoformat()
        })
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now(IST).isoformat()
        }), 500

@app.route('/init-db')
def init_db():
    """Initialize database tables"""
    try:
        success = init_database()
        if success:
            return jsonify({
                'success': True,
                'message': 'Database initialized successfully'
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Database initialization failed'
            }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

# ============================================
# ERROR HANDLERS
# ============================================

@app.errorhandler(404)
def page_not_found(e):
    return render_template('error.html', error_code=404, error_message="Page not found"), 404

@app.errorhandler(500)
def internal_server_error(e):
    logger.error(f"Internal server error: {e}")
    return render_template('error.html', error_code=500, error_message="Internal server error"), 500

@app.errorhandler(403)
def forbidden(e):
    return render_template('error.html', error_code=403, error_message="Access forbidden"), 403

# ============================================
# CONTEXT PROCESSORS
# ============================================

@app.context_processor
def inject_user():
    """Inject current user into all templates"""
    return dict(current_user=current_user)

@app.context_processor
def inject_now():
    """Inject current time into all templates"""
    return dict(now=datetime.now(IST))

@app.context_processor
def inject_stats():
    """Inject basic stats into all templates"""
    try:
        if current_user.is_authenticated:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    # Get today's order count
                    cur.execute("""
                        SELECT COUNT(*) as count 
                        FROM orders 
                        WHERE DATE(order_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') = CURRENT_DATE
                    """)
                    today_orders = cur.fetchone()['count']
                    
                    # Get pending orders
                    cur.execute("""
                        SELECT COUNT(*) as count 
                        FROM orders 
                        WHERE status = 'pending'
                    """)
                    pending_orders = cur.fetchone()['count']
                    
                    # Get today's revenue
                    cur.execute("""
                        SELECT COALESCE(SUM(total_amount), 0) as revenue 
                        FROM orders 
                        WHERE DATE(order_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') = CURRENT_DATE
                        AND status != 'cancelled'
                    """)
                    today_revenue = float(cur.fetchone()['revenue'])
                    
                    return dict(
                        today_orders=today_orders,
                        pending_orders=pending_orders,
                        today_revenue=today_revenue
                    )
    except Exception as e:
        logger.error(f"Error injecting stats: {e}")
    
    return dict(today_orders=0, pending_orders=0, today_revenue=0)

# ============================================
# APPLICATION STARTUP
# ============================================

if __name__ == '__main__':
    # Create logs directory
    os.makedirs('logs', exist_ok=True)
    
    # Initialize database
    try:
        init_database()
        logger.info("Application startup completed successfully!")
    except Exception as e:
        logger.error(f"Startup error: {e}")
    
    # Run application
    app.run(debug=True, host='0.0.0.0', port=5001)