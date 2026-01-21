// admin_orders_management/static/js/orders.js

document.addEventListener('DOMContentLoaded', function() {
    // Initialize modals
    const orderModal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));
    const paymentModal = new bootstrap.Modal(document.getElementById('paymentDetailsModal'));
    const customerModal = new bootstrap.Modal(document.getElementById('customerDetailsModal'));

    // View order details buttons
    document.querySelectorAll('.view-order-btn').forEach(button => {
        button.addEventListener('click', function() {
            const orderId = this.getAttribute('data-order-id');
            loadOrderDetails(orderId, orderModal);
        });
    });

    // View payment details buttons
    document.querySelectorAll('.view-payment-btn').forEach(button => {
        button.addEventListener('click', function() {
            const orderId = this.getAttribute('data-order-id');
            loadPaymentDetails(orderId, paymentModal);
        });
    });

    // View customer details buttons
    document.querySelectorAll('.view-customer-btn').forEach(button => {
        button.addEventListener('click', function() {
            const customerId = this.getAttribute('data-customer-id');
            loadCustomerDetails(customerId, customerModal);
        });
    });

    // Update order status buttons
    document.querySelectorAll('.update-status-btn').forEach(button => {
        button.addEventListener('click', function() {
            const orderId = this.getAttribute('data-order-id');
            showStatusUpdateModal(orderId);
        });
    });

    // Initialize filters
    initializeFilters();

    // Initialize search
    initializeSearch();

    // Initialize sort
    initializeSort();

    // Export buttons
    document.getElementById('exportOrdersBtn')?.addEventListener('click', exportOrders);
    document.getElementById('printOrdersBtn')?.addEventListener('click', printOrders);

    // Bulk actions
    document.getElementById('bulkActionSelect')?.addEventListener('change', handleBulkAction);
    document.querySelectorAll('.order-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', updateBulkActionState);
    });
});

