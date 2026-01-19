// ==================== REAL-TIME UPDATES ====================

let eventSource = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Setup real-time SSE connection
function setupRealTimeUpdates() {
    if (eventSource) {
        eventSource.close();
    }

    console.log('Setting up real-time updates...');
    
    // Create new EventSource connection
    eventSource = new EventSource('/api/admin/events', {
        withCredentials: true
    });

    eventSource.onopen = () => {
        console.log('✅ Connected to real-time updates');
        reconnectAttempts = 0;
    };

    eventSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            handleRealTimeEvent(data);
        } catch (error) {
            console.error('Error parsing real-time event:', error);
        }
    };

    eventSource.addEventListener('new_order', (event) => {
        try {
            const data = JSON.parse(event.data);
            handleNewOrderEvent(data);
        } catch (error) {
            console.error('Error processing new order event:', error);
        }
    });

    eventSource.addEventListener('stats_update', (event) => {
        try {
            const data = JSON.parse(event.data);
            handleStatsUpdateEvent(data);
        } catch (error) {
            console.error('Error processing stats update:', error);
        }
    });

    eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        eventSource.close();
        
        // Try to reconnect with exponential backoff
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++;
            const delay = Math.min(3000 * Math.pow(2, reconnectAttempts), 30000);
            console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts})...`);
            
            setTimeout(() => {
                setupRealTimeUpdates();
            }, delay);
        } else {
            console.error('Max reconnection attempts reached. Real-time updates disabled.');
        }
    };
}

// Handle all real-time events
function handleRealTimeEvent(data) {
    console.log('Real-time event:', data.type);
    
    switch (data.type) {
        case 'new_order':
            handleNewOrderEvent(data.data);
            break;
        case 'stats_update':
            handleStatsUpdateEvent(data.data);
            break;
        case 'connected':
            console.log('Real-time updates connected');
            break;
        default:
            console.log('Unknown event type:', data.type);
    }
}

// Handle new order event
function handleNewOrderEvent(orderData) {
    console.log('New order received:', orderData);
    
    // Show notification
    showOrderNotification(orderData);
    
    // Update today's orders table
    updateOrdersTable(orderData);
    
    // Update stats
    updateDashboardStats();
    
    // Update inventory if on inventory page
    if (window.location.pathname.includes('inventory')) {
        setTimeout(() => {
            updateInventorySummary();
            renderInventoryGrid();
        }, 1000);
    }
}

// Handle stats update event
function handleStatsUpdateEvent(statsData) {
    console.log('Stats updated:', statsData);
    
    // Update all stats displays
    updateStatsDisplays(statsData);
    
    // Update dashboard if visible
    updateDashboardStats();
}

// Show notification for new order
function showOrderNotification(orderData) {
    // Remove existing notification if present
    const existingNotification = document.querySelector('.order-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = 'order-notification';
    notification.innerHTML = `
        <div class="notification-header">
            <strong>🆕 New Order!</strong>
            <button onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
        <div class="notification-body">
            <p><strong>Order #:</strong> ${orderData.orderNumber}</p>
            <p><strong>Total:</strong> ₱${orderData.total ? orderData.total.toFixed(2) : '0.00'}</p>
            <p><strong>Type:</strong> ${orderData.type || 'Dine In'}</p>
            <p><strong>Items:</strong> ${orderData.items || 1}</p>
            <p><strong>Payment:</strong> ${orderData.paymentMethod || 'Cash'}</p>
            <p><small>${orderData.timestamp || new Date().toLocaleTimeString()}</small></p>
        </div>
    `;
    
    // Add notification styles if not already present
    addNotificationStyles();
    
    document.body.appendChild(notification);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 10000);
    
    // Play notification sound (optional)
    playNotificationSound();
}

// Add notification styles
function addNotificationStyles() {
    if (document.getElementById('notification-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        .order-notification {
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border-left: 4px solid #4CAF50;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            border-radius: 8px;
            padding: 15px;
            width: 320px;
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        .notification-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            padding-bottom: 8px;
            border-bottom: 1px solid #eee;
        }
        
        .notification-header strong {
            color: #333;
            font-size: 16px;
        }
        
        .notification-header button {
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: #999;
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
        }
        
        .notification-header button:hover {
            background: #f5f5f5;
            color: #333;
        }
        
        .notification-body p {
            margin: 5px 0;
            font-size: 14px;
            line-height: 1.4;
        }
        
        .notification-body strong {
            color: #555;
            font-weight: 600;
            display: inline-block;
            width: 80px;
        }
        
        .notification-body small {
            color: #888;
            font-size: 12px;
        }
    `;
    
    document.head.appendChild(style);
}

