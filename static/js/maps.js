// admin_orders_management/static/js/maps.js

/**
 * Maps Utility Functions
 * STRICT RULE: NO Google Maps API Key used anywhere
 * Only generates clickable Google Maps links using latitude & longitude
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all map links on page load
    initializeMapLinks();
    
    // Listen for dynamic content (modals, etc.)
    observeDynamicContent();
});

function initializeMapLinks() {
    // Find all elements with latitude and longitude data attributes
    const mapElements = document.querySelectorAll('[data-latitude][data-longitude]');
    
    mapElements.forEach(element => {
        createMapLink(element);
    });
    
    // Also check for elements with address data
    const addressElements = document.querySelectorAll('.address-item, .customer-address');
    addressElements.forEach(element => {
        const lat = element.getAttribute('data-lat') || 
                   element.querySelector('[data-latitude]')?.getAttribute('data-latitude');
        const lng = element.getAttribute('data-lng') || 
                   element.querySelector('[data-longitude]')?.getAttribute('data-longitude');
        
        if (lat && lng) {
            createMapLinkForElement(element, lat, lng);
        }
    });
}

function observeDynamicContent() {
    // Use MutationObserver to watch for dynamic content
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) { // Element node
                        // Check the node itself
                        if (node.hasAttribute && 
                            node.hasAttribute('data-latitude') && 
                            node.hasAttribute('data-longitude')) {
                            createMapLink(node);
                        }
                        
                        // Check child elements
                        const mapElements = node.querySelectorAll
                            ? node.querySelectorAll('[data-latitude][data-longitude]')
                            : [];
                        
                        mapElements.forEach(element => {
                            createMapLink(element);
                        });
                        
                        // Check for address elements
                        const addressElements = node.querySelectorAll
                            ? node.querySelectorAll('.address-item, .customer-address')
                            : [];
                        
                        addressElements.forEach(element => {
                            const lat = element.getAttribute('data-lat') || 
                                       element.querySelector('[data-latitude]')?.getAttribute('data-latitude');
                            const lng = element.getAttribute('data-lng') || 
                                       element.querySelector('[data-longitude]')?.getAttribute('data-longitude');
                            
                            if (lat && lng) {
                                createMapLinkForElement(element, lat, lng);
                            }
                        });
                    }
                });
            }
        });
    });
    
    // Start observing the document body for added nodes
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

function createMapLink(element) {
    const lat = element.getAttribute('data-latitude');
    const lng = element.getAttribute('data-longitude');
    const address = element.getAttribute('data-address') || '';
    const zoom = element.getAttribute('data-zoom') || 15;
    
    if (!isValidCoordinates(lat, lng)) {
        console.warn('Invalid coordinates:', lat, lng);
        return;
    }
    
    const mapLink = generateGoogleMapsLink(lat, lng, address, zoom);
    
    // Check if element already has a map link
    if (element.querySelector('.map-link')) {
        return;
    }
    
    // Create link element
    const link = document.createElement('a');
    link.href = mapLink;
    link.className = 'map-link';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.innerHTML = `
        <i class="fas fa-map-marker-alt"></i>
        <span>View on Google Maps</span>
    `;
    
    // Add click event for analytics
    link.addEventListener('click', function(e) {
        trackMapView(lat, lng, address);
    });
    
    // Append to element
    if (element.classList.contains('map-link-container')) {
        element.appendChild(link);
    } else {
        // Create container if needed
        const container = document.createElement('div');
        container.className = 'map-link-container mt-2';
        container.appendChild(link);
        element.appendChild(container);
    }
}

function createMapLinkForElement(element, lat, lng) {
    if (!isValidCoordinates(lat, lng)) {
        return;
    }
    
    const address = element.getAttribute('data-address') || 
                   element.querySelector('.address-text')?.textContent || '';
    const zoom = element.getAttribute('data-zoom') || 15;
    
    const mapLink = generateGoogleMapsLink(lat, lng, address, zoom);
    
    // Check if element already has a map link
    if (element.querySelector('.map-link')) {
        return;
    }
    
    // Create link
    const link = document.createElement('a');
    link.href = mapLink;
    link.className = 'map-link btn btn-sm btn-outline-primary mt-2';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.innerHTML = `
        <i class="fas fa-map-marker-alt"></i>
        View on Map
    `;
    
    link.addEventListener('click', function(e) {
        trackMapView(lat, lng, address);
    });
    
    // Find appropriate place to insert
    const actionsDiv = element.querySelector('.address-actions') || 
                      element.querySelector('.text-end') || 
                      element;
    
    if (actionsDiv === element) {
        const div = document.createElement('div');
        div.className = 'address-actions mt-2';
        div.appendChild(link);
        element.appendChild(div);
    } else {
        actionsDiv.appendChild(link);
    }
}

function generateGoogleMapsLink(latitude, longitude, address = '', zoom = 15) {
    /**
     * Generate Google Maps link WITHOUT API key
     * Uses standard Google Maps URL format
     */
    
    // Clean coordinates
    const lat = parseFloat(latitude).toFixed(6);
    const lng = parseFloat(longitude).toFixed(6);
    
    // Base Google Maps URL
    let url = `https://www.google.com/maps?q=${lat},${lng}`;
    
    // Add zoom parameter
    if (zoom) {
        url += `&z=${zoom}`;
    }
    
    // Add address as label if provided
    if (address && address.trim()) {
        const encodedAddress = encodeURIComponent(address.trim());
        url += `&layer=c&cbll=${lat},${lng}&cbp=`;
    }
    
    return url;
}