function loadOrderDetails(orderId, modal) {
    // Show loading
    const modalBody = document.querySelector('#orderDetailsModal .modal-body');
    modalBody.innerHTML = `
        <div class="text-center py-5">
            <div class="loading-spinner"></div>
            <p class="mt-3">Loading order details...</p>
        </div>
    `;

    // Fetch order details
    fetch(`/api/orders/${orderId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                renderOrderDetails(data, modalBody);
                modal.show();
            } else {
                modalBody.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle"></i>
                        ${data.message}
                    </div>
                `;
            }
        })
        .catch(error => {
            modalBody.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle"></i>
                    Error loading order details: ${error.message}
                </div>
            `;
        });
}

function renderOrderDetails(data, container) {
    const order = data.order;
    const items = data.order_items || [];
    const customer = data.customer;

    let html = `
        <div class="order-details">
            <!-- Order Header -->
            <div class="row mb-4">
                <div class="col-md-6">
                    <h5>Order #${order.order_id}</h5>
                    <p class="text-muted mb-0">
                        <i class="fas fa-calendar-alt"></i> ${order.order_date_formatted}
                    </p>
                </div>
                <div class="col-md-6 text-end">
                    <span class="status-badge ${order.status}">
                        <i class="fas fa-${getStatusIcon(order.status)}"></i>
                        ${order.status.toUpperCase()}
                    </span>
                </div>
            </div>

            <!-- Customer Info -->
            <div class="card mb-3">
                <div class="card-header">
                    <h6 class="mb-0"><i class="fas fa-user"></i> Customer Information</h6>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <p><strong>Name:</strong> ${order.user_name || 'N/A'}</p>
                            <p><strong>Phone:</strong> ${order.user_phone || 'N/A'}</p>
                            <p><strong>Email:</strong> ${order.user_email || 'N/A'}</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>Delivery Location:</strong></p>
                            <p class="text-muted">${order.delivery_location || 'Not specified'}</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Order Items -->
            <div class="card mb-3">
                <div class="card-header">
                    <h6 class="mb-0"><i class="fas fa-shopping-cart"></i> Order Items (${items.length})</h6>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover mb-0">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Type</th>
                                    <th class="text-center">Qty</th>
                                    <th class="text-end">Price</th>
                                    <th class="text-end">Total</th>
                                </tr>
                            </thead>
                            <tbody>
    `;

    items.forEach(item => {
        html += `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${item.item_photo || getDefaultImage(item.item_type)}" 
                             alt="${item.item_name}" 
                             class="order-item-image me-3">
                        <div>
                            <strong>${item.item_name}</strong>
                            ${item.item_description ? `<small class="d-block text-muted">${item.item_description}</small>` : ''}
                        </div>
                    </div>
                </td>
                <td>
                    <span class="badge bg-secondary">${item.item_type}</span>
                </td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-end">${item.price_formatted || formatCurrency(item.price)}</td>
                <td class="text-end">${item.total_formatted || formatCurrency(item.total)}</td>
            </tr>
        `;
    });

    html += `
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colspan="4" class="text-end"><strong>Total Amount:</strong></td>
                                    <td class="text-end"><strong>${order.total_amount_formatted || formatCurrency(order.total_amount)}</strong></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Order Timeline -->
            <div class="card">
                <div class="card-header">
                    <h6 class="mb-0"><i class="fas fa-history"></i> Order Timeline</h6>
                </div>
                <div class="card-body">
                    <div class="timeline">
                        <div class="timeline-item ${order.status === 'pending' ? 'active' : ''}">
                            <div class="timeline-marker"></div>
                            <div class="timeline-content">
                                <h6>Order Placed</h6>
                                <p class="text-muted mb-0">${order.order_date_formatted}</p>
                            </div>
                        </div>
                        
                        <div class="timeline-item ${order.status === 'processing' ? 'active' : ''}">
                            <div class="timeline-marker"></div>
                            <div class="timeline-content">
                                <h6>Processing</h6>
                                <p class="text-muted mb-0">Order is being processed</p>
                            </div>
                        </div>
                        
                        ${order.delivery_date_formatted ? `
                        <div class="timeline-item ${order.status === 'delivered' ? 'active' : ''}">
                            <div class="timeline-marker"></div>
                            <div class="timeline-content">
                                <h6>Delivered</h6>
                                <p class="text-muted mb-0">${order.delivery_date_formatted}</p>
                            </div>
                        </div>
                        ` : ''}
                        
                        ${order.status === 'cancelled' ? `
                        <div class="timeline-item active">
                            <div class="timeline-marker bg-danger"></div>
                            <div class="timeline-content">
                                <h6>Cancelled</h6>
                                <p class="text-muted mb-0">Order was cancelled</p>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>

            <!-- Notes -->
            ${order.notes ? `
            <div class="card mt-3">
                <div class="card-header">
                    <h6 class="mb-0"><i class="fas fa-sticky-note"></i> Notes</h6>
                </div>
                <div class="card-body">
                    <p class="mb-0">${order.notes}</p>
                </div>
            </div>
            ` : ''}
        </div>

        <!-- Action Buttons -->
        <div class="mt-3 d-flex gap-2">
            <button class="btn btn-outline-primary" onclick="printOrder(${order.order_id})">
                <i class="fas fa-print"></i> Print
            </button>
            ${order.status !== 'cancelled' && order.status !== 'delivered' ? `
            <button class="btn btn-outline-warning" onclick="showStatusUpdateModal(${order.order_id})">
                <i class="fas fa-edit"></i> Update Status
            </button>
            ` : ''}
            <button class="btn btn-outline-info" onclick="loadPaymentDetails(${order.order_id})">
                <i class="fas fa-credit-card"></i> Payment Details
            </button>
        </div>
    `;

    container.innerHTML = html;
}

function loadPaymentDetails(orderId, modal) {
    if (!modal) {
        modal = new bootstrap.Modal(document.getElementById('paymentDetailsModal'));
    }

    const modalBody = document.querySelector('#paymentDetailsModal .modal-body');
    modalBody.innerHTML = `
        <div class="text-center py-5">
            <div class="loading-spinner"></div>
            <p class="mt-3">Loading payment details...</p>
        </div>
    `;

    fetch(`/api/orders/${orderId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                renderPaymentDetails(data.order, modalBody);
                modal.show();
            } else {
                modalBody.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle"></i>
                        ${data.message}
                    </div>
                `;
            }
        })
        .catch(error => {
            modalBody.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle"></i>
                    Error loading payment details: ${error.message}
                </div>
            `;
        });
}

function renderPaymentDetails(payment, container) {
    let html = `
        <div class="payment-details">
            <div class="row mb-4">
                <div class="col-md-6">
                    <h5>Payment Details</h5>
                    <p class="text-muted mb-0">Order #${payment.order_id}</p>
                </div>
                <div class="col-md-6 text-end">
                    <span class="status-badge ${payment.payment_status || 'pending'}">
                        ${(payment.payment_status || 'pending').toUpperCase()}
                    </span>
                </div>
            </div>

            <div class="card">
                <div class="card-body">
                    <table class="table table-borderless">
                        <tr>
                            <th width="40%">Payment Amount:</th>
                            <td><strong>${payment.total_amount_formatted || formatCurrency(payment.total_amount)}</strong></td>
                        </tr>
                        <tr>
                            <th>Payment Mode:</th>
                            <td>${payment.payment_mode || 'N/A'}</td>
                        </tr>
                        <tr>
                            <th>Payment Status:</th>
                            <td>
                                <select id="paymentStatusSelect" class="form-select form-select-sm w-auto d-inline-block">
                                    <option value="pending" ${(payment.payment_status || 'pending') === 'pending' ? 'selected' : ''}>Pending</option>
                                    <option value="completed" ${(payment.payment_status || 'pending') === 'completed' ? 'selected' : ''}>Completed</option>
                                    <option value="failed" ${(payment.payment_status || 'pending') === 'failed' ? 'selected' : ''}>Failed</option>
                                    <option value="refunded" ${(payment.payment_status || 'pending') === 'refunded' ? 'selected' : ''}>Refunded</option>
                                    <option value="cancelled" ${(payment.payment_status || 'pending') === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <th>Transaction ID:</th>
                            <td>
                                <div class="input-group input-group-sm">
                                    <input type="text" 
                                           id="transactionIdInput" 
                                           class="form-control" 
                                           value="${payment.transaction_id || ''}" 
                                           placeholder="Enter transaction ID">
                                </div>
                            </td>
                        </tr>
                        ${payment.payment_date_formatted ? `
                        <tr>
                            <th>Payment Date:</th>
                            <td>${payment.payment_date_formatted}</td>
                        </tr>
                        ` : ''}
                        ${payment.razorpay_order_id ? `
                        <tr>
                            <th>Razorpay Order ID:</th>
                            <td><code>${payment.razorpay_order_id}</code></td>
                        </tr>
                        ` : ''}
                        ${payment.razorpay_payment_id ? `
                        <tr>
                            <th>Razorpay Payment ID:</th>
                            <td><code>${payment.razorpay_payment_id}</code></td>
                        </tr>
                        ` : ''}
                        ${payment.razorpay_signature ? `
                        <tr>
                            <th>Razorpay Signature:</th>
                            <td><code class="small">${payment.razorpay_signature.substring(0, 50)}...</code></td>
                        </tr>
                        ` : ''}
                    </table>

                    <div class="mt-4 d-flex gap-2">
                        <button class="btn btn-primary" onclick="updatePaymentStatus(${payment.order_id})">
                            <i class="fas fa-save"></i> Save Changes
                        </button>
                        <button class="btn btn-outline-secondary" data-bs-dismiss="modal">
                            <i class="fas fa-times"></i> Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

function loadCustomerDetails(customerId, modal) {
    const modalBody = document.querySelector('#customerDetailsModal .modal-body');
    modalBody.innerHTML = `
        <div class="text-center py-5">
            <div class="loading-spinner"></div>
            <p class="mt-3">Loading customer details...</p>
        </div>
    `;

    fetch(`/api/customers/${customerId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                renderCustomerDetails(data, modalBody);
                modal.show();
            } else {
                modalBody.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle"></i>
                        ${data.message}
                    </div>
                `;
            }
        })
        .catch(error => {
            modalBody.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle"></i>
                    Error loading customer details: ${error.message}
                </div>
            `;
        });
}

function renderCustomerDetails(data, container) {
    const customer = data.customer;
    const addresses = data.addresses || [];
    const ordersSummary = data.orders_summary || [];
    const recentOrders = data.recent_orders || [];

    let html = `
        <div class="customer-details">
            <!-- Customer Header -->
            <div class="row mb-4">
                <div class="col-md-8">
                    <h5>${customer.full_name || 'Customer'}</h5>
                    <p class="text-muted mb-0">
                        Customer ID: ${customer.id} | 
                        Joined: ${customer.created_at_formatted || 'N/A'}
                    </p>
                </div>
                <div class="col-md-4 text-end">
                    <img src="${customer.profile_pic || '/static/images/default.png'}" 
                         alt="${customer.full_name}" 
                         class="customer-avatar-lg rounded-circle">
                </div>
            </div>

            <!-- Contact Info -->
            <div class="card mb-3">
                <div class="card-header">
                    <h6 class="mb-0"><i class="fas fa-address-card"></i> Contact Information</h6>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <p><strong>Phone:</strong> ${customer.phone || 'N/A'}</p>
                            <p><strong>Email:</strong> ${customer.email || 'N/A'}</p>
                            <p><strong>Status:</strong> 
                                <span class="badge ${customer.is_active ? 'bg-success' : 'bg-danger'}">
                                    ${customer.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>Last Login:</strong> ${customer.last_login_formatted || 'Never'}</p>
                            <p><strong>Location:</strong> ${customer.location || 'Not specified'}</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Addresses -->
            ${addresses.length > 0 ? `
            <div class="card mb-3">
                <div class="card-header">
                    <h6 class="mb-0"><i class="fas fa-map-marker-alt"></i> Addresses (${addresses.length})</h6>
                </div>
                <div class="card-body">
                    ${addresses.map((addr, index) => `
                    <div class="address-item ${addr.is_default ? 'border-start border-primary border-3 ps-3' : ''} mb-3">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h6>${addr.full_name || 'Address'} ${addr.is_default ? '<span class="badge bg-primary ms-2">Default</span>' : ''}</h6>
                                <p class="mb-1">${addr.address_line1 || ''}</p>
                                ${addr.address_line2 ? `<p class="mb-1">${addr.address_line2}</p>` : ''}
                                ${addr.landmark ? `<p class="mb-1">Near ${addr.landmark}</p>` : ''}
                                <p class="mb-1">${addr.city}, ${addr.state} - ${addr.pincode}</p>
                                <p class="mb-0">Phone: ${addr.phone || customer.phone}</p>
                            </div>
                            ${addr.map_link ? `
                            <a href="${addr.map_link}" target="_blank" class="btn btn-sm btn-outline-primary">
                                <i class="fas fa-map"></i> View Map
                            </a>
                            ` : ''}
                        </div>
                    </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            <!-- Order Summary -->
            <div class="card mb-3">
                <div class="card-header">
                    <h6 class="mb-0"><i class="fas fa-shopping-bag"></i> Order Summary</h6>
                </div>
                <div class="card-body">
                    <div class="row text-center">
                        ${ordersSummary.map(summary => `
                        <div class="col">
                            <div class="stat-card p-3 rounded ${getStatusBadgeClass(summary.status)}">
                                <div class="stat-number">${summary.count || 0}</div>
                                <div class="stat-label">${summary.status || 'Total'}</div>
                                ${summary.total_amount ? `
                                <div class="stat-amount small mt-1">${formatCurrency(summary.total_amount)}</div>
                                ` : ''}
                            </div>
                        </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- Recent Orders -->
            ${recentOrders.length > 0 ? `
            <div class="card">
                <div class="card-header">
                    <h6 class="mb-0"><i class="fas fa-history"></i> Recent Orders (${recentOrders.length})</h6>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover mb-0">
                            <thead>
                                <tr>
                                    <th>Order ID</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${recentOrders.map(order => `
                                <tr>
                                    <td>#${order.order_id}</td>
                                    <td>${formatCurrency(order.total_amount)}</td>
                                    <td>
                                        <span class="status-badge ${order.status}">
                                            ${order.status}
                                        </span>
                                    </td>
                                    <td>${formatDate(order.order_date)}</td>
                                    <td>
                                        <button class="btn btn-sm btn-outline-primary" 
                                                onclick="loadOrderDetails(${order.order_id})">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                    </td>
                                </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            ` : ''}
        </div>
    `;

    container.innerHTML = html;
}

function showStatusUpdateModal(orderId) {
    const modal = new bootstrap.Modal(document.getElementById('statusUpdateModal'));
    const modalBody = document.querySelector('#statusUpdateModal .modal-body');
    
    modalBody.innerHTML = `
        <div class="text-center py-3">
            <div class="loading-spinner"></div>
            <p class="mt-3">Loading order information...</p>
        </div>
    `;

    fetch(`/api/orders/${orderId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                modalBody.innerHTML = `
                    <div class="status-update-form">
                        <h6>Update Order #${orderId} Status</h6>
                        <p class="text-muted">Current status: <strong>${data.order.status}</strong></p>
                        
                        <div class="mb-3">
                            <label for="newStatusSelect" class="form-label">New Status</label>
                            <select id="newStatusSelect" class="form-select">
                                <option value="pending" ${data.order.status === 'pending' ? 'selected' : ''}>Pending</option>
                                <option value="processing" ${data.order.status === 'processing' ? 'selected' : ''}>Processing</option>
                                <option value="completed" ${data.order.status === 'completed' ? 'selected' : ''}>Completed</option>
                                <option value="delivered" ${data.order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                                <option value="cancelled" ${data.order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                            </select>
                        </div>
                        
                        <div class="mb-3">
                            <label for="statusNotes" class="form-label">Notes (Optional)</label>
                            <textarea id="statusNotes" class="form-control" rows="3" 
                                      placeholder="Add any notes about this status change..."></textarea>
                        </div>
                        
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle"></i>
                            This action will be logged in the order history.
                        </div>
                        
                        <div class="d-flex gap-2">
                            <button class="btn btn-primary" onclick="updateOrderStatus(${orderId})">
                                <i class="fas fa-save"></i> Update Status
                            </button>
                            <button class="btn btn-outline-secondary" data-bs-dismiss="modal">
                                Cancel
                            </button>
                        </div>
                    </div>
                `;
                
                modal.show();
            }
        });
}

function updateOrderStatus(orderId) {
    const newStatus = document.getElementById('newStatusSelect').value;
    const notes = document.getElementById('statusNotes').value;
    
    fetch(`/api/orders/${orderId}/update-status`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            status: newStatus,
            notes: notes
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast(`Order status updated to ${newStatus}`, 'success');
            
            // Close modal
            bootstrap.Modal.getInstance(document.getElementById('statusUpdateModal')).hide();
            
            // Update status in table if on orders page
            const statusBadge = document.querySelector(`tr[data-order-id="${orderId}"] .status-badge`);
            if (statusBadge) {
                statusBadge.className = `status-badge ${newStatus}`;
                statusBadge.textContent = newStatus.toUpperCase();
            }
            
            // Reload page after a delay
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            showToast(data.message, 'error');
        }
    })
    .catch(error => {
        showToast('Error updating status: ' + error.message, 'error');
    });
}

function updatePaymentStatus(orderId) {
    const paymentStatus = document.getElementById('paymentStatusSelect').value;
    const transactionId = document.getElementById('transactionIdInput').value;
    
    fetch(`/api/orders/${orderId}/update-payment`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            payment_status: paymentStatus,
            transaction_id: transactionId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast(`Payment status updated to ${paymentStatus}`, 'success');
            
            // Close modal
            bootstrap.Modal.getInstance(document.getElementById('paymentDetailsModal')).hide();
            
            // Reload page after a delay
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            showToast(data.message, 'error');
        }
    })
    .catch(error => {
        showToast('Error updating payment status: ' + error.message, 'error');
    });
}

function initializeFilters() {
    const filterForm = document.getElementById('orderFilterForm');
    if (filterForm) {
        // Date picker
        const dateRange = document.getElementById('dateRange');
        if (dateRange) {
            flatpickr(dateRange, {
                mode: "range",
                dateFormat: "Y-m-d",
                onChange: function(selectedDates, dateStr) {
                    const dates = dateStr.split(" to ");
                    if (dates.length === 2) {
                        document.getElementById('startDate').value = dates[0];
                        document.getElementById('endDate').value = dates[1];
                    }
                }
            });
        }
        
        // Apply filter button
        document.getElementById('applyFilterBtn')?.addEventListener('click', function() {
            filterForm.submit();
        });
        
        // Clear filter button
        document.getElementById('clearFilterBtn')?.addEventListener('click', function() {
            window.location.href = window.location.pathname;
        });
    }
}

function initializeSearch() {
    const searchInput = document.getElementById('orderSearch');
    const searchBtn = document.getElementById('searchBtn');
    
    if (searchInput && searchBtn) {
        // Search on button click
        searchBtn.addEventListener('click', function() {
            performSearch();
        });
        
        // Search on Enter key
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
        
        // Real-time search (optional)
        if (window.ENABLE_REALTIME_SEARCH) {
            let searchTimeout;
            searchInput.addEventListener('input', function() {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(performSearch, 500);
            });
        }
    }
}

function performSearch() {
    const searchInput = document.getElementById('orderSearch');
    const searchTerm = searchInput.value.trim();
    
    if (searchTerm) {
        const url = new URL(window.location.href);
        url.searchParams.set('search', searchTerm);
        window.location.href = url.toString();
    }
}

function initializeSort() {
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            const url = new URL(window.location.href);
            url.searchParams.set('sort', this.value);
            window.location.href = url.toString();
        });
    }
}