// Update today's orders table
function updateOrdersTable(orderData) {
    const ordersTableBody = document.getElementById('ordersTableBody');
    if (!ordersTableBody) return;
    
    // Create new row
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td>${orderData.orderNumber}</td>
        <td>${orderData.timestamp || new Date().toLocaleTimeString()}</td>
        <td>Walk-in</td>
        <td>₱${orderData.total ? orderData.total.toFixed(2) : '0.00'}</td>
    `;
    
    // Add animation class
    newRow.style.animation = 'fadeIn 0.5s ease';
    
    // Add to start of table
    if (ordersTableBody.firstChild) {
        ordersTableBody.insertBefore(newRow, ordersTableBody.firstChild);
    } else {
        ordersTableBody.appendChild(newRow);
    }
    
    // Limit to 10 rows
    const rows = ordersTableBody.getElementsByTagName('tr');
    if (rows.length > 10) {
        ordersTableBody.removeChild(rows[rows.length - 1]);
    }
    
    // Add fadeIn animation if not present
    if (!document.getElementById('fadeIn-animation')) {
        const style = document.createElement('style');
        style.id = 'fadeIn-animation';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
    }
}

// Update all stats displays
function updateStatsDisplays(statsData) {
    // Update main dashboard stats
    if (document.getElementById('totalOrders')) {
        document.getElementById('totalOrders').textContent = statsData.totalOrders || 0;
    }
    
    if (document.getElementById('ordersToday')) {
        document.getElementById('ordersToday').textContent = statsData.ordersToday || 0;
    }
    
    if (document.getElementById('totalRevenue')) {
        document.getElementById('totalRevenue').textContent = statsData.totalRevenue ? statsData.totalRevenue.toFixed(2) : '0.00';
    }
    
    // Update stat cards if they exist
    updateStatCards(statsData);
}

// Update individual stat cards
function updateStatCards(statsData) {
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
        const header = card.querySelector('h3');
        if (header) {
            const headerText = header.textContent.toLowerCase();
            if (headerText.includes('orders')) {
                const valueElement = card.querySelector('p');
                if (valueElement && !valueElement.classList.contains('revenue-value')) {
                    valueElement.textContent = statsData.totalOrders || 0;
                }
            } else if (headerText.includes('revenue')) {
                const revenueElement = card.querySelector('.revenue-value');
                if (revenueElement) {
                    revenueElement.textContent = statsData.totalRevenue ? statsData.totalRevenue.toFixed(2) : '0.00';
                }
            }
        }
    });
}

// Play notification sound (optional)
function playNotificationSound() {
    try {
        // Create a simple notification sound
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
        console.log('Audio context not supported or blocked');
    }
}

// Update dashboard stats (existing function, enhanced)
async function updateDashboardStats() {
    try {
        console.log('Updating dashboard stats...');
        
        const response = await fetch('/api/stats');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const stats = await response.json();
        
        // Update all stats displays
        updateStatsDisplays(stats);
        
        // Update orders table if on dashboard
        if (window.location.pathname.includes('dashboard') && stats.recentOrders) {
            updateRecentOrdersTable(stats.recentOrders);
        }
        
        console.log('Dashboard stats updated successfully');
    } catch (error) {
        console.error('Error updating dashboard stats:', error);
    }
}

// Update recent orders table
function updateRecentOrdersTable(recentOrders) {
    const ordersTableBody = document.getElementById('ordersTableBody');
    if (!ordersTableBody || !recentOrders) return;
    
    // Clear existing rows
    ordersTableBody.innerHTML = '';
    
    // Add new rows
    recentOrders.forEach(order => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${order.orderNumber || 'N/A'}</td>
            <td>${order.createdAt ? new Date(order.createdAt).toLocaleTimeString() : 'N/A'}</td>
            <td>Walk-in</td>
            <td>₱${order.total ? order.total.toFixed(2) : '0.00'}</td>
        `;
        ordersTableBody.appendChild(row);
    });
}

