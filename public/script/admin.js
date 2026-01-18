// ==================== GLOBAL VARIABLES ====================
let allMenuItems = [];
let inventoryData = [];
let searchTimeout;

// ==================== UTILITY FUNCTIONS ====================

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show alert notifications
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;
    
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        z-index: 10000;
        display: flex;
        justify-content: space-between;
        align-items: center;
        min-width: 300px;
        max-width: 500px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease-out;
    `;
    
    if (type === 'success') {
        alertDiv.style.background = '#4CAF50';
    } else if (type === 'error') {
        alertDiv.style.background = '#f44336';
    } else {
        alertDiv.style.background = '#2196F3';
    }
    
    alertDiv.querySelector('button').style.cssText = `
        background: none;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        margin-left: 15px;
        padding: 0;
    `;
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentElement) {
            alertDiv.remove();
        }
    }, 5000);
}

// ==================== MENU MANAGEMENT FUNCTIONS ====================

function setupMenuManagement() {
    console.log('Setting up menu management...');
    setupMenuFormSubmit();
    setupMenuSearch();
    setupModalEvents();
    loadMenuItems();
}

function setupMenuFormSubmit() {
    const addForm = document.getElementById('addMenuItemForm');
    if (!addForm) {
        console.error('❌ Add menu item form not found!');
        return;
    }
    
    console.log('✅ Form found, setting up submit handler');
    addForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        await addMenuItem();
    });
}

function setupMenuSearch() {
    const searchInput = document.getElementById('searchMenu');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const searchTerm = this.value.trim();
                console.log('Searching for:', searchTerm);
                
                if (searchTerm === '') {
                    displayMenuItems(allMenuItems);
                } else {
                    const filtered = allMenuItems.filter(item =>
                        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        item.category.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                    displayMenuItems(filtered);
                }
            }, 300);
        });
    }
}

function setupModalEvents() {
    const modal = document.getElementById('editModal');
    if (modal) {
        modal.addEventListener('click', function(event) {
            if (event.target === this) {
                closeEditModal();
            }
        });
    }
    
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeEditModal();
        }
    });
}

async function addMenuItem() {
    console.log('=== ADD MENU ITEM FUNCTION CALLED ===');
    
    const name = document.getElementById('itemName')?.value.trim();
    const price = document.getElementById('itemPrice')?.value.trim();
    const category = document.getElementById('itemCategory')?.value.trim();
    
    console.log('Form values:', { name, price, category });
    
    if (!name) {
        showAlert('❌ Please enter a valid item name', 'error');
        return;
    }
    
    const priceNum = parseFloat(price);
    if (!price || isNaN(priceNum) || priceNum <= 0) {
        showAlert('❌ Please enter a valid price (must be greater than 0)', 'error');
        return;
    }
    
    if (!category) {
        showAlert('❌ Please select a category', 'error');
        return;
    }
    
    const submitBtn = document.querySelector('#addMenuItemForm button[type="submit"]');
    const originalText = submitBtn ? submitBtn.innerHTML : '';
    
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
        submitBtn.disabled = true;
    }
    
    try {
        console.log('Attempting to save via API...');
        
        const newItem = {
            id: 'item_' + Date.now(),
            name: name,
            price: priceNum,
            category: category,
            createdAt: new Date().toISOString()
        };
        
        console.log('New item:', newItem);
        
        allMenuItems.push(newItem);
        saveToLocalStorage(newItem);
        
        document.getElementById('addMenuItemForm').reset();
        showAlert('✅ Menu item added successfully!', 'success');
        displayMenuItems(allMenuItems);
        
        setTimeout(() => {
            const menuCard = document.querySelector('.card:last-child');
            if (menuCard) {
                menuCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
        
    } catch (error) {
        console.error('Error:', error);
        showAlert('❌ Error: ' + error.message, 'error');
    } finally {
        if (submitBtn) {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
}

function saveToLocalStorage(item) {
    try {
        let menuItems = JSON.parse(localStorage.getItem('menuItems') || '[]');
        menuItems.push(item);
        localStorage.setItem('menuItems', JSON.stringify(menuItems));
        console.log('Saved to localStorage:', item);
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

function loadFromLocalStorage() {
    try {
        const savedItems = JSON.parse(localStorage.getItem('menuItems') || '[]');
        console.log('Loaded from localStorage:', savedItems.length, 'items');
        return savedItems;
    } catch (error) {
        console.error('Error loading from localStorage:', error);
        return [];
    }
}

async function loadMenuItems() {
    console.log('Loading menu items...');
    
    try {
        const response = await fetch('/api/menu', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                allMenuItems = result.data || [];
                console.log('Loaded from API:', allMenuItems.length, 'items');
            }
        } else if (response.status === 404) {
            console.log('API endpoint not found, using localStorage');
            allMenuItems = loadFromLocalStorage();
        }
    } catch (error) {
        console.log('API error, using localStorage:', error.message);
        allMenuItems = loadFromLocalStorage();
    }
    
    displayMenuItems(allMenuItems);
}

function displayMenuItems(items) {
    const tbody = document.getElementById('menuItemsBody');
    const noItems = document.getElementById('noItems');
    const table = document.getElementById('menuTable');
    
    if (!tbody || !noItems || !table) {
        console.error('Table elements not found');
        return;
    }
    
    if (!items || items.length === 0) {
        tbody.innerHTML = '';
        noItems.style.display = 'block';
        table.style.display = 'none';
        return;
    }
    
    noItems.style.display = 'none';
    table.style.display = 'table';
    
    tbody.innerHTML = items.map(item => `
        <tr data-id="${item.id || item._id}">
            <td><strong>${escapeHtml(item.name || 'Unnamed')}</strong></td>
            <td><span class="category-tag">${escapeHtml(item.category || 'Uncategorized')}</span></td>
            <td class="price-cell">₱${(item.price || 0).toFixed(2)}</td>
            <td class="actions-cell">
                <button class="action-btn edit-btn" onclick="editMenuItem('${item.id || item._id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="action-btn delete-btn" onclick="deleteMenuItem('${item.id || item._id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        </tr>
    `).join('');
    
    console.log('Displayed', items.length, 'items');
}

function editMenuItem(itemId) {
    const item = allMenuItems.find(item => item.id === itemId || item._id === itemId);
    if (!item) {
        showAlert('Item not found', 'error');
        return;
    }
    
    console.log('Editing item:', item);
    
    document.getElementById('editItemId').value = itemId;
    document.getElementById('editItemName').value = item.name;
    document.getElementById('editItemPrice').value = item.price;
    document.getElementById('editItemCategory').value = item.category;
    
    document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    if (document.getElementById('editMenuItemForm')) {
        document.getElementById('editMenuItemForm').reset();
    }
}

async function updateMenuItem(event) {
    if (event) event.preventDefault();
    
    const itemId = document.getElementById('editItemId').value;
    const name = document.getElementById('editItemName').value.trim();
    const price = parseFloat(document.getElementById('editItemPrice').value);
    const category = document.getElementById('editItemCategory').value;
    
    if (!name || !price || !category) {
        showAlert('Please fill all fields', 'error');
        return;
    }
    
    const index = allMenuItems.findIndex(item => item.id === itemId || item._id === itemId);
    if (index !== -1) {
        allMenuItems[index] = {
            ...allMenuItems[index],
            name,
            price,
            category,
            updatedAt: new Date().toISOString()
        };
        
        updateLocalStorage();
        displayMenuItems(allMenuItems);
        closeEditModal();
        showAlert('✅ Menu item updated successfully!', 'success');
    }
}

async function deleteMenuItem(itemId) {
    if (!confirm('⚠️ Are you sure you want to delete this menu item?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/menu/${itemId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            allMenuItems = allMenuItems.filter(item => item.id !== itemId && item._id !== itemId);
            updateLocalStorage();
            displayMenuItems(allMenuItems);
            showAlert('✅ Menu item deleted successfully!', 'success');
        } else {
            showAlert('❌ ' + (result.message || 'Failed to delete menu item'), 'error');
        }
    } catch (error) {
        console.error('Error deleting menu item:', error);
        // Fall back to local delete
        allMenuItems = allMenuItems.filter(item => item.id !== itemId && item._id !== itemId);
        updateLocalStorage();
        displayMenuItems(allMenuItems);
        showAlert('✅ Menu item deleted successfully!', 'success');
    }
}

function updateLocalStorage() {
    try {
        localStorage.setItem('menuItems', JSON.stringify(allMenuItems));
        console.log('Updated localStorage');
    } catch (error) {
        console.error('Error updating localStorage:', error);
    }
}

// ==================== INVENTORY FUNCTIONS ====================

function initInventory() {
    updateInventorySummary();
    renderInventoryGrid();
    loadCategories();
}

function updateInventorySummary() {
    const totalItems = inventoryData.length;
    const lowStock = inventoryData.filter(item => {
        const status = getStockStatus(item);
        return status === 'low' || status === 'critical';
    }).length;
    const outOfStock = inventoryData.filter(item => item.stock === 0).length;
    const totalValue = inventoryData.reduce((sum, item) => sum + (item.price * item.stock), 0);

    const totalInventoryItems = document.getElementById('totalInventoryItems');
    const lowStockCount = document.getElementById('lowStockCount');
    const outOfStockCount = document.getElementById('outOfStockCount');
    const inventoryValue = document.getElementById('inventoryValue');
    
    if (totalInventoryItems) totalInventoryItems.textContent = totalItems;
    if (lowStockCount) lowStockCount.textContent = lowStock;
    if (outOfStockCount) outOfStockCount.textContent = outOfStock;
    if (inventoryValue) inventoryValue.textContent = `₱${totalValue.toFixed(2)}`;
}

function renderInventoryGrid(items = inventoryData) {
    const grid = document.getElementById('inventoryGrid');
    if (!grid) return;
    grid.innerHTML = '';

    if (items.length === 0) {
        grid.innerHTML = `<p style="text-align:center; color: #555;">No inventory items found.</p>`;
        return;
    }

    const categoryColors = {
        'Meal': '#e74c3c',
        'Hot Sizzlers': '#3498db',
        'Party Tray': '#2ecc71',
        'Drinks': '#9b59b6',
        'Coffee': '#f39c12',
        'Milk Tea': '#1abc9c',
        'Frappe': '#8e44ad',
        'Snacks & Appetizer': '#f1c40f',
        'Budget Meals Served with Rice': '#e67e22',
        'Specialties': '#34495e'
    };

    items.forEach(item => {
        const status = getStockStatus(item);
        const stockPercentage = item.threshold ? Math.min(100, (item.stock / item.threshold) * 100) : 100;

        const card = document.createElement('div');
        card.className = 'inventory-item-card';
        card.innerHTML = `
            <div class="item-header">
                <span class="item-category" style="background: ${categoryColors[item.category] || '#7f8c8d'}; color: white;">
                    ${item.category || 'UNCATEGORIZED'}
                </span>
                <span class="stock-status ${status}">${status.toUpperCase()}</span>
            </div>
            <h4 class="item-name">${item.name || 'Unnamed Item'}</h4>
            <div class="item-details">
                <span class="item-price">₱${item.price ? item.price.toFixed(2) : '0.00'}</span>
                <div class="item-stock">
                    <span class="stock-value">${item.stock || 0} ${item.unit || ''}</span>
                </div>
            </div>
            <div class="stock-bar">
                <div class="stock-fill ${status}" style="width: ${stockPercentage}%"></div>
            </div>
            <div class="item-actions">
                <button class="action-btn edit-btn" onclick="editItem('${item._id || item.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="action-btn restock-btn" onclick="restockItem('${item._id || item.id}')">
                    <i class="fas fa-plus"></i> Restock
                </button>
                <button class="action-btn delete-btn" onclick="deleteItem('${item._id || item.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function getStockStatus(item) {
    if (!item) return 'out';
    if (item.stock === 0) return 'out';
    if (item.critical && item.stock <= item.critical) return 'critical';
    if (item.threshold && item.stock <= item.threshold) return 'low';
    return 'sufficient';
}

