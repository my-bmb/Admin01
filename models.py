# admin_orders_management/models.py
from datetime import datetime
from decimal import Decimal
import pytz
from flask_login import UserMixin

IST = pytz.timezone('Asia/Kolkata')

class BaseModel:
    """Base model with common functionality"""
    
    @staticmethod
    def format_datetime(dt, format_str="%d %b %Y, %I:%M %p"):
        """Format datetime in IST"""
        if not dt:
            return ""
        
        if dt.tzinfo is None:
            # Assume UTC if naive
            dt = pytz.utc.localize(dt)
        
        ist_dt = dt.astimezone(IST)
        return ist_dt.strftime(format_str)
    
    @staticmethod
    def format_currency(amount):
        """Format currency as Indian Rupees"""
        if amount is None:
            return "₹0.00"
        
        if isinstance(amount, Decimal):
            amount = float(amount)
        
        return f"₹{amount:,.2f}"
    
    @staticmethod
    def truncate_text(text, max_length=100):
        """Truncate text with ellipsis"""
        if not text:
            return ""
        
        if len(text) <= max_length:
            return text
        
        return text[:max_length] + "..."

class User(UserMixin, BaseModel):
    """User model"""
    
    def __init__(self, user_data):
        self.id = user_data.get('id')
        self.username = user_data.get('username')
        self.email = user_data.get('email')
        self.full_name = user_data.get('full_name')
        self.phone = user_data.get('phone')
        self.profile_pic = user_data.get('profile_pic')
        self.location = user_data.get('location')
        self.is_active = user_data.get('is_active', True)
        self.role = user_data.get('role', 'user')
        self.created_at = user_data.get('created_at')
        self.last_login = user_data.get('last_login')
        
        # Additional fields from joins
        self.total_orders = user_data.get('total_orders', 0)
        self.total_spent = user_data.get('total_spent', 0)
    
    def get_formatted_created_at(self):
        return self.format_datetime(self.created_at)
    
    def get_formatted_last_login(self):
        return self.format_datetime(self.last_login)
    
    def get_total_spent_formatted(self):
        return self.format_currency(self.total_spent)
    
    def get_profile_pic_url(self, default_url=None):
        if self.profile_pic and self.profile_pic.startswith('http'):
            return self.profile_pic
        
        if default_url:
            return default_url
        
        return "https://res.cloudinary.com/demo/image/upload/v1633427556/default-avatar.png"

class Order(BaseModel):
    """Order model"""
    
    def __init__(self, order_data):
        self.order_id = order_data.get('order_id')
        self.user_id = order_data.get('user_id')
        self.user_name = order_data.get('user_name')
        self.user_phone = order_data.get('user_phone')
        self.user_email = order_data.get('user_email')
        self.user_address = order_data.get('user_address')
        self.items = order_data.get('items', '[]')
        self.total_amount = order_data.get('total_amount', 0)
        self.payment_mode = order_data.get('payment_mode', 'COD')
        self.delivery_location = order_data.get('delivery_location')
        self.status = order_data.get('status', 'pending')
        self.order_date = order_data.get('order_date')
        self.delivery_date = order_data.get('delivery_date')
        self.notes = order_data.get('notes')
        
        # Additional fields from joins
        self.item_count = order_data.get('item_count', 0)
        self.payment_status = order_data.get('payment_status')
        self.payment_mode_detail = order_data.get('payment_mode')
    
    def get_formatted_order_date(self):
        return self.format_datetime(self.order_date)
    
    def get_formatted_delivery_date(self):
        return self.format_datetime(self.delivery_date)
    
    def get_total_amount_formatted(self):
        return self.format_currency(self.total_amount)
    
    def get_status_badge_class(self):
        status_classes = {
            'pending': 'warning',
            'processing': 'info',
            'completed': 'success',
            'cancelled': 'danger',
            'delivered': 'success'
        }
        return status_classes.get(self.status, 'secondary')
    
    def get_status_icon(self):
        status_icons = {
            'pending': 'clock',
            'processing': 'cogs',
            'completed': 'check-circle',
            'cancelled': 'times-circle',
            'delivered': 'truck'
        }
        return status_icons.get(self.status, 'question-circle')
    
    def parse_items(self):
        """Parse items JSON string"""
        import json
        try:
            items = json.loads(self.items)
            if isinstance(items, list):
                return items
        except:
            pass
        return []

