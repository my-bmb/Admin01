// admin_orders_management/static/js/stats.js

document.addEventListener('DOMContentLoaded', function() {
    // Initialize date pickers
    initializeDatePickers();
    
    // Load initial charts
    loadStatisticsCharts();
    
    // Initialize period selector
    initializePeriodSelector();
    
    // Initialize refresh button
    document.getElementById('refreshStatsBtn')?.addEventListener('click', refreshStatistics);
    
    // Initialize export buttons
    document.getElementById('exportStatsBtn')?.addEventListener('click', exportStatistics);
    document.getElementById('printStatsBtn')?.addEventListener('click', printStatistics);
});

function initializeDatePickers() {
    // Start date picker
    const startDatePicker = document.getElementById('startDate');
    if (startDatePicker) {
        flatpickr(startDatePicker, {
            dateFormat: "Y-m-d",
            maxDate: "today",
            onChange: function(selectedDates, dateStr) {
                updateDateRange();
            }
        });
    }
    
    // End date picker
    const endDatePicker = document.getElementById('endDate');
    if (endDatePicker) {
        flatpickr(endDatePicker, {
            dateFormat: "Y-m-d",
            maxDate: "today",
            onChange: function(selectedDates, dateStr) {
                updateDateRange();
            }
        });
    }
    
    // Date range picker (alternative)
    const dateRangePicker = document.getElementById('dateRangePicker');
    if (dateRangePicker) {
        flatpickr(dateRangePicker, {
            mode: "range",
            dateFormat: "Y-m-d",
            maxDate: "today",
            onChange: function(selectedDates, dateStr) {
                const dates = dateStr.split(" to ");
                if (dates.length === 2) {
                    document.getElementById('startDate').value = dates[0];
                    document.getElementById('endDate').value = dates[1];
                    updateDateRange();
                }
            }
        });
    }
}

function initializePeriodSelector() {
    const periodSelect = document.getElementById('periodSelect');
    if (periodSelect) {
        periodSelect.addEventListener('change', function() {
            const period = this.value;
            
            if (period === 'custom') {
                // Show custom date inputs
                document.getElementById('customDateRange').classList.remove('d-none');
                return;
            } else {
                // Hide custom date inputs
                document.getElementById('customDateRange').classList.add('d-none');
            }
            
            // Update URL with new period
            const url = new URL(window.location.href);
            url.searchParams.set('period', period);
            url.searchParams.delete('start_date');
            url.searchParams.delete('end_date');
            window.location.href = url.toString();
        });
    }
}

function updateDateRange() {
    const startDate = document.getElementById('startDate')?.value;
    const endDate = document.getElementById('endDate')?.value;
    
    if (startDate && endDate) {
        const url = new URL(window.location.href);
        url.searchParams.set('period', 'custom');
        url.searchParams.set('start_date', startDate);
        url.searchParams.set('end_date', endDate);
        window.location.href = url.toString();
    }
}

function loadStatisticsCharts() {
    // Revenue Trend Chart
    const revenueCtx = document.getElementById('revenueTrendChart');
    if (revenueCtx) {
        loadRevenueTrendChart(revenueCtx);
    }
    
    // Orders Over Time Chart
    const ordersCtx = document.getElementById('ordersOverTimeChart');
    if (ordersCtx) {
        loadOrdersOverTimeChart(ordersCtx);
    }
    
    // Payment Methods Chart
    const paymentCtx = document.getElementById('paymentMethodsChart');
    if (paymentCtx) {
        loadPaymentMethodsChart(paymentCtx);
    }
    
    // Category Distribution Chart
    const categoryCtx = document.getElementById('categoryDistributionChart');
    if (categoryCtx) {
        loadCategoryDistributionChart(categoryCtx);
    }
    
    // Hourly Distribution Chart
    const hourlyCtx = document.getElementById('hourlyDistributionChart');
    if (hourlyCtx) {
        loadHourlyDistributionChart(hourlyCtx);
    }
    
    // Customer Acquisition Chart
    const customerCtx = document.getElementById('customerAcquisitionChart');
    if (customerCtx) {
        loadCustomerAcquisitionChart(customerCtx);
    }
}

function loadRevenueTrendChart(ctx) {
    fetch('/api/statistics/chart-data?type=daily_orders')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: data.labels,
                        datasets: [{
                            label: 'Revenue (₹)',
                            data: data.datasets[1].data,
                            borderColor: 'rgb(54, 162, 235)',
                            backgroundColor: 'rgba(54, 162, 235, 0.2)',
                            tension: 0.3,
                            fill: true
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: {
                                position: 'top',
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return `Revenue: ₹${context.parsed.y.toLocaleString('en-IN')}`;
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: function(value) {
                                        return '₹' + value.toLocaleString('en-IN');
                                    }
                                }
                            }
                        }
                    }
                });
            }
        });
}

function loadOrdersOverTimeChart(ctx) {
    fetch('/api/statistics/chart-data?type=daily_orders')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: data.labels,
                        datasets: [{
                            label: 'Orders',
                            data: data.datasets[0].data,
                            backgroundColor: 'rgba(75, 192, 192, 0.6)',
                            borderColor: 'rgb(75, 192, 192)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: {
                                position: 'top',
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    stepSize: 1
                                }
                            }
                        }
                    }
                });
            }
        });
}