function generateDirectionsLink(latitude, longitude, fromAddress = '') {
    /**
     * Generate Google Maps directions link
     */
    const lat = parseFloat(latitude).toFixed(6);
    const lng = parseFloat(longitude).toFixed(6);
    
    let url = `https://www.google.com/maps/dir/?api=1`;
    
    if (fromAddress) {
        const encodedFrom = encodeURIComponent(fromAddress.trim());
        url += `&origin=${encodedFrom}`;
    }
    
    url += `&destination=${lat},${lng}`;
    url += `&travelmode=driving`;
    
    return url;
}

function generateStreetViewLink(latitude, longitude) {
    /**
     * Generate Google Street View link
     */
    const lat = parseFloat(latitude).toFixed(6);
    const lng = parseFloat(longitude).toFixed(6);
    
    return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
}

function isValidCoordinates(latitude, longitude) {
    /**
     * Validate latitude and longitude coordinates
     */
    if (!latitude || !longitude) {
        return false;
    }
    
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    if (isNaN(lat) || isNaN(lng)) {
        return false;
    }
    
    // Validate latitude range (-90 to 90)
    if (lat < -90 || lat > 90) {
        return false;
    }
    
    // Validate longitude range (-180 to 180)
    if (lng < -180 || lng > 180) {
        return false;
    }
    
    return true;
}

function formatCoordinates(latitude, longitude, format = 'decimal') {
    /**
     * Format coordinates in different formats
     */
    if (!isValidCoordinates(latitude, longitude)) {
        return null;
    }
    
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    switch (format) {
        case 'dms': // Degrees, Minutes, Seconds
            return {
                latitude: decimalToDMS(lat, true),
                longitude: decimalToDMS(lng, false)
            };
        
        case 'url':
            return `${lat.toFixed(6)},${lng.toFixed(6)}`;
        
        case 'array':
            return [lat, lng];
        
        case 'object':
            return { latitude: lat, longitude: lng };
        
        case 'decimal':
        default:
            return {
                latitude: lat.toFixed(6),
                longitude: lng.toFixed(6)
            };
    }
}

function decimalToDMS(decimal, isLatitude) {
    /**
     * Convert decimal coordinates to Degrees, Minutes, Seconds format
     */
    const absDecimal = Math.abs(decimal);
    const degrees = Math.floor(absDecimal);
    const minutesDecimal = (absDecimal - degrees) * 60;
    const minutes = Math.floor(minutesDecimal);
    const seconds = ((minutesDecimal - minutes) * 60).toFixed(2);
    
    const direction = isLatitude
        ? (decimal >= 0 ? 'N' : 'S')
        : (decimal >= 0 ? 'E' : 'W');
    
    return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
}

function getDistance(lat1, lon1, lat2, lon2, unit = 'K') {
    /**
     * Calculate distance between two coordinates using Haversine formula
     * Units: K = kilometers, M = miles, N = nautical miles
     */
    if (!isValidCoordinates(lat1, lon1) || !isValidCoordinates(lat2, lon2)) {
        return null;
    }
    
    const R = {
        'K': 6371, // kilometers
        'M': 3958.8, // miles
        'N': 3440.1 // nautical miles
    }[unit] || 6371;
    
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance.toFixed(2);
}

function toRad(degrees) {
    return degrees * (Math.PI / 180);
}

function trackMapView(latitude, longitude, address = '') {
    /**
     * Track map view events (for analytics)
     */
    const eventData = {
        latitude: latitude,
        longitude: longitude,
        address: address,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        referrer: document.referrer
    };
    
    // Send to analytics endpoint
    fetch('/api/analytics/map-view', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData)
    }).catch(error => {
        // Silent fail - analytics is not critical
        console.debug('Analytics error:', error);
    });
    
    // Also log to console in development
    if (window.DEBUG_MODE) {
        console.log('Map view tracked:', eventData);
    }
}

function copyCoordinates(latitude, longitude) {
    /**
     * Copy coordinates to clipboard
     */
    const coords = `${latitude}, ${longitude}`;
    
    navigator.clipboard.writeText(coords).then(() => {
        showMapToast('Coordinates copied to clipboard: ' + coords, 'success');
    }).catch(err => {
        showMapToast('Failed to copy coordinates', 'error');
        console.error('Clipboard error:', err);
    });
}

function showMapToast(message, type = 'info') {
    /**
     * Show toast notification for map-related actions
     */
    // Use existing toast function if available
    if (typeof showToast === 'function') {
        showToast(message, type);
        return;
    }
    
    // Fallback toast implementation
    const toastId = 'map-toast-' + Date.now();
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `toast align-items-center text-bg-${type} border-0 position-fixed bottom-0 end-0 m-3`;
    toast.style.zIndex = '1060';
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" 
                    onclick="document.getElementById('${toastId}').remove()"></button>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (document.getElementById(toastId)) {
            document.getElementById(toastId).remove();
        }
    }, 3000);
}

// Export functions for use in other scripts
window.maps = {
    generateGoogleMapsLink,
    generateDirectionsLink,
    generateStreetViewLink,
    isValidCoordinates,
    formatCoordinates,
    getDistance,
    copyCoordinates,
    trackMapView,
    showMapToast
};

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMapLinks);
} else {
    initializeMapLinks();
}
