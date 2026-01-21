# admin_orders_management/utils.py
import os
import json
import logging
from datetime import datetime, timedelta
from decimal import Decimal
import pytz
import cloudinary
import cloudinary.uploader
import cloudinary.api

logger = logging.getLogger(__name__)

# Timezone
IST = pytz.timezone('Asia/Kolkata')

def parse_location_data(location_string):
    """
    Parse location string in format: "Address | Latitude | Longitude | MapLink"
    Returns: Dictionary with all components
    """
    if not location_string:
        return {
            'address': '',
            'latitude': None,
            'longitude': None,
            'map_link': None,
            'is_auto_detected': False
        }
    
    # Check if it's in our combined format
    if ' | ' in location_string:
        parts = location_string.split(' | ')
        if len(parts) >= 4:
            try:
                # Format: "Address | LAT | LON | MAP_LINK"
                return {
                    'address': parts[0],
                    'latitude': float(parts[1]) if parts[1] else None,
                    'longitude': float(parts[2]) if parts[2] else None,
                    'map_link': parts[3],
                    'is_auto_detected': True,
                    'full_string': location_string
                }
            except ValueError:
                # If float conversion fails
                pass
    
    # Manual entry (not in combined format)
    return {
        'address': location_string,
        'latitude': None,
        'longitude': None,
        'map_link': None,
        'is_auto_detected': False,
        'full_string': location_string
    }

def format_ist_datetime(datetime_obj, format_str="%d %b %Y, %I:%M %p"):
    """
    Format datetime in IST with Indian 12-hour AM/PM format
    """
    if not datetime_obj:
        return ""
    
    try:
        # If it's already timezone aware
        if datetime_obj.tzinfo is not None:
            ist_time = datetime_obj.astimezone(IST)
        else:
            # If it's naive, assume it's UTC (for existing data)
            ist_time = pytz.utc.localize(datetime_obj).astimezone(IST)
        
        return ist_time.strftime(format_str)
    except Exception as e:
        logger.error(f"Error formatting datetime: {e}")
        return str(datetime_obj)

def generate_map_link(latitude, longitude, zoom=15):
    """
    Generate Google Maps link WITHOUT API key
    Simple clickable link that opens maps.google.com
    """
    try:
        if latitude is None or longitude is None:
            return None
        
        # Convert to float and format
        lat = float(latitude)
        lng = float(longitude)
        
        # Generate Google Maps link
        # Using the standard Google Maps URL format
        map_link = f"https://www.google.com/maps?q={lat},{lng}&z={zoom}"
        
        return map_link
    except Exception as e:
        logger.error(f"Error generating map link: {e}")
        return None

def upload_to_cloudinary(file, folder="uploads", public_id=None, resource_type="image"):
    """
    Upload file to Cloudinary
    Returns: secure_url or None
    """
    try:
        if not file or not hasattr(file, 'filename'):
            logger.error("Invalid file object")
            return None
        
        # Generate public_id if not provided
        if not public_id:
            import secrets
            filename = os.path.splitext(file.filename)[0]
            public_id = f"{folder}/{filename}_{secrets.token_hex(8)}"
        
        # Upload to Cloudinary
        upload_result = cloudinary.uploader.upload(
            file,
            folder=folder,
            public_id=public_id,
            resource_type=resource_type,
            overwrite=True,
            transformation=[
                {'quality': 'auto', 'fetch_format': 'auto'}
            ]
        )
        
        if upload_result and 'secure_url' in upload_result:
            logger.info(f"File uploaded to Cloudinary: {upload_result['secure_url']}")
            return upload_result['secure_url']
        else:
            logger.error("Cloudinary upload failed - no secure_url returned")
            return None
            
    except Exception as e:
        logger.error(f"Cloudinary upload error: {e}")
        return None

