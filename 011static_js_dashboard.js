// admin_orders_management/static/js/dashboard.js

document.addEventListener('DOMContentLoaded', function() {
    // Initialize date range picker if exists
    const dateRangePicker = document.getElementById('dateRangePicker');
    if (dateRangePicker) {
        flatpickr(dateRangePicker, {
            mode: "range",
            dateFormat: "Y-m-d",
            maxDate: "today"
        });
    }

    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Initialize popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });

    // Load charts
    loadDashboardCharts();

    // Filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const filter = this.getAttribute('data-filter');
            updateDashboardFilter(filter);
        });
    });

    // Refresh button
    const refreshBtn = document.getElementById('refreshDashboard');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            refreshDashboard();
        });
    }

    // Real-time updates (simulated)
    if (window.ENABLE_REALTIME_UPDATES) {
        setInterval(checkForUpdates, 30000); // Check every 30 seconds
    }
});

function loadDashboardCharts() {
    // Revenue chart
    const revenueCtx = document.getElementById('revenueChart');
    if (revenueCtx) {
        fetch('/api/statistics/chart-data?type=daily_orders')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    new Chart(revenueCtx, {
                        type: 'line',
                        data: {
                            labels: data.labels,
                            datasets: data.datasets
                        },
                        options: {
                            responsive: true,
                            interaction: {
                                mode: 'index',
                                intersect: false,
                            },
                            scales: {
                                x: {
                                    grid: {
                                        display: false
                                    }
                                },
                                y: {
                                    type: 'linear',
                                    display: true,
                                    position: 'left',
                                    title: {
                                        display: true,
                                        text: 'Orders'
                                    }
                                },
                                y1: {
                                    type: 'linear',
                                    display: true,
                                    position: 'right',
                                    title: {
                                        display: true,
                                        text: 'Revenue (₹)'
                                    },
                                    grid: {
                                        drawOnChartArea: false,
                                    },
                                }
                            },
                            plugins: {
                                legend: {
                                    position: 'top',
                                },
                                tooltip: {
                                    callbacks: {
                                        label: function(context) {
                                            let label = context.dataset.label || '';
                                            if (label) {
                                                label += ': ';
                                            }
                                            if (context.datasetIndex === 1) {
                                                label += '₹' + context.parsed.y.toLocaleString('en-IN');
                                            } else {
                                                label += context.parsed.y;
                                            }
                                            return label;
                                        }
                                    }
                                }
                            }
                        }
                    });
                }
            });
    }

    // Status distribution chart
    const statusCtx = document.getElementById('statusChart');
    if (statusCtx) {
        fetch('/api/statistics/chart-data?type=status_distribution')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    new Chart(statusCtx, {
                        type: 'doughnut',
                        data: {
                            labels: data.labels,
                            datasets: data.datasets
                        },
                        options: {
                            responsive: true,
                            plugins: {
                                legend: {
                                    position: 'right',
                                }
                            }
                        }
                    });
                }
            });
    }

    // Top items chart
    const itemsCtx = document.getElementById('topItemsChart');
    if (itemsCtx) {
        fetch('/api/statistics/chart-data?type=top_items')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    new Chart(itemsCtx, {
                        type: 'bar',
                        data: {
                            labels: data.labels,
                            datasets: data.datasets
                        },
                        options: {
                            responsive: true,
                            indexAxis: 'y',
                            plugins: {
                                legend: {
                                    display: false
                                }
                            },
                            scales: {
                                x: {
                                    beginAtZero: true
                                }
                            }
                        }
                    });
                }
            });
    }
}

function updateDashboardFilter(filter) {
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // Show loading
    const dashboardContent = document.getElementById('dashboardContent');
    const originalContent = dashboardContent.innerHTML;
    dashboardContent.innerHTML = `
        <div class="text-center py-5">
            <div class="loading-spinner"></div>
            <p class="mt-3">Loading data...</p>
        </div>
    `;

    // Fetch updated data
    fetch(`/dashboard?filter=${filter}`)
        .then(response => response.text())
        .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const newContent = doc.getElementById('dashboardContent').innerHTML;
            dashboardContent.innerHTML = newContent;
            
            // Reinitialize charts
            loadDashboardCharts();
            
            // Show success message
            showToast('Filter applied successfully', 'success');
        })
        .catch(error => {
            dashboardContent.innerHTML = originalContent;
            showToast('Error updating filter', 'error');
            console.error('Error:', error);
        });
}

function refreshDashboard() {
    const refreshBtn = document.getElementById('refreshDashboard');
    const originalHTML = refreshBtn.innerHTML;
    refreshBtn.innerHTML = '<span class="loading-spinner"></span> Refreshing...';
    refreshBtn.disabled = true;

    // Reload the page after a short delay
    setTimeout(() => {
        window.location.reload();
    }, 1000);
}

function checkForUpdates() {
    fetch('/api/dashboard/updates')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.updates > 0) {
                showNotification(`New updates available: ${data.updates}`, 'info');
                
                // Update counters
                if (data.today_orders !== undefined) {
                    const counter = document.getElementById('todayOrdersCounter');
                    if (counter) {
                        counter.textContent = data.today_orders;
                        animateCounterUpdate(counter);
                    }
                }
            }
        })
        .catch(error => console.error('Update check failed:', error));
}

function animateCounterUpdate(element) {
    element.classList.add('counter-update');
    setTimeout(() => {
        element.classList.remove('counter-update');
    }, 1000);
}

function showToast(message, type = 'info') {
    // Create toast container if not exists
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'position-fixed bottom-0 end-0 p-3';
        toastContainer.style.zIndex = '1050';
        document.body.appendChild(toastContainer);
    }

    // Create toast
    const toastId = 'toast-' + Date.now();
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `toast align-items-center text-bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;

    toastContainer.appendChild(toast);

    // Show toast
    const bsToast = new bootstrap.Toast(toast, {
        autohide: true,
        delay: 3000
    });
    bsToast.show();

    // Remove after hide
    toast.addEventListener('hidden.bs.toast', function () {
        toast.remove();
    });
}

function showNotification(message, type = 'info') {
    // Check if browser supports notifications
    if (!("Notification" in window)) {
        console.log("This browser does not support desktop notification");
        return;
    }

    // Check if permission is already granted
    if (Notification.permission === "granted") {
        createNotification(message, type);
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                createNotification(message, type);
            }
        });
    }
}

function createNotification(message, type) {
    const icon = type === 'success' ? '/static/images/success.png' : 
                 type === 'error' ? '/static/images/error.png' : 
                 '/static/images/info.png';

    const notification = new Notification('Admin Dashboard', {
        body: message,
        icon: icon
    });

    notification.onclick = function() {
        window.focus();
        this.close();
    };
}

// Export functions for use in other scripts
window.dashboardUtils = {
    showToast,
    showNotification,
    refreshDashboard
};