class OrderItem(BaseModel):
    """Order item model"""
    
    def __init__(self, item_data):
        self.order_item_id = item_data.get('order_item_id')
        self.order_id = item_data.get('order_id')
        self.item_type = item_data.get('item_type')
        self.item_id = item_data.get('item_id')
        self.item_name = item_data.get('item_name')
        self.item_photo = item_data.get('item_photo')
        self.item_description = item_data.get('item_description')
        self.quantity = item_data.get('quantity', 1)
        self.price = item_data.get('price', 0)
        self.total = item_data.get('total', 0)
    
    def get_price_formatted(self):
        return self.format_currency(self.price)
    
    def get_total_formatted(self):
        return self.format_currency(self.total)
    
    def get_item_photo_url(self, default_url=None):
        if self.item_photo and self.item_photo.startswith('http'):
            return self.item_photo
        
        if default_url:
            return default_url
        
        if self.item_type == 'service':
            return "https://res.cloudinary.com/demo/image/upload/v1633427556/sample_service.jpg"
        else:
            return "https://res.cloudinary.com/demo/image/upload/v1633427556/sample_food.jpg"

class Payment(BaseModel):
    """Payment model"""
    
    def __init__(self, payment_data):
        self.payment_id = payment_data.get('payment_id')
        self.order_id = payment_data.get('order_id')
        self.user_id = payment_data.get('user_id')
        self.amount = payment_data.get('amount', 0)
        self.payment_mode = payment_data.get('payment_mode')
        self.transaction_id = payment_data.get('transaction_id')
        self.payment_status = payment_data.get('payment_status', 'pending')
        self.payment_date = payment_data.get('payment_date')
        self.razorpay_order_id = payment_data.get('razorpay_order_id')
        self.razorpay_payment_id = payment_data.get('razorpay_payment_id')
        self.razorpay_signature = payment_data.get('razorpay_signature')
    
    def get_formatted_payment_date(self):
        return self.format_datetime(self.payment_date)
    
    def get_amount_formatted(self):
        return self.format_currency(self.amount)
    
    def get_status_badge_class(self):
        status_classes = {
            'pending': 'warning',
            'completed': 'success',
            'failed': 'danger',
            'refunded': 'secondary',
            'cancelled': 'danger'
        }
        return status_classes.get(self.payment_status, 'secondary')

class Address(BaseModel):
    """Address model"""
    
    def __init__(self, address_data):
        self.address_id = address_data.get('address_id')
        self.user_id = address_data.get('user_id')
        self.full_name = address_data.get('full_name')
        self.phone = address_data.get('phone')
        self.address_line1 = address_data.get('address_line1')
        self.address_line2 = address_data.get('address_line2')
        self.landmark = address_data.get('landmark')
        self.city = address_data.get('city')
        self.state = address_data.get('state')
        self.pincode = address_data.get('pincode')
        self.latitude = address_data.get('latitude')
        self.longitude = address_data.get('longitude')
        self.is_default = address_data.get('is_default', False)
        self.created_at = address_data.get('created_at')
    
    def get_formatted_address(self):
        """Get formatted address string"""
        parts = []
        
        if self.address_line1:
            parts.append(self.address_line1)
        
        if self.address_line2:
            parts.append(self.address_line2)
        
        if self.landmark:
            parts.append(f"Near {self.landmark}")
        
        if self.city:
            parts.append(self.city)
        
        if self.state:
            parts.append(self.state)
        
        if self.pincode:
            parts.append(f"Pincode: {self.pincode}")
        
        return ", ".join(parts)
    
    def get_map_link(self):
        """Generate Google Maps link"""
        if self.latitude and self.longitude:
            return f"https://www.google.com/maps?q={self.latitude},{self.longitude}"
        return None
    
    def get_formatted_created_at(self):
        return self.format_datetime(self.created_at)

class Statistics:
    """Statistics model"""
    
    def __init__(self, stats_data):
        self.total_orders = stats_data.get('total_orders', 0)
        self.total_revenue = stats_data.get('total_revenue', 0)
        self.total_customers = stats_data.get('total_customers', 0)
        self.avg_order_value = stats_data.get('avg_order_value', 0)
        self.pending_orders = stats_data.get('pending_orders', 0)
        self.completed_orders = stats_data.get('completed_orders', 0)
        self.cancelled_orders = stats_data.get('cancelled_orders', 0)
        self.today_orders = stats_data.get('today_orders', 0)
        self.today_revenue = stats_data.get('today_revenue', 0)
    
    def get_total_revenue_formatted(self):
        return f"₹{self.total_revenue:,.2f}"
    
    def get_today_revenue_formatted(self):
        return f"₹{self.today_revenue:,.2f}"
    
    def get_avg_order_value_formatted(self):
        return f"₹{self.avg_order_value:,.2f}"
    
    def get_completion_rate(self):
        if self.total_orders == 0:
            return 0
        return round((self.completed_orders / self.total_orders) * 100, 1)