// Close real-time connection
function closeRealTimeUpdates() {
    if (eventSource) {
        eventSource.close();
        eventSource = null;
        console.log('Real-time updates disconnected');
    }
}

// ==================== INITIALIZATION ====================

// Update your existing DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded');
    
    // Initialize menu management
    if (document.getElementById('addMenuItemForm') || document.getElementById('menuItemsBody')) {
        setupMenuManagement();
    }
    
    // Initialize inventory if on inventory page
    if (window.location.pathname.includes('inventory')) {
        initInventory();
    }
    
    // Prevent back navigation
    preventBackNavigation();
    
    // Setup real-time updates for admin dashboard
    if (window.location.pathname.includes('admindashboard')) {
        console.log('Setting up real-time updates for admin dashboard...');
        setupRealTimeUpdates();
        
        // Initial stats load
        updateDashboardStats();
        
        // Set up periodic refresh (every 60 seconds)
        setInterval(updateDashboardStats, 60000);
    }
    
    // Form validation for login/register
    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', function(e) {
            const username = document.getElementById('username')?.value;
            const password = document.getElementById('password')?.value;
            
            if (!username || !password) {
                e.preventDefault();
                showAlert('Please fill in all required fields', 'error');
                return;
            }
            
            if (password.length < 6) {
                e.preventDefault();
                showAlert('Password must be at least 6 characters long', 'error');
                return;
            }
        });
    }
    
    // Setup menu navigation
    const menuItems = document.querySelectorAll('.dashboard-menu a');
    menuItems.forEach(item => {
        const href = item.getAttribute('href');
        if(href === '' || href === '#' || href.startsWith('javascript:')) {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.textContent.trim().toLowerCase().split(' ')[0];
                showSection(section);
            });
        }
    });
    
    // Setup search input
    const searchInput = document.getElementById('searchInventory');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchInventory(this.value);
            }, 300);
        });
    }
    
    // Setup filter buttons
    const statusFilter = document.getElementById('statusFilter');
    const categoryFilter = document.getElementById('categoryFilter');
    
    if (statusFilter) {
        statusFilter.addEventListener('change', filterInventory);
    }
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterInventory);
    }
    
    // Close modal when clicking outside
    window.onclick = function(event) {
        const editModal = document.getElementById('editModal');
        if (event.target === editModal) closeEditModal();
        
        const restockModal = document.getElementById('restockModal');
        if (event.target === restockModal) closeRestockModal();
    };
    
    // Block browser navigation shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.altKey && e.key === 'ArrowLeft') {
            e.preventDefault();
            return false;
        }
        
        if (e.key === 'F5') {
            e.preventDefault();
            return false;
        }
    });
    
    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
        closeRealTimeUpdates();
    });
});

// ==================== ADDITIONAL UTILITY FUNCTIONS ====================

// Update your existing showSection function to handle real-time cleanup
function showSection(sectionId) {  
    if (!sectionId && event && event.target) {
        const text = event.target.textContent.trim().toLowerCase();
        sectionId = text.split(' ')[0];
    }
    
    if (!sectionId) return;
    
    // Close real-time updates if leaving dashboard
    if (sectionId !== 'dashboard' && eventSource) {
        closeRealTimeUpdates();
    }
    
    document.querySelectorAll('.section-content').forEach(section => {
        section.classList.remove('active-section');
    });
    
    const sectionElement = document.getElementById(sectionId + 'Section');
    if (sectionElement) {
        sectionElement.classList.add('active-section');
    }
    
    // Setup real-time updates if entering dashboard
    if (sectionId === 'dashboard' && !eventSource) {
        setTimeout(setupRealTimeUpdates, 100);
    }
    
    if (event && event.target) {
        document.querySelectorAll('.dashboard-menu a').forEach(item => {
            item.classList.remove('active');
        });
        event.target.classList.add('active');
    }
}

// Handle logout with real-time cleanup
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        closeRealTimeUpdates();
        window.location.href = '/logout';
    }
}