function loadCategories() {
    const categoryFilter = document.getElementById('categoryFilter');
    if (!categoryFilter) return;

    const selectedValue = categoryFilter.value || 'all';
    categoryFilter.innerHTML = `<option value="all">All Categories</option>`;

    const categories = [...new Set(inventoryData.map(item => item.category).filter(Boolean))];
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });

    categoryFilter.value = selectedValue;
}

function filterInventory() {
    const statusFilter = document.getElementById('statusFilter');
    const categoryFilter = document.getElementById('categoryFilter');
    
    const statusValue = statusFilter ? statusFilter.value : 'all';
    const categoryValue = categoryFilter ? categoryFilter.value : 'all';

    let filteredItems = inventoryData;

    if (categoryValue !== 'all') 
        filteredItems = filteredItems.filter(item => item.category === categoryValue);
    if (statusValue !== 'all') 
        filteredItems = filteredItems.filter(item => getStockStatus(item) === statusValue);

    renderInventoryGrid(filteredItems);
}

function searchInventory(query) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        const filteredItems = inventoryData.filter(item =>
            (item.name || '').toLowerCase().includes(query.toLowerCase()) ||
            (item.category || '').toLowerCase().includes(query.toLowerCase())
        );
        renderInventoryGrid(filteredItems);
    }, 300);
}

