# admin_orders_management/config.py
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Application configuration"""
    
    # Flask configuration
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # Session configuration
    SESSION_TYPE = 'filesystem'
    SESSION_PERMANENT = False
    SESSION_USE_SIGNER = True
    PERMANENT_SESSION_LIFETIME = 3600  # 1 hour
    
    # Upload configuration
    UPLOAD_FOLDER = 'static/uploads'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    
    # Pagination
    ITEMS_PER_PAGE = 20
    
    # Cloudinary folders
    CLOUDINARY_SERVICES_FOLDER = 'services'
    CLOUDINARY_MENU_FOLDER = 'menu_items'
    CLOUDINARY_PROFILE_FOLDER = 'profile_pics'
    CLOUDINARY_ORDERS_FOLDER = 'order_docs'
    
    # Application settings
    APP_NAME = 'Bite Me Buddy Admin'
    APP_VERSION = '1.0.0'
    TIMEZONE = 'Asia/Kolkata'
    
    # Feature flags
    ENABLE_EMAIL_NOTIFICATIONS = False
    ENABLE_SMS_NOTIFICATIONS = False
    ENABLE_PUSH_NOTIFICATIONS = False
    
    # Chart.js colors
    CHART_COLORS = {
        'primary': '#007bff',
        'success': '#28a745',
        'info': '#17a2b8',
        'warning': '#ffc107',
        'danger': '#dc3545',
        'secondary': '#6c757d',
        'light': '#f8f9fa',
        'dark': '#343a40'
    }
    
    # Order status configuration
    ORDER_STATUSES = {
        'pending': {
            'name': 'Pending',
            'color': '#ffc107',
            'icon': 'clock'
        },
        'processing': {
            'name': 'Processing',
            'color': '#17a2b8',
            'icon': 'cogs'
        },
        'completed': {
            'name': 'Completed',
            'color': '#28a745',
            'icon': 'check-circle'
        },
        'cancelled': {
            'name': 'Cancelled',
            'color': '#dc3545',
            'icon': 'times-circle'
        },
        'delivered': {
            'name': 'Delivered',
            'color': '#20c997',
            'icon': 'truck'
        }
    }
    
    # Payment status configuration
    PAYMENT_STATUSES = {
        'pending': {
            'name': 'Pending',
            'color': '#ffc107',
            'icon': 'clock'
        },
        'completed': {
            'name': 'Completed',
            'color': '#28a745',
            'icon': 'check-circle'
        },
        'failed': {
            'name': 'Failed',
            'color': '#dc3545',
            'icon': 'times-circle'
        },
        'refunded': {
            'name': 'Refunded',
            'color': '#6c757d',
            'icon': 'undo'
        },
        'cancelled': {
            'name': 'Cancelled',
            'color': '#dc3545',
            'icon': 'ban'
        }
    }