def calculate_statistics(conn, period='today', start_date=None, end_date=None):
    """
    Calculate statistics based on period
    Returns: Dictionary with statistics
    """
    try:
        cur = conn.cursor()
        
        # Calculate date ranges
        today = datetime.now(IST).date()
        
        if period == 'today':
            date_condition = "DATE(order_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') = CURRENT_DATE"
        elif period == 'week':
            date_condition = "order_date >= CURRENT_DATE - INTERVAL '7 days'"
        elif period == 'month':
            date_condition = "order_date >= CURRENT_DATE - INTERVAL '30 days'"
        elif period == 'custom' and start_date and end_date:
            date_condition = "DATE(order_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') BETWEEN %s AND %s"
            params = [start_date, end_date]
        else:
            date_condition = "1=1"
            params = []
        
        # Build query
        query = f"""
            SELECT 
                COUNT(*) as total_orders,
                COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total_amount ELSE 0 END), 0) as total_revenue,
                COUNT(DISTINCT user_id) as total_customers,
                AVG(CASE WHEN status != 'cancelled' THEN total_amount ELSE NULL END) as avg_order_value,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
                SUM(CASE WHEN status = 'completed' OR status = 'delivered' THEN 1 ELSE 0 END) as completed_orders,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders
            FROM orders
            WHERE {date_condition}
        """
        
        if period == 'custom' and start_date and end_date:
            cur.execute(query, params)
        else:
            cur.execute(query)
        
        stats = cur.fetchone()
        
        # Get today's stats separately
        cur.execute("""
            SELECT 
                COUNT(*) as today_orders,
                COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total_amount ELSE 0 END), 0) as today_revenue
            FROM orders
            WHERE DATE(order_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') = CURRENT_DATE
        """)
        
        today_stats = cur.fetchone()
        
        # Convert Decimal to float for JSON serialization
        result = {
            'total_orders': stats['total_orders'] or 0,
            'total_revenue': float(stats['total_revenue']) if stats['total_revenue'] else 0,
            'total_customers': stats['total_customers'] or 0,
            'avg_order_value': float(stats['avg_order_value']) if stats['avg_order_value'] else 0,
            'pending_orders': stats['pending_orders'] or 0,
            'completed_orders': stats['completed_orders'] or 0,
            'cancelled_orders': stats['cancelled_orders'] or 0,
            'today_orders': today_stats['today_orders'] or 0,
            'today_revenue': float(today_stats['today_revenue']) if today_stats['today_revenue'] else 0
        }
        
        cur.close()
        return result
        
    except Exception as e:
        logger.error(f"Error calculating statistics: {e}")
        return {
            'total_orders': 0,
            'total_revenue': 0,
            'total_customers': 0,
            'avg_order_value': 0,
            'pending_orders': 0,
            'completed_orders': 0,
            'cancelled_orders': 0,
            'today_orders': 0,
            'today_revenue': 0
        }

def format_currency(amount):
    """Format amount as Indian Rupees"""
    if amount is None:
        return "₹0.00"
    
    if isinstance(amount, Decimal):
        amount = float(amount)
    
    return f"₹{amount:,.2f}"

def get_status_badge_class(status):
    """Get Bootstrap badge class for status"""
    status_classes = {
        'pending': 'warning',
        'processing': 'info',
        'completed': 'success',
        'cancelled': 'danger',
        'delivered': 'success'
    }
    return status_classes.get(status, 'secondary')

def get_payment_status_badge_class(status):
    """Get Bootstrap badge class for payment status"""
    status_classes = {
        'pending': 'warning',
        'completed': 'success',
        'failed': 'danger',
        'refunded': 'secondary',
        'cancelled': 'danger'
    }
    return status_classes.get(status, 'secondary')

def get_cloudinary_image_url(item_type, item_name, default_url=None):
    """
    Get Cloudinary image URL for item
    """
    try:
        folder = 'services' if item_type == 'service' else 'menu_items'
        
        # Search for image by name
        search_name = item_name.lower().replace(' ', '_')
        
        result = cloudinary.Search() \
            .expression(f"folder:{folder} AND filename:{search_name}*") \
            .execute()
        
        if result['resources']:
            return result['resources'][0]['secure_url']
        
        # Try partial match
        words = item_name.lower().split()
        for word in words:
            if len(word) > 3:
                result = cloudinary.Search() \
                    .expression(f"folder:{folder} AND filename:*{word}*") \
                    .execute()
                
                if result['resources']:
                    return result['resources'][0]['secure_url']
        
    except Exception as e:
        logger.error(f"Cloudinary search error: {e}")
    
    # Return default if no image found
    if default_url:
        return default_url
    
    if item_type == 'service':
        return "https://res.cloudinary.com/demo/image/upload/v1633427556/sample_service.jpg"
    else:
        return "https://res.cloudinary.com/demo/image/upload/v1633427556/sample_food.jpg"

def validate_date_range(start_date_str, end_date_str):
    """
    Validate date range and return date objects
    """
    try:
        if not start_date_str or not end_date_str:
            return None, None, "Both start date and end date are required"
        
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        
        if start_date > end_date:
            return None, None, "Start date cannot be after end date"
        
        if (end_date - start_date).days > 365:
            return None, None, "Date range cannot exceed 1 year"
        
        return start_date, end_date, None
        
    except ValueError as e:
        return None, None, f"Invalid date format. Use YYYY-MM-DD: {str(e)}"
    except Exception as e:
        return None, None, f"Date validation error: {str(e)}"

def log_admin_activity(conn, user_id, activity_type, description, ip_address=None, user_agent=None):
    """
    Log admin activity to database
    """
    try:
        cur = conn.cursor()
        
        cur.execute("""
            INSERT INTO admin_activities 
            (user_id, activity_type, description, ip_address, user_agent)
            VALUES (%s, %s, %s, %s, %s)
        """, (user_id, activity_type, description, ip_address, user_agent))
        
        conn.commit()
        cur.close()
        
        logger.info(f"Admin activity logged: {activity_type} - {description}")
        return True
        
    except Exception as e:
        logger.error(f"Error logging admin activity: {e}")
        return False