function exportOrders() {
    // Get current filters
    const params = new URLSearchParams(window.location.search);
    
    // Add export parameter
    params.set('export', 'csv');
    
    // Create download link
    const url = `${window.location.pathname}?${params.toString()}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    showToast('Export started. Check your downloads.', 'success');
}

function printOrders() {
    window.print();
}

function printOrder(orderId) {
    const printWindow = window.open(`/orders/${orderId}/print`, '_blank');
    printWindow.focus();
}

function handleBulkAction() {
    const action = document.getElementById('bulkActionSelect').value;
    if (!action) return;
    
    const selectedOrders = getSelectedOrders();
    if (selectedOrders.length === 0) {
        showToast('Please select at least one order', 'warning');
        return;
    }
    
    if (action === 'delete') {
        if (confirm(`Are you sure you want to delete ${selectedOrders.length} order(s)?`)) {
            deleteOrders(selectedOrders);
        }
    } else if (action === 'export') {
        exportSelectedOrders(selectedOrders);
    } else {
        updateBulkStatus(selectedOrders, action);
    }
    
    // Reset select
    document.getElementById('bulkActionSelect').value = '';
}

function updateBulkActionState() {
    const selectedCount = document.querySelectorAll('.order-checkbox:checked').length;
    const bulkActions = document.getElementById('bulkActions');
    const selectedCountSpan = document.getElementById('selectedCount');
    
    if (selectedCountSpan) {
        selectedCountSpan.textContent = selectedCount;
    }
    
    if (bulkActions) {
        if (selectedCount > 0) {
            bulkActions.classList.remove('d-none');
        } else {
            bulkActions.classList.add('d-none');
        }
    }
}

function getSelectedOrders() {
    const selected = [];
    document.querySelectorAll('.order-checkbox:checked').forEach(checkbox => {
        selected.push(checkbox.value);
    });
    return selected;
}

function deleteOrders(orderIds) {
    fetch('/api/orders/bulk-delete', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ order_ids: orderIds })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast(`${orderIds.length} order(s) deleted successfully`, 'success');
            setTimeout(() => window.location.reload(), 1000);
        } else {
            showToast(data.message, 'error');
        }
    });
}

function exportSelectedOrders(orderIds) {
    const params = new URLSearchParams();
    params.set('export', 'csv');
    params.set('ids', orderIds.join(','));
    
    const url = `/orders/export?${params.toString()}`;
    window.open(url, '_blank');
}

function updateBulkStatus(orderIds, status) {
    fetch('/api/orders/bulk-update-status', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            order_ids: orderIds,
            status: status
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast(`Updated ${orderIds.length} order(s) to ${status}`, 'success');
            setTimeout(() => window.location.reload(), 1000);
        } else {
            showToast(data.message, 'error');
        }
    });
}

// Utility functions
function getStatusIcon(status) {
    const icons = {
        'pending': 'clock',
        'processing': 'cogs',
        'completed': 'check-circle',
        'cancelled': 'times-circle',
        'delivered': 'truck'
    };
    return icons[status] || 'question-circle';
}

function getStatusBadgeClass(status) {
    const classes = {
        'pending': 'bg-warning',
        'processing': 'bg-info',
        'completed': 'bg-success',
        'cancelled': 'bg-danger',
        'delivered': 'bg-primary'
    };
    return classes[status] || 'bg-secondary';
}

function formatCurrency(amount) {
    if (amount === undefined || amount === null) return '₹0.00';
    return '₹' + parseFloat(amount).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function getDefaultImage(itemType) {
    return itemType === 'service' 
        ? 'https://res.cloudinary.com/demo/image/upload/v1633427556/sample_service.jpg'
        : 'https://res.cloudinary.com/demo/image/upload/v1633427556/sample_food.jpg';
}

// Make functions available globally
window.orderUtils = {
    loadOrderDetails,
    loadPaymentDetails,
    loadCustomerDetails,
    updateOrderStatus,
    updatePaymentStatus,
    exportOrders,
    printOrder
};