function loadPaymentMethodsChart(ctx) {
    fetch('/api/statistics/chart-data?type=payment_methods')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const paymentColors = {
                    'COD': 'rgb(255, 99, 132)',
                    'Online': 'rgb(54, 162, 235)',
                    'Card': 'rgb(255, 205, 86)',
                    'Wallet': 'rgb(75, 192, 192)',
                    'UPI': 'rgb(153, 102, 255)'
                };
                
                new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: data.labels,
                        datasets: [{
                            data: data.datasets[0].data,
                            backgroundColor: data.labels.map(label => 
                                paymentColors[label] || 'rgb(201, 203, 207)'
                            )
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: {
                                position: 'right',
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const label = context.label || '';
                                        const value = context.raw || 0;
                                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                        const percentage = Math.round((value / total) * 100);
                                        return `${label}: ${value} (${percentage}%)`;
                                    }
                                }
                            }
                        }
                    }
                });
            } else {
                // Load from page data if API not available
                loadPaymentMethodsFromPage(ctx);
            }
        })
        .catch(() => {
            loadPaymentMethodsFromPage(ctx);
        });
}

function loadPaymentMethodsFromPage(ctx) {
    const paymentData = JSON.parse(document.getElementById('paymentMethodsData')?.textContent || '{}');
    if (paymentData.labels && paymentData.data) {
        new Chart(ctx, {
            type: 'doughnut',
            data: paymentData,
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
}

function loadCategoryDistributionChart(ctx) {
    const categoryData = JSON.parse(document.getElementById('categoryData')?.textContent || '{}');
    if (categoryData.labels && categoryData.data) {
        new Chart(ctx, {
            type: 'polarArea',
            data: categoryData,
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right',
                    }
                },
                scales: {
                    r: {
                        ticks: {
                            display: false
                        }
                    }
                }
            }
        });
    }
}

function loadHourlyDistributionChart(ctx) {
    fetch('/api/statistics/hourly-data')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: Array.from({length: 24}, (_, i) => `${i}:00`),
                        datasets: [{
                            label: 'Orders',
                            data: data.hourly_data,
                            borderColor: 'rgb(255, 99, 132)',
                            backgroundColor: 'rgba(255, 99, 132, 0.2)',
                            tension: 0.3,
                            fill: true
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: {
                                display: false
                            }
                        },
                        scales: {
                            x: {
                                title: {
                                    display: true,
                                    text: 'Hour of Day'
                                }
                            },
                            y: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'Number of Orders'
                                }
                            }
                        }
                    }
                });
            }
        })
        .catch(() => {
            // Generate sample data if API fails
            const sampleData = Array.from({length: 24}, () => Math.floor(Math.random() * 20) + 5);
            sampleData[12] = 35; // Peak at noon
            sampleData[19] = 30; // Peak at evening
            
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: Array.from({length: 24}, (_, i) => `${i}:00`),
                    datasets: [{
                        label: 'Orders (Sample)',
                        data: sampleData,
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        tension: 0.3,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });
        });
}

function loadCustomerAcquisitionChart(ctx) {
    fetch('/api/statistics/customer-data')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: data.labels,
                        datasets: [
                            {
                                label: 'New Customers',
                                data: data.new_customers,
                                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                                borderColor: 'rgb(54, 162, 235)',
                                borderWidth: 1
                            },
                            {
                                label: 'Repeat Customers',
                                data: data.repeat_customers,
                                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                                borderColor: 'rgb(75, 192, 192)',
                                borderWidth: 1
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: {
                                position: 'top',
                            }
                        },
                        scales: {
                            x: {
                                stacked: true,
                            },
                            y: {
                                stacked: true,
                                beginAtZero: true
                            }
                        }
                    }
                });
            }
        })
        .catch(() => {
            // Sample data
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const newCustomers = months.map(() => Math.floor(Math.random() * 50) + 20);
            const repeatCustomers = months.map(() => Math.floor(Math.random() * 100) + 50);
            
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: months,
                    datasets: [
                        {
                            label: 'New Customers (Sample)',
                            data: newCustomers,
                            backgroundColor: 'rgba(54, 162, 235, 0.6)',
                            borderColor: 'rgb(54, 162, 235)',
                            borderWidth: 1
                        },
                        {
                            label: 'Repeat Customers (Sample)',
                            data: repeatCustomers,
                            backgroundColor: 'rgba(75, 192, 192, 0.6)',
                            borderColor: 'rgb(75, 192, 192)',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'top',
                        }
                    },
                    scales: {
                        x: {
                            stacked: true,
                        },
                        y: {
                            stacked: true,
                            beginAtZero: true
                        }
                    }
                }
            });
        });
}

function refreshStatistics() {
    const refreshBtn = document.getElementById('refreshStatsBtn');
    const originalHTML = refreshBtn.innerHTML;
    
    refreshBtn.innerHTML = '<span class="loading-spinner"></span> Refreshing...';
    refreshBtn.disabled = true;
    
    // Destroy existing charts
    Chart.instances.forEach(chart => chart.destroy());
    
    // Reload charts after a short delay
    setTimeout(() => {
        loadStatisticsCharts();
        refreshBtn.innerHTML = originalHTML;
        refreshBtn.disabled = false;
        
        showToast('Statistics refreshed successfully', 'success');
    }, 1000);
}

function exportStatistics() {
    // Get current date range
    const startDate = document.getElementById('startDate')?.value || '';
    const endDate = document.getElementById('endDate')?.value || '';
    const period = document.getElementById('periodSelect')?.value || 'week';
    
    // Build export URL
    let url = '/statistics/export?';
    const params = new URLSearchParams();
    
    if (period === 'custom' && startDate && endDate) {
        params.set('start_date', startDate);
        params.set('end_date', endDate);
    } else {
        params.set('period', period);
    }
    
    url += params.toString();
    
    // Trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = `statistics_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    showToast('Export started. Check your downloads.', 'success');
}

function printStatistics() {
    // Show print dialog
    window.print();
}

// Utility function to show toast notifications
function showToast(message, type = 'info') {
    // Check if toast container exists
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

// Make functions available globally
window.statsUtils = {
    refreshStatistics,
    exportStatistics,
    printStatistics,
    showToast
};