function showRestockModal() {
    const modal = document.getElementById('restockModal');
    const restockContent = document.getElementById('restockContent');

    if (!modal || !restockContent) return;

    restockContent.innerHTML = `
        <div class="modal-body">
            <form id="restockForm" onsubmit="submitRestock(event)">
                <div class="form-group">
                    <label for="restockItem">Select Item</label>
                    <select id="restockItem" required>
                        <option value="">Select an item</option>
                        ${inventoryData.map(item => `<option value="${item._id || item.id}">${item.name} (Current: ${item.stock || 0} ${item.unit || ''})</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="restockQuantity">Quantity to Add</label>
                    <input type="number" id="restockQuantity" min="1" required>
                </div>
                <div class="form-group">
                    <label for="restockNotes">Notes (Optional)</label>
                    <textarea id="restockNotes" rows="3" placeholder="Add notes..."></textarea>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-secondary" onclick="closeRestockModal()">Cancel</button>
                    <button type="submit" class="btn-primary">Restock</button>
                </div>
            </form>
        </div>
    `;

    modal.style.display = 'flex';
}

function closeRestockModal() {
    const modal = document.getElementById('restockModal');
    if (modal) modal.style.display = 'none';
}

function submitRestock(event) {
    event.preventDefault();
    const itemId = document.getElementById('restockItem').value;
    const quantity = parseInt(document.getElementById('restockQuantity').value);

    const item = inventoryData.find(i => (i._id || i.id) === itemId);
    if (item && quantity > 0) {
        item.stock = (item.stock || 0) + quantity;
        updateInventorySummary();
        renderInventoryGrid();
        closeRestockModal();
        showAlert(`✅ Added ${quantity} ${item.unit || ''} to ${item.name}`, 'success');
    }
}

function editItem(id) { 
    const item = inventoryData.find(i => (i._id || i.id) === id);
    if (item) {
        alert(`Edit item: ${item.name}\nThis feature is not fully implemented yet.`);
    }
}

function restockItem(id) { 
    const item = inventoryData.find(i => (i._id || i.id) === id);
    if (item) {
        const quantity = prompt(`How many ${item.unit || 'units'} to add to ${item.name}?`, "10");
        if (quantity && !isNaN(quantity) && parseInt(quantity) > 0) {
            item.stock = (item.stock || 0) + parseInt(quantity);
            updateInventorySummary();
            renderInventoryGrid();
            showAlert(`✅ Added ${quantity} ${item.unit || ''} to ${item.name}`, 'success');
        }
    }
}

function deleteItem(id) { 
    if (confirm('⚠️ Are you sure you want to delete this item?')) {
        inventoryData = inventoryData.filter(item => (item._id || item.id) !== id);
        updateInventorySummary();
        renderInventoryGrid();
        loadCategories();
        showAlert('✅ Item deleted successfully', 'success');
    }
}

function exportInventory() {
    if (inventoryData.length === 0) {
        showAlert('No data to export', 'error');
        return;
    }
    
    const dataStr = JSON.stringify(inventoryData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = 'inventory_export_' + new Date().toISOString().split('T')[0] + '.json';
    link.click();
}

// ==================== GENERAL FUNCTIONS ====================

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        window.location.href = '/logout';
    }
}

function preventBackNavigation() {
    history.pushState(null, null, location.href);
    window.onpopstate = function() {
        history.go(1);
    };
}

function showSection(sectionId) {  
    if (!sectionId && event && event.target) {
        const text = event.target.textContent.trim().toLowerCase();
        sectionId = text.split(' ')[0];
    }
    
    if (!sectionId) return;
    
    document.querySelectorAll('.section-content').forEach(section => {
        section.classList.remove('active-section');
    });
    
    const sectionElement = document.getElementById(sectionId + 'Section');
    if (sectionElement) {
        sectionElement.classList.add('active-section');
    }
    
    if (event && event.target) {
        document.querySelectorAll('.dashboard-menu a').forEach(item => {
            item.classList.remove('active');
        });
        event.target.classList.add('active');
    }
}

function formatCardNumber(input) {
    let value = input.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    let formatted = '';
    
    for (let i = 0; i < value.length; i++) {
        if (i > 0 && i % 4 === 0) {
            formatted += ' ';
        }
        formatted += value[i];
    }
    
    input.value = formatted.substring(0, 19);
}

// ==================== STYLES ====================

const styles = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    .category-tag {
        background: #e3f2fd;
        color: #1976d2;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 500;
        display: inline-block;
    }
    
    .price-cell {
        font-weight: bold;
        color: #2e7d32;
    }
    
    .actions-cell {
        display: flex;
        gap: 8px;
    }
    
    .action-btn {
        padding: 6px 12px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: 5px;
        transition: all 0.2s;
    }
    
    .edit-btn {
        background: #4CAF50;
        color: white;
    }
    
    .delete-btn {
        background: #f44336;
        color: white;
    }
    
    .edit-btn:hover {
        background: #45a049;
        transform: translateY(-1px);
    }
    
    .delete-btn:hover {
        background: #d32f2f;
        transform: translateY(-1px);
    }
    
    #menuTable {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
    }
    
    #menuTable th {
        background: #f5f5f5;
        padding: 12px 15px;
        text-align: left;
        border-bottom: 2px solid #ddd;
        font-weight: 600;
        color: #333;
    }
    
    #menuTable td {
        padding: 15px;
        border-bottom: 1px solid #eee;
        vertical-align: middle;
    }
    
    #menuTable tr:hover {
        background-color: #f9f9f9;
    }
    
    .modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }
    
    .modal-content {
        background: white;
        padding: 30px;
        border-radius: 10px;
        width: 90%;
        max-width: 500px;
        box-shadow: 0 5px 30px rgba(0,0,0,0.3);
        animation: modalFadeIn 0.3s ease-out;
    }
    
    @keyframes modalFadeIn {
        from { opacity: 0; transform: translateY(-20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    .form-actions {
        display: flex;
        gap: 10px;
        margin-top: 20px;
        justify-content: flex-end;
    }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

// ==================== INITIALIZATION ====================

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
});


function showDaySales(day) {
  const dayMap = {
    'tuesday': 'Tuesday',
    'wednesday': 'Wednesday',
    'thursday': 'Thursday',
    'friday': 'Friday',
    'saturday': 'Saturday',
    'sunday': 'Sunday',
    'monday': 'Monday'
  };
  
  alert(`Sales for ${dayMap[day]}:\n\nSelected day's revenue data would be displayed here.`);
}

// JavaScript functions for dashboard functionality
  
// Show loading overlay
function showLoading() {
  document.getElementById('loadingOverlay').style.display = 'flex';
}

// Hide loading overlay
function hideLoading() {
  document.getElementById('loadingOverlay').style.display = 'none';
}

// Show section based on navigation
function showSection(section) {
  // Hide all sections
  document.querySelectorAll('.section-content').forEach(el => {
    el.classList.remove('active-section');
  });
  
  // Show selected section
  document.getElementById(section + 'Section').classList.add('active-section');
  
  // Update active link in sidebar
  document.querySelectorAll('.dashboard-menu a').forEach(link => {
    link.classList.remove('active');
  });
  event.target.classList.add('active');
}

function handleLogout() {
  showLoading();
  setTimeout(() => {
    hideLoading();
    alert('Logged out successfully!');
  }, 1000);
}

function debounceSearch(value) {
  clearTimeout(this.debounceTimer);
  this.debounceTimer = setTimeout(() => {
    console.log('Searching for:', value);
  }, 300);
}

document.addEventListener('DOMContentLoaded', function() {
  setTimeout(hideLoading, 500);

});