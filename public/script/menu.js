let menuData = [];
let filteredMenu = [];
let currentRestockItem = null;
let salesData = {};
let weeklySales = {};
let dailySales = {};
let searchTimeout;
let editMode = false;
let currentEditItem = null;
let selectedItems = new Set();
let sortConfig = { field: 'name', direction: 'asc' };

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    loadMenuData();
    setupModalEvents();
    setupEventListeners();
    initializeQuickActions();
    setupPrintFunctionality();
    
    const dashboardElements = document.getElementById('salesChart');
    if (dashboardElements) {
        loadSalesData();
        initializeWeeklyChart();
        updateDashboard();
        setInterval(updateDashboard, 300000);
    }
    
    initializeTooltips();
}

function setupModalEvents() {
    const modal = document.getElementById('restockModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeRestockModal();
            }
        });
    }
    
    const deleteModal = document.getElementById('deleteModal');
    if (deleteModal) {
        deleteModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeDeleteModal();
            }
        });
    }
    
    const editModal = document.getElementById('editModal');
    if (editModal) {
        editModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeEditModal();
            }
        });
    }
    
    const bulkModal = document.getElementById('bulkModal');
    if (bulkModal) {
        bulkModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeBulkModal();
            }
        });
    }
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

function setupEventListeners() {
    const quickLowStockBtn = document.getElementById('quickLowStock');
    const quickOutStockBtn = document.getElementById('quickOutStock');
    const quickAllBtn = document.getElementById('quickAll');
    const quickCriticalBtn = document.getElementById('quickCritical');
    
    if (quickLowStockBtn) quickLowStockBtn.addEventListener('click', () => quickFilter('low'));
    if (quickOutStockBtn) quickOutStockBtn.addEventListener('click', () => quickFilter('out'));
    if (quickAllBtn) quickAllBtn.addEventListener('click', () => quickFilter('all'));
    if (quickCriticalBtn) quickCriticalBtn.addEventListener('click', () => quickFilter('critical'));
    
    const bulkSelectAll = document.getElementById('bulkSelectAll');
    const bulkRestockBtn = document.getElementById('bulkRestockBtn');
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
    const bulkExportBtn = document.getElementById('bulkExportBtn');
    
    if (bulkSelectAll) bulkSelectAll.addEventListener('change', toggleSelectAll);
    if (bulkRestockBtn) bulkRestockBtn.addEventListener('click', showBulkRestock);
    if (bulkDeleteBtn) bulkDeleteBtn.addEventListener('click', showBulkDelete);
    if (bulkExportBtn) bulkExportBtn.addEventListener('click', bulkExportItems);
    
    const printBtn = document.getElementById('printBtn');
    const exportCSVBtn = document.getElementById('exportCSV');
    const exportPDFBtn = document.getElementById('exportPDF');
    
    if (printBtn) printBtn.addEventListener('click', printMenu);
    if (exportCSVBtn) exportCSVBtn.addEventListener('click', exportToCSV);
    if (exportPDFBtn) exportPDFBtn.addEventListener('click', exportToPDF);
    
    const searchInput = document.getElementById('searchMenu');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            searchMenu(this.value);
        });
    }
    
    const statusFilter = document.getElementById('statusFilter');
    const categoryFilter = document.getElementById('categoryFilter');
    
    if (statusFilter) statusFilter.addEventListener('change', filterMenu);
    if (categoryFilter) categoryFilter.addEventListener('change', filterMenu);
    
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            const [field, direction] = this.value.split('-');
            sortMenu(field, direction);
        });
    }
    
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', refreshMenu);
    
    const addItemBtn = document.getElementById('addItemBtn');
    if (addItemBtn) addItemBtn.addEventListener('click', showRestockModal);
}

function initializeQuickActions() {
    const quickActionContainer = document.getElementById('quickActions');
    if (!quickActionContainer) return;
    
    const actions = [
        { icon: 'fa-plus', text: 'Add Menu Item', action: showRestockModal, color: 'primary' },
        { icon: 'fa-redo', text: 'Restock All Low', action: restockAllLow, color: 'warning' },
        { icon: 'fa-chart-bar', text: 'Stock Report', action: generateStockReport, color: 'info' },
        { icon: 'fa-history', text: 'View History', action: showRestockHistory, color: 'secondary' }
    ];
    
    actions.forEach(action => {
        const btn = document.createElement('button');
        btn.className = `btn-small btn-${action.color}`;
        btn.innerHTML = `<i class="fas ${action.icon}"></i> ${action.text}`;
        btn.onclick = action.action;
        quickActionContainer.appendChild(btn);
    });
}

function setupPrintFunctionality() {
    window.addEventListener('beforeprint', function() {
        const grid = document.getElementById('menuGrid');
        if (grid) {
            grid.classList.add('print-mode');
        }
    });
    
    window.addEventListener('afterprint', function() {
        const grid = document.getElementById('menuGrid');
        if (grid) {
            grid.classList.remove('print-mode');
        }
    });
}

function initializeTooltips() {
    const tooltipElements = document.querySelectorAll('[data-tooltip]');
    tooltipElements.forEach(el => {
        el.addEventListener('mouseenter', showTooltip);
        el.addEventListener('mouseleave', hideTooltip);
    });
}

async function loadMenuData() {
    try {
        const response = await fetch('/api/menu');
        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
                menuData = data;
            } else if (typeof data === 'object') {
                menuData = convertMenuObjectToArray(data);
            }
        } else {
            const savedData = localStorage.getItem('menuData');
            menuData = savedData ? JSON.parse(savedData) : [];
        }
    } catch (error) {
        const savedData = localStorage.getItem('menuData');
        menuData = savedData ? JSON.parse(savedData) : [];
    }
    
    menuData.forEach(item => {
        if (!item.id) item.id = generateId();
        if (!item.status) item.status = calculateStatus(item);
        if (!item.lastRestock) item.lastRestock = new Date().toISOString().split('T')[0];
    });
    
    updateMenuSummary();
    renderMenuGrid();
    updateQuickStats();
}

function convertMenuObjectToArray(objData) {
    return Object.entries(objData).map(([name, data], index) => ({
        id: `item_${index}_${Date.now()}`,
        name: name,
        category: data.category || 'Uncategorized',
        currentStock: data.stock || 0,
        minStock: data.minStock || 10,
        price: data.price || 0,
        lastRestock: data.lastRestock || new Date().toISOString().split('T')[0],
        status: calculateStatus({ currentStock: data.stock || 0, minStock: data.minStock || 10 })
    }));
}

function calculateStatus(item) {
    if (item.currentStock === 0) return "out";
    if (item.currentStock <= item.minStock * 0.2) return "critical";
    if (item.currentStock <= item.minStock * 0.5) return "low";
    return "sufficient";
}

function updateMenuSummary() {
    const totalItems = menuData.length;
    let lowStock = 0;
    let outOfStock = 0;
    let criticalStock = 0;
    let totalValue = 0;
    let totalItemsValue = 0;

    menuData.forEach(item => {
        if (!item.status) {
            item.status = calculateStatus(item);
        }
        if (item.status === "low") lowStock++;
        if (item.status === "critical") criticalStock++;
        if (item.status === "out") outOfStock++;
        if (item.price && item.currentStock) {
            const itemValue = item.currentStock * item.price;
            totalValue += itemValue;
            totalItemsValue++;
        }
    });

    const totalEl = document.getElementById('totalMenuItems');
    const lowEl = document.getElementById('lowStockCount');
    const outEl = document.getElementById('outOfStockCount');
    const criticalEl = document.getElementById('criticalStockCount');
    const valueEl = document.getElementById('menuValue');
    const avgValueEl = document.getElementById('avgItemValue');
    
    if (totalEl) totalEl.textContent = totalItems;
    if (lowEl) lowEl.textContent = lowStock;
    if (outEl) outEl.textContent = outOfStock;
    if (criticalEl) criticalEl.textContent = criticalStock;
    if (valueEl) valueEl.textContent = `₱${totalValue.toFixed(2)}`;
    if (avgValueEl && totalItemsValue > 0) {
        const avgValue = totalValue / totalItemsValue;
        avgValueEl.textContent = `₱${avgValue.toFixed(2)}`;
    }
}

function updateQuickStats() {
    const statsContainer = document.getElementById('quickStats');
    if (!statsContainer) return;
    
    const criticalItems = menuData.filter(item => item.status === 'critical');
    const lowItems = menuData.filter(item => item.status === 'low');
    
    statsContainer.innerHTML = `
        <div class="stat-card">
            <i class="fas fa-exclamation-triangle"></i>
            <div class="stat-content">
                <h4>${criticalItems.length}</h4>
                <p>Critical Items</p>
            </div>
        </div>
        <div class="stat-card">
            <i class="fas fa-exclamation-circle"></i>
            <div class="stat-content">
                <h4>${lowItems.length}</h4>
                <p>Low Stock Items</p>
            </div>
        </div>
        <div class="stat-card">
            <i class="fas fa-boxes"></i>
            <div class="stat-content">
                <h4>${menuData.length}</h4>
                <p>Total Menu Items</p>
            </div>
        </div>
    `;
}

function renderMenuGrid() {
    const menuGrid = document.getElementById('menuGrid');
    if (!menuGrid) return;
    
    const displayData = filteredMenu.length > 0 ? filteredMenu : menuData;
    
    if (displayData.length === 0) {
        menuGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-utensils fa-3x"></i>
                <h3>No Menu Items Found</h3>
                <p>Add your first menu item to get started</p>
                <button class="btn-primary" onclick="showRestockModal()">
                    <i class="fas fa-plus"></i> Add First Item
                </button>
            </div>
        `;
        return;
    }
    
    menuGrid.innerHTML = '';
    
    displayData.forEach(item => {
        const card = document.createElement('div');
        card.className = 'menu-card';
        card.dataset.id = item.id;
        
        const statusInfo = getStatusInfo(item.status);
        const stockPercentage = (item.currentStock / item.minStock) * 100;
        
        card.innerHTML = `
            <div class="menu-card-header">
                <div class="card-header-left">
                    <input type="checkbox" class="item-checkbox" data-id="${item.id}" 
                           onchange="toggleItemSelection('${item.id}', this.checked)">
                    <h4>${item.name || 'Unnamed Item'}</h4>
                </div>
                <div class="card-header-right">
                    <span class="status-badge ${statusInfo.class}">${statusInfo.text}</span>
                    <div class="card-actions">
                        <button class="btn-icon" onclick="showItemDetails('${item.id}')" data-tooltip="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon" onclick="showRestockForm('${item.id}')" data-tooltip="Restock">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="menu-card-body">
                <div class="stock-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min(stockPercentage, 100)}%"></div>
                    </div>
                    <div class="stock-numbers">
                        <span>${item.currentStock || 0} / ${item.minStock || 0}</span>
                        <span>${stockPercentage.toFixed(0)}%</span>
                    </div>
                </div>
                <div class="menu-details-grid">
                    <div class="detail-item">
                        <i class="fas fa-tag"></i>
                        <span>${item.category || 'Uncategorized'}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-money-bill-wave"></i>
                        <span>₱${(item.price || 0).toFixed(2)}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-calendar-alt"></i>
                        <span>${formatDate(item.lastRestock)}</span>
                    </div>
                </div>
                <div class="item-value">
                    <strong>Stock Value:</strong> ₱${((item.currentStock || 0) * (item.price || 0)).toFixed(2)}
                </div>
            </div>
            <div class="menu-card-footer">
                <button class="btn-small btn-primary" onclick="quickRestock('${item.id}')">
                    <i class="fas fa-bolt"></i> Quick Restock
                </button>
                <button class="btn-small btn-secondary" onclick="editItem('${item.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn-small btn-danger" onclick="showDeleteModal('${item.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
        
        menuGrid.appendChild(card);
    });
    
    updateBulkActions();
}

function getStatusInfo(status) {
    const statusMap = {
        'sufficient': { text: 'In Stock', class: 'status-sufficient', icon: 'fa-check-circle' },
        'low': { text: 'Low Stock', class: 'status-low', icon: 'fa-exclamation-circle' },
        'critical': { text: 'Critical', class: 'status-critical', icon: 'fa-exclamation-triangle' },
        'out': { text: 'Out of Stock', class: 'status-out', icon: 'fa-times-circle' }
    };
    
    return statusMap[status] || { text: 'Unknown', class: 'status-unknown', icon: 'fa-question-circle' };
}

function showRestockModal() {
    const modal = document.getElementById('restockModal');
    const restockContent = document.getElementById('restockContent');
    
    if (!modal || !restockContent) return;
    
    restockContent.innerHTML = `
        <form id="addItemForm" onsubmit="event.preventDefault(); addNewItem();">
            <div class="form-group">
                <label for="itemName"><i class="fas fa-utensils"></i> Menu Item Name *</label>
                <input type="text" id="itemName" placeholder="Enter menu item name" required>
            </div>
            <div class="form-group">
                <label for="itemCategory"><i class="fas fa-list"></i> Category *</label>
                <select id="itemCategory" required>
                    <option value="">Select Category</option>
                    <option value="Meal">Rice Bowl Meals</option>
                    <option value="Hot Sizzlers">Hot Sizzlers</option>
                    <option value="Party Tray">Party Tray</option>
                    <option value="Drinks">Drinks</option>
                    <option value="Coffee">Coffee</option>
                    <option value="Milk Tea">Milk Tea</option>
                    <option value="Frappe">Frappe</option>
                    <option value="Snacks & Appetizer">Snacks & Appetizer</option>
                    <option value="Budget Meals">Budget Meals</option>
                    <option value="Specialties">Specialties</option>
                    <option value="Other">Other</option>
                </select>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="initialStock"><i class="fas fa-box"></i> Initial Stock *</label>
                    <input type="number" id="initialStock" min="0" value="10" required>
                </div>
                <div class="form-group">
                    <label for="minStock"><i class="fas fa-exclamation"></i> Minimum Stock *</label>
                    <input type="number" id="minStock" min="1" value="5" required>
                </div>
            </div>
            <div class="form-group">
                <label for="price"><i class="fas fa-money-bill-wave"></i> Price (₱) *</label>
                <input type="number" id="price" min="0" step="0.01" value="0.00" required>
            </div>
            <div class="modal-actions">
                <button type="button" class="btn-secondary" onclick="closeRestockModal()">
                    <i class="fas fa-times"></i> Cancel
                </button>
                <button type="submit" class="btn-primary">
                    <i class="fas fa-plus"></i> Add Menu Item
                </button>
            </div>
        </form>
    `;
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    setTimeout(() => {
        const firstInput = document.getElementById('itemName');
        if (firstInput) firstInput.focus();
    }, 100);
}

function showRestockForm(itemId) {
    const item = menuData.find(i => i.id == itemId);
    if (!item) {
        return;
    }
    
    currentRestockItem = item;
    const modal = document.getElementById('restockModal');
    const restockContent = document.getElementById('restockContent');
    
    if (!modal || !restockContent) return;
    
    restockContent.innerHTML = `
        <form id="restockForm" onsubmit="event.preventDefault(); submitRestock();">
            <div class="restock-header">
                <h4><i class="fas fa-utensils"></i> Restock: ${item.name}</h4>
                <div class="restock-stats">
                    <div class="stat">
                        <span>Current Stock</span>
                        <strong>${item.currentStock || 0}</strong>
                    </div>
                    <div class="stat">
                        <span>Minimum Required</span>
                        <strong>${item.minStock || 0}</strong>
                    </div>
                    <div class="stat">
                        <span>Needed</span>
                        <strong class="${item.currentStock < item.minStock ? 'text-danger' : ''}">
                            ${Math.max(0, item.minStock - item.currentStock)}
                        </strong>
                    </div>
                </div>
            </div>
            <div class="form-group">
                <label for="restockQuantity"><i class="fas fa-plus"></i> Quantity to Add *</label>
                <div class="input-with-unit">
                    <input type="number" id="restockQuantity" min="1" value="${Math.max(10, item.minStock - item.currentStock)}" required>
                    <span class="input-unit">units</span>
                </div>
                <div class="input-suggestions">
                    <button type="button" class="btn-tiny" onclick="setRestockQuantity(${item.minStock - item.currentStock})">
                        Fill to minimum
                    </button>
                    <button type="button" class="btn-tiny" onclick="setRestockQuantity(${item.minStock})">
                        Add ${item.minStock} units
                    </button>
                    <button type="button" class="btn-tiny" onclick="setRestockQuantity(50)">
                        Add 50 units
                    </button>
                </div>
            </div>
            <div class="form-group">
                <label for="restockCost"><i class="fas fa-money-bill"></i> Total Cost (₱) *</label>
                <input type="number" id="restockCost" min="0" step="0.01" value="0.00" required>
            </div>
            <div class="modal-actions">
                <button type="button" class="btn-secondary" onclick="closeRestockModal()">
                    <i class="fas fa-times"></i> Cancel
                </button>
                <button type="submit" class="btn-primary">
                    <i class="fas fa-check"></i> Submit Restock
                </button>
            </div>
        </form>
    `;
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    setTimeout(() => {
        const quantityInput = document.getElementById('restockQuantity');
        if (quantityInput) quantityInput.focus();
    }, 100);
}

function setRestockQuantity(quantity) {
    const input = document.getElementById('restockQuantity');
    if (input) {
        input.value = Math.max(1, quantity);
    }
}

function closeRestockModal() {
    const modal = document.getElementById('restockModal');
    if (modal) {
        modal.style.display = 'none';
    }
    document.body.style.overflow = 'auto';
    currentRestockItem = null;
}

async function addNewItem() {
    const itemName = document.getElementById('itemName').value.trim();
    const category = document.getElementById('itemCategory').value;
    const initialStock = parseInt(document.getElementById('initialStock').value);
    const minStock = parseInt(document.getElementById('minStock').value);
    const price = parseFloat(document.getElementById('price').value);
    
    if (!itemName || !category || isNaN(initialStock) || isNaN(minStock) || isNaN(price)) {
        return;
    }
    
    if (minStock <= 0) {
        return;
    }
    
    const newItem = {
        id: generateId(),
        name: itemName,
        category: category,
        currentStock: initialStock,
        minStock: minStock,
        price: price,
        lastRestock: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        status: calculateStatus({ currentStock: initialStock, minStock: minStock })
    };
    
    try {
        const savedItem = await saveItemToDatabase(newItem);
        menuData.push(savedItem);
        
        updateSalesDataWithNewItem(savedItem);
        syncMenuForStaff();
        
        updateMenuSummary();
        renderMenuGrid();
        closeRestockModal();
        
        logActivity('ADD_ITEM', `Added new menu item: ${itemName}`, {
            itemId: savedItem.id,
            category: category,
            initialStock: initialStock
        });
    } catch (error) {
        console.error('Error adding item:', error);
    }
}

async function submitRestock() {
    if (!currentRestockItem) {
        return;
    }
    
    const restockQuantity = parseInt(document.getElementById('restockQuantity').value);
    const restockCost = parseFloat(document.getElementById('restockCost').value);
    
    if (isNaN(restockQuantity) || restockQuantity <= 0) {
        return;
    }
    
    if (isNaN(restockCost) || restockCost < 0) {
        return;
    }
    
    try {
        const itemIndex = menuData.findIndex(i => i.id == currentRestockItem.id);
        if (itemIndex === -1) {
            return;
        }
        
        const oldStock = menuData[itemIndex].currentStock;
        menuData[itemIndex].currentStock += restockQuantity;
        menuData[itemIndex].lastRestock = new Date().toISOString().split('T')[0];
        menuData[itemIndex].status = calculateStatus(menuData[itemIndex]);
        
        const restockRecord = {
            itemId: currentRestockItem.id,
            itemName: currentRestockItem.name,
            quantity: restockQuantity,
            unitCost: restockCost / restockQuantity,
            totalCost: restockCost,
            date: new Date().toISOString(),
            userId: getCurrentUserId(),
            previousStock: oldStock,
            newStock: menuData[itemIndex].currentStock
        };
        
        await saveRestockRecord(restockRecord);
        
        updateMenuCostTracking(currentRestockItem.name, restockCost, restockQuantity);
        
        syncMenuForStaff();
        updateMenuSummary();
        renderMenuGrid();
        closeRestockModal();
        
        logActivity('RESTOCK', `Restocked ${restockQuantity} units of ${currentRestockItem.name}`, {
            itemId: currentRestockItem.id,
            quantity: restockQuantity,
            cost: restockCost
        });
    } catch (error) {
        console.error('Error restocking:', error);
    }
}

function filterMenu() {
    const statusFilter = document.getElementById('statusFilter');
    const categoryFilter = document.getElementById('categoryFilter');
    
    if (!statusFilter || !categoryFilter) return;
    
    const statusValue = statusFilter.value;
    const categoryValue = categoryFilter.value;
    
    filteredMenu = menuData.filter(item => {
        if (statusValue !== 'all') {
            if (!item.status || item.status !== statusValue) {
                return false;
            }
        }
        
        if (categoryValue !== 'all') {
            if (!item.category || item.category !== categoryValue) {
                return false;
            }
        }
        
        return true;
    });
    
    renderMenuGrid();
    updateFilterBadges(statusValue, categoryValue);
}

function updateFilterBadges(status, category) {
    const filterBadges = document.getElementById('filterBadges');
    if (!filterBadges) return;
    
    filterBadges.innerHTML = '';
    
    const filters = [];
    if (status !== 'all') filters.push(`Status: ${status}`);
    if (category !== 'all') filters.push(`Category: ${category}`);
    
    filters.forEach(filter => {
        const badge = document.createElement('span');
        badge.className = 'filter-badge';
        badge.textContent = filter;
        filterBadges.appendChild(badge);
    });
    
    if (filters.length > 0) {
        const clearBtn = document.createElement('button');
        clearBtn.className = 'btn-tiny';
        clearBtn.textContent = 'Clear All';
        clearBtn.onclick = clearAllFilters;
        filterBadges.appendChild(clearBtn);
    }
}

function clearAllFilters() {
    const statusFilter = document.getElementById('statusFilter');
    const categoryFilter = document.getElementById('categoryFilter');
    
    if (statusFilter) statusFilter.value = 'all';
    if (categoryFilter) categoryFilter.value = 'all';
    
    filteredMenu = [];
    renderMenuGrid();
    updateFilterBadges('all', 'all');
}

function searchMenu(searchTerm) {
    clearTimeout(searchTimeout);
    
    searchTimeout = setTimeout(() => {
        const term = searchTerm.toLowerCase().trim();
        
        if (!term) {
            filteredMenu = [];
            renderMenuGrid();
            return;
        }
        
        filteredMenu = menuData.filter(item => {
            return (
                (item.name && item.name.toLowerCase().includes(term)) ||
                (item.category && item.category.toLowerCase().includes(term))
            );
        });
        
        renderMenuGrid();
        
        const searchResults = document.getElementById('searchResults');
        if (searchResults) {
            if (filteredMenu.length > 0) {
                searchResults.textContent = `${filteredMenu.length} items found`;
            } else {
                searchResults.textContent = 'No items found';
            }
        }
    }, 300);
}

function exportMenu() {
    const dataToExport = filteredMenu.length > 0 ? filteredMenu : menuData;
    
    if (dataToExport.length === 0) {
        return;
    }
    
    const headers = ['Name', 'Category', 'Current Stock', 'Min Stock', 'Price', 'Status', 'Last Restock', 'Total Value'];
    const rows = dataToExport.map(item => {
        const totalValue = (item.currentStock || 0) * (item.price || 0);
        return [
            `"${item.name || ''}"`,
            `"${item.category || ''}"`,
            item.currentStock || 0,
            item.minStock || 0,
            (item.price || 0).toFixed(2),
            `"${item.status || ''}"`,
            `"${item.lastRestock || ''}"`,
            totalValue.toFixed(2)
        ];
    });
    
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `menu_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportToCSV() {
    exportMenu();
}

async function exportToPDF() {
    // PDF export implementation
}

function editItem(itemId) {
    const item = menuData.find(i => i.id == itemId);
    if (!item) {
        return;
    }
    
    currentEditItem = item;
    const modal = document.getElementById('editModal');
    const editContent = document.getElementById('editContent');
    
    if (!modal || !editContent) return;
    
    editContent.innerHTML = `
        <form id="editItemForm" onsubmit="event.preventDefault(); submitEditItem();">
            <div class="form-group">
                <label for="editItemName">Menu Item Name *</label>
                <input type="text" id="editItemName" value="${item.name}" required>
            </div>
            <div class="form-group">
                <label for="editCategory">Category *</label>
                <select id="editCategory" required>
                    <option value="">Select Category</option>
                    <option value="Meal" ${item.category === 'Meal' ? 'selected' : ''}>Rice Bowl Meals</option>
                    <option value="Hot Sizzlers" ${item.category === 'Hot Sizzlers' ? 'selected' : ''}>Hot Sizzlers</option>
                    <option value="Party Tray" ${item.category === 'Party Tray' ? 'selected' : ''}>Party Tray</option>
                    <option value="Drinks" ${item.category === 'Drinks' ? 'selected' : ''}>Drinks</option>
                    <option value="Coffee" ${item.category === 'Coffee' ? 'selected' : ''}>Coffee</option>
                    <option value="Milk Tea" ${item.category === 'Milk Tea' ? 'selected' : ''}>Milk Tea</option>
                    <option value="Frappe" ${item.category === 'Frappe' ? 'selected' : ''}>Frappe</option>
                    <option value="Snacks & Appetizer" ${item.category === 'Snacks & Appetizer' ? 'selected' : ''}>Snacks & Appetizer</option>
                    <option value="Budget Meals" ${item.category === 'Budget Meals' ? 'selected' : ''}>Budget Meals</option>
                    <option value="Specialties" ${item.category === 'Specialties' ? 'selected' : ''}>Specialties</option>
                    <option value="Other" ${item.category === 'Other' ? 'selected' : ''}>Other</option>
                </select>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="editCurrentStock">Current Stock *</label>
                    <input type="number" id="editCurrentStock" value="${item.currentStock}" min="0" required>
                </div>
                <div class="form-group">
                    <label for="editMinStock">Minimum Stock *</label>
                    <input type="number" id="editMinStock" value="${item.minStock}" min="1" required>
                </div>
            </div>
            <div class="form-group">
                <label for="editPrice">Price (₱) *</label>
                <input type="number" id="editPrice" value="${item.price}" min="0" step="0.01" required>
            </div>
            <div class="modal-actions">
                <button type="button" class="btn-secondary" onclick="closeEditModal()">Cancel</button>
                <button type="submit" class="btn-primary">Save Changes</button>
            </div>
        </form>
    `;
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeEditModal() {
    const modal = document.getElementById('editModal');
    if (modal) {
        modal.style.display = 'none';
    }
    document.body.style.overflow = 'auto';
    currentEditItem = null;
}

function submitEditItem() {
    if (!currentEditItem) return;
    
    const itemName = document.getElementById('editItemName').value.trim();
    const category = document.getElementById('editCategory').value;
    const currentStock = parseInt(document.getElementById('editCurrentStock').value);
    const minStock = parseInt(document.getElementById('editMinStock').value);
    const price = parseFloat(document.getElementById('editPrice').value);
    
    if (!itemName || !category || isNaN(currentStock) || isNaN(minStock) || isNaN(price)) {
        return;
    }
    
    const itemIndex = menuData.findIndex(i => i.id == currentEditItem.id);
    if (itemIndex === -1) {
        return;
    }
    
    const oldItem = { ...menuData[itemIndex] };
    
    menuData[itemIndex] = {
        ...menuData[itemIndex],
        name: itemName,
        category: category,
        currentStock: currentStock,
        minStock: minStock,
        price: price,
        status: calculateStatus({ currentStock: currentStock, minStock: minStock }),
        updatedAt: new Date().toISOString()
    };
    
    syncMenuForStaff();
    updateMenuSummary();
    renderMenuGrid();
    closeEditModal();
    
    logActivity('EDIT_ITEM', `Edited menu item: ${itemName}`, {
        itemId: currentEditItem.id,
        changes: getChanges(oldItem, menuData[itemIndex])
    });
}

function getChanges(oldItem, newItem) {
    const changes = [];
    Object.keys(newItem).forEach(key => {
        if (oldItem[key] !== newItem[key] && !['updatedAt', 'status'].includes(key)) {
            changes.push(`${key}: ${oldItem[key]} → ${newItem[key]}`);
        }
    });
    return changes;
}

function showDeleteModal(itemId) {
    const item = menuData.find(i => i.id == itemId);
    if (!item) {
        return;
    }
    
    currentEditItem = item;
    const modal = document.getElementById('deleteModal');
    const deleteContent = document.getElementById('deleteContent');
    
    if (!modal || !deleteContent) return;
    
    deleteContent.innerHTML = `
        <div class="delete-confirmation">
            <div class="delete-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h3>Delete Menu Item</h3>
            <p>Are you sure you want to delete <strong>"${item.name}"</strong>?</p>
            <p class="text-warning">This action cannot be undone.</p>
            
            <div class="item-details">
                <p><strong>Current Stock:</strong> ${item.currentStock} units</p>
                <p><strong>Stock Value:</strong> ₱${(item.currentStock * item.price).toFixed(2)}</p>
                <p><strong>Category:</strong> ${item.category}</p>
            </div>
            
            <div class="modal-actions">
                <button type="button" class="btn-secondary" onclick="closeDeleteModal()">Cancel</button>
                <button type="button" class="btn-danger" onclick="confirmDeleteItem()">
                    <i class="fas fa-trash"></i> Delete Item
                </button>
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeDeleteModal() {
    const modal = document.getElementById('deleteModal');
    if (modal) {
        modal.style.display = 'none';
    }
    document.body.style.overflow = 'auto';
    currentEditItem = null;
}

function confirmDeleteItem() {
    if (!currentEditItem) return;
    
    const itemIndex = menuData.findIndex(i => i.id == currentEditItem.id);
    
    if (itemIndex === -1) {
        return;
    }
    
    const deletedItem = menuData.splice(itemIndex, 1)[0];
    
    syncMenuForStaff();
    updateMenuSummary();
    renderMenuGrid();
    closeDeleteModal();
    
    logActivity('DELETE_ITEM', `Deleted menu item: ${deletedItem.name}`, {
        itemId: deletedItem.id,
        stockValue: deletedItem.currentStock * deletedItem.price
    });
}

function quickRestock(itemId) {
    const item = menuData.find(i => i.id == itemId);
    if (!item) return;
    
    const quickAmount = Math.max(10, item.minStock - item.currentStock);
    
    if (confirm(`Quick restock ${quickAmount} units of ${item.name}?`)) {
        const itemIndex = menuData.findIndex(i => i.id == itemId);
        menuData[itemIndex].currentStock += quickAmount;
        menuData[itemIndex].lastRestock = new Date().toISOString().split('T')[0];
        menuData[itemIndex].status = calculateStatus(menuData[itemIndex]);
        
        syncMenuForStaff();
        updateMenuSummary();
        renderMenuGrid();
        
        logActivity('QUICK_RESTOCK', `Quick restocked ${quickAmount} units of ${item.name}`, {
            itemId: item.id,
            quantity: quickAmount
        });
    }
}

function showItemDetails(itemId) {
    const item = menuData.find(i => i.id == itemId);
    if (!item) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${item.name} - Details</h3>
                <button class="close-modal" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="item-details-grid">
                    <div class="detail-row">
                        <span class="detail-label">Category:</span>
                        <span class="detail-value">${item.category}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Stock Level:</span>
                        <span class="detail-value">
                            ${item.currentStock} / ${item.minStock} units
                            <span class="status-badge ${getStatusInfo(item.status).class}">
                                ${getStatusInfo(item.status).text}
                            </span>
                        </span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Price:</span>
                        <span class="detail-value">₱${item.price.toFixed(2)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Stock Value:</span>
                        <span class="detail-value">₱${(item.currentStock * item.price).toFixed(2)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Last Restock:</span>
                        <span class="detail-value">${formatDate(item.lastRestock)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Created:</span>
                        <span class="detail-value">${formatDate(item.createdAt)}</span>
                    </div>
                </div>
                
                <div class="detail-actions">
                    <button class="btn-small btn-primary" onclick="showRestockForm('${item.id}'); this.parentElement.parentElement.parentElement.parentElement.remove()">
                        <i class="fas fa-plus"></i> Restock
                    </button>
                    <button class="btn-small btn-secondary" onclick="editItem('${item.id}'); this.parentElement.parentElement.parentElement.parentElement.remove()">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-small btn-danger" onclick="showDeleteModal('${item.id}'); this.parentElement.parentElement.parentElement.parentElement.remove()">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
}

function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('bulkSelectAll');
    const itemCheckboxes = document.querySelectorAll('.item-checkbox');
    
    if (!selectAllCheckbox) return;
    
    selectedItems.clear();
    
    itemCheckboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
        if (selectAllCheckbox.checked) {
            selectedItems.add(checkbox.dataset.id);
        }
    });
    
    updateBulkActions();
}

function toggleItemSelection(itemId, isSelected) {
    if (isSelected) {
        selectedItems.add(itemId);
    } else {
        selectedItems.delete(itemId);
        const selectAllCheckbox = document.getElementById('bulkSelectAll');
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = false;
        }
    }
    
    updateBulkActions();
}

function updateBulkActions() {
    const bulkRestockBtn = document.getElementById('bulkRestockBtn');
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
    const bulkExportBtn = document.getElementById('bulkExportBtn');
    const selectedCount = document.getElementById('selectedCount');
    
    const count = selectedItems.size;
    
    if (selectedCount) {
        selectedCount.textContent = count;
        selectedCount.style.display = count > 0 ? 'inline-block' : 'none';
    }
    
    if (bulkRestockBtn) bulkRestockBtn.disabled = count === 0;
    if (bulkDeleteBtn) bulkDeleteBtn.disabled = count === 0;
    if (bulkExportBtn) bulkExportBtn.disabled = count === 0;
}

function showBulkRestock() {
    if (selectedItems.size === 0) {
        return;
    }
    
    const modal = document.getElementById('bulkModal');
    const bulkContent = document.getElementById('bulkContent');
    
    if (!modal || !bulkContent) return;
    
    const items = Array.from(selectedItems).map(id => menuData.find(i => i.id === id));
    
    bulkContent.innerHTML = `
        <form id="bulkRestockForm" onsubmit="event.preventDefault(); submitBulkRestock();">
            <h3>Bulk Restock (${selectedItems.size} items)</h3>
            
            <div class="bulk-items-list">
                ${items.map(item => `
                    <div class="bulk-item">
                        <strong>${item.name}</strong>
                        <span>Current: ${item.currentStock} | Min: ${item.minStock}</span>
                        <input type="number" 
                               class="bulk-quantity" 
                               data-id="${item.id}"
                               value="${Math.max(10, item.minStock - item.currentStock)}"
                               min="1"
                               placeholder="Quantity">
                    </div>
                `).join('')}
            </div>
            
            <div class="form-group">
                <label for="bulkRestockCost">Total Cost (₱)</label>
                <input type="number" id="bulkRestockCost" min="0" step="0.01" value="0.00">
            </div>
            
            <div class="modal-actions">
                <button type="button" class="btn-secondary" onclick="closeBulkModal()">Cancel</button>
                <button type="submit" class="btn-primary">Restock All</button>
            </div>
        </form>
    `;
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeBulkModal() {
    const modal = document.getElementById('bulkModal');
    if (modal) {
        modal.style.display = 'none';
    }
    document.body.style.overflow = 'auto';
    selectedItems.clear();
    updateBulkActions();
}

function submitBulkRestock() {
    const quantityInputs = document.querySelectorAll('.bulk-quantity');
    const totalCost = parseFloat(document.getElementById('bulkRestockCost').value) || 0;
    
    let totalRestocked = 0;
    let itemsRestocked = [];
    
    quantityInputs.forEach(input => {
        const itemId = input.dataset.id;
        const quantity = parseInt(input.value) || 0;
        
        if (quantity > 0) {
            const itemIndex = menuData.findIndex(i => i.id === itemId);
            if (itemIndex !== -1) {
                menuData[itemIndex].currentStock += quantity;
                menuData[itemIndex].lastRestock = new Date().toISOString().split('T')[0];
                menuData[itemIndex].status = calculateStatus(menuData[itemIndex]);
                
                totalRestocked += quantity;
                itemsRestocked.push(menuData[itemIndex].name);
            }
        }
    });
    
    syncMenuForStaff();
    updateMenuSummary();
    renderMenuGrid();
    closeBulkModal();
    
    logActivity('BULK_RESTOCK', `Bulk restocked ${itemsRestocked.length} items`, {
        items: itemsRestocked,
        totalQuantity: totalRestocked,
        totalCost: totalCost
    });
}

function showBulkDelete() {
    if (selectedItems.size === 0) {
        return;
    }
    
    if (confirm(`Delete ${selectedItems.size} selected items? This action cannot be undone.`)) {
        const itemsToDelete = Array.from(selectedItems);
        let deletedCount = 0;
        
        itemsToDelete.forEach(itemId => {
            const itemIndex = menuData.findIndex(i => i.id === itemId);
            if (itemIndex !== -1) {
                menuData.splice(itemIndex, 1)[0];
                deletedCount++;
            }
        });
        
        syncMenuForStaff();
        updateMenuSummary();
        renderMenuGrid();
        selectedItems.clear();
        updateBulkActions();
        
        logActivity('BULK_DELETE', `Deleted ${deletedCount} items in bulk`, {
            count: deletedCount
        });
    }
}

function bulkExportItems() {
    if (selectedItems.size === 0) {
        return;
    }
    
    const itemsToExport = Array.from(selectedItems).map(id => 
        menuData.find(i => i.id === id)
    ).filter(Boolean);
    
    const headers = ['Name', 'Category', 'Current Stock', 'Min Stock', 'Price', 'Status'];
    const rows = itemsToExport.map(item => {
        return [
            `"${item.name || ''}"`,
            `"${item.category || ''}"`,
            item.currentStock || 0,
            item.minStock || 0,
            (item.price || 0).toFixed(2),
            `"${item.status || ''}"`
        ];
    });
    
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `selected_menu_items_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function quickFilter(status) {
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.value = status;
        filterMenu();
    }
}

function sortMenu(field, direction) {
    sortConfig = { field, direction };
    
    const sortedData = [...menuData].sort((a, b) => {
        let aValue = a[field];
        let bValue = b[field];
        
        if (field === 'name' || field === 'category' || field === 'status') {
            aValue = aValue || '';
            bValue = bValue || '';
            return direction === 'asc' 
                ? aValue.localeCompare(bValue)
                : bValue.localeCompare(aValue);
        } else {
            aValue = aValue || 0;
            bValue = bValue || 0;
            return direction === 'asc' ? aValue - bValue : bValue - aValue;
        }
    });
    
    menuData = sortedData;
    renderMenuGrid();
    
    const sortIndicator = document.getElementById('sortIndicator');
    if (sortIndicator) {
        sortIndicator.textContent = `Sorted by: ${field} (${direction})`;
    }
}

function refreshMenu() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        refreshBtn.disabled = true;
    }
    
    loadMenuData();
    
    setTimeout(() => {
        if (refreshBtn) {
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
            refreshBtn.disabled = false;
        }
    }, 1000);
}

function printMenu() {
    const printContent = document.getElementById('menuGrid').innerHTML;
    const originalContent = document.body.innerHTML;
    
    document.body.innerHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Menu Report - ${new Date().toLocaleDateString()}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .print-header { text-align: center; margin-bottom: 30px; }
                .print-header h1 { margin: 0; color: #333; }
                .print-header p { margin: 5px 0; color: #666; }
                .menu-card { 
                    border: 1px solid #ddd; 
                    margin-bottom: 15px; 
                    padding: 15px; 
                    page-break-inside: avoid;
                }
                .status-badge { 
                    display: inline-block; 
                    padding: 3px 8px; 
                    border-radius: 12px; 
                    font-size: 12px; 
                    margin-left: 10px;
                }
                .status-sufficient { background: #d4edda; color: #155724; }
                .status-low { background: #fff3cd; color: #856404; }
                .status-critical { background: #f8d7da; color: #721c24; }
                .status-out { background: #f5f5f5; color: #6c757d; }
                @media print {
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="print-header">
                <h1>Menu Management Report</h1>
                <p>Generated: ${new Date().toLocaleString()}</p>
                <p>Total Menu Items: ${menuData.length}</p>
            </div>
            ${printContent}
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() {
                        window.history.back();
                    }, 100);
                };
            </script>
        </body>
        </html>
    `;
    
    window.print();
    document.body.innerHTML = originalContent;
    renderMenuGrid();
}

function showLowStockReport() {
    const lowStockItems = menuData.filter(item => 
        item.status === 'low' || item.status === 'critical' || item.status === 'out'
    );
    
    if (lowStockItems.length === 0) {
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content large-modal">
            <div class="modal-header">
                <h3>Low Stock Report (${lowStockItems.length} items)</h3>
                <button class="close-modal" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</button>
            </div>
            <div class="modal-body">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Menu Item</th>
                            <th>Category</th>
                            <th>Current Stock</th>
                            <th>Min Stock</th>
                            <th>Needed</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${lowStockItems.map(item => `
                            <tr>
                                <td>${item.name}</td>
                                <td>${item.category}</td>
                                <td>${item.currentStock}</td>
                                <td>${item.minStock}</td>
                                <td class="${item.currentStock < item.minStock ? 'text-danger' : ''}">
                                    ${Math.max(0, item.minStock - item.currentStock)}
                                </td>
                                <td><span class="status-badge ${getStatusInfo(item.status).class}">
                                    ${getStatusInfo(item.status).text}
                                </span></td>
                                <td>
                                    <button class="btn-tiny btn-primary" 
                                            onclick="showRestockForm('${item.id}'); this.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.remove()">
                                        Restock
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="report-summary">
                    <h4>Summary</h4>
                    <p>Total items needing restock: ${lowStockItems.length}</p>
                    <p>Total units needed: ${lowStockItems.reduce((sum, item) => sum + Math.max(0, item.minStock - item.currentStock), 0)}</p>
                    <button class="btn-primary" onclick="restockAllLow()">
                        <i class="fas fa-bolt"></i> Restock All Critical Items
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
}

function restockAllLow() {
    const criticalItems = menuData.filter(item => item.status === 'critical');
    
    if (criticalItems.length === 0) {
        return;
    }
    
    if (confirm(`Quick restock all ${criticalItems.length} critical items to minimum stock level?`)) {
        let totalRestocked = 0;
        
        criticalItems.forEach(item => {
            const itemIndex = menuData.findIndex(i => i.id === item.id);
            if (itemIndex !== -1) {
                const needed = Math.max(10, item.minStock - item.currentStock);
                menuData[itemIndex].currentStock += needed;
                menuData[itemIndex].lastRestock = new Date().toISOString().split('T')[0];
                menuData[itemIndex].status = calculateStatus(menuData[itemIndex]);
                totalRestocked += needed;
            }
        });
        
        syncMenuForStaff();
        updateMenuSummary();
        renderMenuGrid();
        
        logActivity('RESTOCK_ALL_LOW', `Restocked all critical items`, {
            itemsCount: criticalItems.length,
            totalUnits: totalRestocked
        });
    }
}

function generateStockReport() {
    const categories = [...new Set(menuData.map(item => item.category))];
    let reportHTML = `
        <div class="stock-report">
            <h3>Menu Stock Level Report</h3>
            <p>Generated: ${new Date().toLocaleString()}</p>
            
            <div class="report-summary">
                <h4>Overall Summary</h4>
                <p>Total Menu Items: ${menuData.length}</p>
                <p>Total Stock Value: ₱${calculateMenuValue().toFixed(2)}</p>
            </div>
    `;
    
    categories.forEach(category => {
        const categoryItems = menuData.filter(item => item.category === category);
        const categoryValue = categoryItems.reduce((sum, item) => 
            sum + (item.currentStock * item.price), 0);
        
        reportHTML += `
            <div class="category-section">
                <h4>${category} (${categoryItems.length} items)</h4>
                <p>Category Value: ₱${categoryValue.toFixed(2)}</p>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Menu Item</th>
                            <th>Stock</th>
                            <th>Min</th>
                            <th>Status</th>
                            <th>Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${categoryItems.map(item => `
                            <tr>
                                <td>${item.name}</td>
                                <td>${item.currentStock}</td>
                                <td>${item.minStock}</td>
                                <td><span class="status-badge ${getStatusInfo(item.status).class}">
                                    ${getStatusInfo(item.status).text}
                                </span></td>
                                <td>₱${(item.currentStock * item.price).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    });
    
    reportHTML += '</div>';
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Menu Stock Level Report</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f5f5f5; }
                .status-badge { 
                    display: inline-block; 
                    padding: 3px 8px; 
                    border-radius: 12px; 
                    font-size: 12px; 
                }
                .status-sufficient { background: #d4edda; color: #155724; }
                .status-low { background: #fff3cd; color: #856404; }
                .status-critical { background: #f8d7da; color: #721c24; }
                .status-out { background: #f5f5f5; color: #6c757d; }
                .category-section { margin-bottom: 30px; page-break-inside: avoid; }
            </style>
        </head>
        <body>
            ${reportHTML}
            <script>
                window.onload = function() {
                    window.print();
                };
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

function showRestockHistory() {
    const restockHistory = JSON.parse(localStorage.getItem('restockHistory') || '[]');
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content large-modal">
            <div class="modal-header">
                <h3>Restock History</h3>
                <button class="close-modal" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</button>
            </div>
            <div class="modal-body">
                ${restockHistory.length === 0 ? 
                    '<p class="empty-state">No restock history found.</p>' : 
                    `
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Menu Item</th>
                                <th>Quantity</th>
                                <th>Unit Cost</th>
                                <th>Total Cost</th>
                                <th>By</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${restockHistory.slice(0, 50).map(record => `
                                <tr>
                                    <td>${formatDate(record.date)}</td>
                                    <td>${record.itemName}</td>
                                    <td>${record.quantity}</td>
                                    <td>₱${record.unitCost?.toFixed(2) || '0.00'}</td>
                                    <td>₱${record.totalCost?.toFixed(2) || '0.00'}</td>
                                    <td>${record.userId || 'System'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div class="history-summary">
                        <p>Total Restocks: ${restockHistory.length}</p>
                        <p>Total Cost: ₱${restockHistory.reduce((sum, r) => sum + (r.totalCost || 0), 0).toFixed(2)}</p>
                    </div>
                    `
                }
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
}

function hideTooltip() {
    const tooltip = document.getElementById('currentTooltip');
    if (tooltip) {
        tooltip.remove();
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
        <button class="close-notification" onclick="this.parentElement.remove()">&times;</button>
    `;
    
    const container = document.getElementById('notificationContainer');
    if (!container) {
        const newContainer = document.createElement('div');
        newContainer.id = 'notificationContainer';
        newContainer.className = 'notification-container';
        document.body.appendChild(newContainer);
        newContainer.appendChild(notification);
    } else {
        container.appendChild(notification);
    }
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

function syncMenuForStaff() {
    try {
        // Save to localStorage for staff dashboard to read
        localStorage.setItem('menuData', JSON.stringify(menuData));
        
        // Broadcast update for real-time sync
        if (typeof BroadcastChannel !== 'undefined') {
            try {
                const channel = new BroadcastChannel('menu_updates');
                channel.postMessage({
                    type: 'menu_updated',
                    data: menuData,
                    timestamp: new Date().toISOString()
                });
                channel.close();
            } catch (e) {
                console.log('BroadcastChannel not supported');
            }
        }
        
        // Trigger storage event
        const event = new StorageEvent('storage', {
            key: 'menuData',
            newValue: JSON.stringify(menuData),
            oldValue: null,
            url: window.location.href
        });
        window.dispatchEvent(event);
        
        console.log('Menu synchronized with staff dashboard');
    } catch (error) {
        console.error('Error syncing menu:', error);
    }
}

function logActivity(action, description, details = {}) {
    const activityLog = JSON.parse(localStorage.getItem('activityLog') || '[]');
    
    activityLog.unshift({
        timestamp: new Date().toISOString(),
        action: action,
        description: description,
        details: details,
        user: getCurrentUserId()
    });
    
    if (activityLog.length > 100) {
        activityLog.length = 100;
    }
    
    localStorage.setItem('activityLog', JSON.stringify(activityLog));
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatDate(dateString) {
    if (!dateString) return 'Never';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        return 'Invalid date';
    }
}

function getCurrentUserId() {
    return localStorage.getItem('userId') || 'admin';
}

function closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
    document.body.style.overflow = 'auto';
}

async function saveItemToDatabase(item) {
    return new Promise(resolve => {
        setTimeout(() => {
            const savedItem = { ...item, id: item.id || generateId() };
            localStorage.setItem('menuData', JSON.stringify(menuData));
            resolve(savedItem);
        }, 300);
    });
}

async function saveRestockRecord(record) {
    return new Promise(resolve => {
        setTimeout(() => {
            const restockHistory = JSON.parse(localStorage.getItem('restockHistory') || '[]');
            restockHistory.unshift(record);
            localStorage.setItem('restockHistory', JSON.stringify(restockHistory));
            resolve(record);
        }, 300);
    });
}

function loadSalesData() {
    const savedSales = localStorage.getItem('cafeSales');
    const savedWeeklySales = localStorage.getItem('cafeWeeklySales');
    const savedDailySales = localStorage.getItem('cafeDailySales');
    
    if (savedSales) salesData = JSON.parse(savedSales);
    if (savedWeeklySales) weeklySales = JSON.parse(savedWeeklySales);
    if (savedDailySales) dailySales = JSON.parse(savedDailySales);
    
    if (!Object.keys(weeklySales).length) {
        initializeWeeklySales();
    }
}

function initializeWeeklySales() {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date().getDay();
    const adjustedToday = today === 0 ? 6 : today - 1;
    
    days.forEach((day, index) => {
        weeklySales[day] = {
            total: index <= adjustedToday ? Math.floor(Math.random() * 5000) + 1000 : 0,
            date: getDateForDay(index),
            items: {}
        };
    });
    
    saveSalesData();
}

function initializeWeeklyChart() {
    const chartBars = document.querySelector('.chart-bars');
    if (!chartBars) return;
    
    chartBars.innerHTML = '';
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const maxValue = Math.max(...Object.values(weeklySales).map(day => day.total));
    
    days.forEach(day => {
        const dayData = weeklySales[day];
        const height = maxValue > 0 ? (dayData.total / maxValue * 100) : 0;
        
        const barContainer = document.createElement('div');
        barContainer.className = 'chart-bar-container';
        barContainer.onclick = () => showDaySales(day);
        
        const bar = document.createElement('div');
        bar.className = 'chart-bar';
        bar.style.height = `${height}%`;
        bar.setAttribute('data-day', day);
        bar.setAttribute('data-sales', dayData.total);
        
        const barLabel = document.createElement('div');
        barLabel.className = 'chart-bar-label';
        barLabel.textContent = `₱${dayData.total.toLocaleString()}`;
        
        barContainer.appendChild(bar);
        barContainer.appendChild(barLabel);
        chartBars.appendChild(barContainer);
    });
}

function updateDashboard() {
    calculateTotalRevenue();
    updateSalesChart();
    saveAllData();
}

function calculateTotalRevenue() {
    const totalRevenueEl = document.querySelector('.total-revenue');
    const chartFooterSales = document.querySelector('.chart-footer p');
    const updatedTimeEl = document.querySelector('.updated-time');
    
    let totalRevenue = 0;
    Object.values(weeklySales).forEach(day => {
        totalRevenue += day.total;
    });
    
    if (totalRevenueEl) {
        totalRevenueEl.innerHTML = `<strong>Total Revenue:</strong> ₱${totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    }
    if (chartFooterSales) {
        chartFooterSales.innerHTML = `<strong>Total Sales This Week:</strong> ₱${totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    }
    if (updatedTimeEl) {
        const now = new Date();
        updatedTimeEl.textContent = `Updated: ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    }
}

function updateSalesChart() {
    const bars = document.querySelectorAll('.chart-bar');
    const maxValue = Math.max(...Object.values(weeklySales).map(day => day.total));
    
    bars.forEach(bar => {
        const day = bar.getAttribute('data-day');
        const dayData = weeklySales[day];
        const height = maxValue > 0 ? (dayData.total / maxValue * 100) : 0;
        bar.style.height = `${height}%`;
        
        const container = bar.parentElement;
        const label = container.querySelector('.chart-bar-label');
        if (label) {
            label.textContent = `₱${dayData.total.toLocaleString()}`;
        }
    });
}

function showDaySales(day) {
    const modalDayTitle = document.getElementById('modalDayTitle');
    const salesDetailsEl = document.getElementById('salesDetails');
    const daySalesModal = document.getElementById('daySalesModal');
    
    if (!modalDayTitle || !salesDetailsEl || !daySalesModal) return;
    
    const dayData = weeklySales[day];
    modalDayTitle.textContent = `Sales Details - ${day} (${dayData.date})`;
    
    let html = '';
    if (Object.keys(dayData.items).length > 0) {
        html = '<table class="sales-table"><tr><th>Menu Item</th><th>Quantity</th><th>Price</th><th>Total</th></tr>';
        
        Object.entries(dayData.items).forEach(([item, data]) => {
            html += `<tr>
                <td>${item}</td>
                <td>${data.quantity}</td>
                <td>₱${data.price.toFixed(2)}</td>
                <td>₱${(data.quantity * data.price).toFixed(2)}</td>
            </tr>`;
        });
        
        html += `<tr class="total-row">
            <td colspan="3"><strong>Total</strong></td>
            <td><strong>₱${dayData.total.toFixed(2)}</strong></td>
        </tr>`;
        html += '</table>';
    } else {
        html = '<p class="no-sales">No sales recorded for this day.</p>';
    }
    
    salesDetailsEl.innerHTML = html;
    daySalesModal.style.display = 'block';
}

function closeModal() {
    const daySalesModal = document.getElementById('daySalesModal');
    if (daySalesModal) {
        daySalesModal.style.display = 'none';
    }
}

function addSale(items) {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const todayIndex = new Date().getDay();
    const today = todayIndex === 0 ? 'Sun' : days[todayIndex - 1];
    
    if (!weeklySales[today]) {
        weeklySales[today] = {
            total: 0,
            date: new Date().toLocaleDateString(),
            items: {}
        };
    }
    
    let totalSale = 0;
    
    items.forEach(item => {
        const { name, quantity, price } = item;
        
        if (!weeklySales[today].items[name]) {
            weeklySales[today].items[name] = { quantity: 0, price };
        }
        weeklySales[today].items[name].quantity += quantity;
        totalSale += quantity * price;
    });
    
    weeklySales[today].total += totalSale;
    
    saveAllData();
    updateDashboard();
    
    return totalSale;
}

function getDateForDay(dayIndex) {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayIndex - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
    const date = new Date(today);
    date.setDate(today.getDate() + diff);
    return date.toLocaleDateString();
}

function saveAllData() {
    localStorage.setItem('cafeWeeklySales', JSON.stringify(weeklySales));
    localStorage.setItem('cafeDailySales', JSON.stringify(dailySales));
}

function saveSalesData() {
    localStorage.setItem('cafeWeeklySales', JSON.stringify(weeklySales));
    localStorage.setItem('cafeDailySales', JSON.stringify(dailySales));
}

function updateSalesDataWithNewItem(item) {
    loadSalesData();
    
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();
    const todayIndex = today.getDay();
    const currentDay = todayIndex === 0 ? 'Sun' : days[todayIndex - 1];
    
    if (!weeklySales[currentDay]) {
        weeklySales[currentDay] = {
            total: 0,
            date: today.toLocaleDateString(),
            items: {}
        };
    }
    
    if (!weeklySales[currentDay].items[item.name]) {
        weeklySales[currentDay].items[item.name] = {
            quantity: 0,
            price: item.price
        };
    }
    
    const menuStats = {
        itemId: item.id,
        itemName: item.name,
        category: item.category,
        currentStock: item.currentStock,
        price: item.price,
        lastUpdated: new Date().toISOString()
    };
    
    let menuTracking = localStorage.getItem('menuTracking');
    if (!menuTracking) {
        menuTracking = {};
    } else {
        menuTracking = JSON.parse(menuTracking);
    }
    
    menuTracking[item.id] = menuStats;
    localStorage.setItem('menuTracking', JSON.stringify(menuTracking));
    
    saveSalesData();
}

function updateMenuCostTracking(itemName, cost, quantity) {
    let costTracking = localStorage.getItem('menuCostTracking');
    if (!costTracking) {
        costTracking = {};
    } else {
        costTracking = JSON.parse(costTracking);
    }
    
    const today = new Date();
    const dateKey = today.toISOString().split('T')[0];
    
    if (!costTracking[dateKey]) {
        costTracking[dateKey] = {
            totalCost: 0,
            items: {}
        };
    }
    
    costTracking[dateKey].totalCost += cost;
    
    if (!costTracking[dateKey].items[itemName]) {
        costTracking[dateKey].items[itemName] = {
            quantity: 0,
            totalCost: 0,
            unitCost: cost / quantity
        };
    }
    
    costTracking[dateKey].items[itemName].quantity += quantity;
    costTracking[dateKey].items[itemName].totalCost += cost;
    
    localStorage.setItem('menuCostTracking', JSON.stringify(costTracking));
    
    updateDailySalesWithCosts(dateKey, cost);
}

function updateDailySalesWithCosts(dateKey, cost) {
    const savedDailySales = localStorage.getItem('cafeDailySales');
    if (savedDailySales) {
        dailySales = JSON.parse(savedDailySales);
    }
    
    if (!dailySales[dateKey]) {
        dailySales[dateKey] = {
            totalSales: 0,
            totalCosts: 0,
            profit: 0,
            itemsSold: {},
            menuCosts: 0
        };
    }
    
    dailySales[dateKey].menuCosts += cost;
    dailySales[dateKey].totalCosts += cost;
    
    dailySales[dateKey].profit = dailySales[dateKey].totalSales - dailySales[dateKey].totalCosts;
    
    localStorage.setItem('cafeDailySales', JSON.stringify(dailySales));
}

function recordSaleFromPOS(saleData) {
    loadSalesData();
    
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();
    const todayIndex = today.getDay();
    const currentDay = todayIndex === 0 ? 'Sun' : days[todayIndex - 1];
    const dateKey = today.toISOString().split('T')[0];
    
    if (!weeklySales[currentDay]) {
        weeklySales[currentDay] = {
            total: 0,
            date: today.toLocaleDateString(),
            items: {}
        };
    }
    
    if (!dailySales[dateKey]) {
        dailySales[dateKey] = {
            totalSales: 0,
            totalCosts: 0,
            profit: 0,
            itemsSold: {},
            menuCosts: 0
        };
    }
    
    saleData.items.forEach(item => {
        const { name, quantity, price } = item;
        
        if (!weeklySales[currentDay].items[name]) {
            weeklySales[currentDay].items[name] = { quantity: 0, price };
        }
        weeklySales[currentDay].items[name].quantity += quantity;
        weeklySales[currentDay].total += quantity * price;
        
        if (!dailySales[dateKey].itemsSold[name]) {
            dailySales[dateKey].itemsSold[name] = { quantity: 0, price };
        }
        dailySales[dateKey].itemsSold[name].quantity += quantity;
        dailySales[dateKey].totalSales += quantity * price;
        
        updateMenuStockAfterSale(name, quantity);
    });
    
    dailySales[dateKey].profit = dailySales[dateKey].totalSales - dailySales[dateKey].totalCosts;
    
    saveAllData();
    updateDashboard();
}

function updateMenuStockAfterSale(itemName, quantity) {
    const itemIndex = menuData.findIndex(item => item.name === itemName);
    if (itemIndex !== -1) {
        menuData[itemIndex].currentStock -= quantity;
        menuData[itemIndex].status = calculateStatus(menuData[itemIndex]);
        
        updateMenuSummary();
        renderMenuGrid();
        
        saveMenuData();
    }
}

function saveMenuData() {
    localStorage.setItem('menuData', JSON.stringify(menuData));
}

function getSalesReportData() {
    loadSalesData();
    
    return {
        weeklySales: weeklySales,
        dailySales: dailySales,
        menuData: menuData,
        costTracking: JSON.parse(localStorage.getItem('menuCostTracking') || '{}')
    };
}

function calculateMenuValue() {
    let totalValue = 0;
    menuData.forEach(item => {
        if (item.price && item.currentStock) {
            totalValue += item.currentStock * item.price;
        }
    });
    return totalValue;
}

function handleLogout() {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login';
}

// Update all window function exports with new names
window.showRestockModal = showRestockModal;
window.showRestockForm = showRestockForm;
window.submitRestock = submitRestock;
window.closeRestockModal = closeRestockModal;
window.filterMenu = filterMenu;
window.searchMenu = searchMenu;
window.exportMenu = exportMenu;
window.editItem = editItem;
window.handleLogout = handleLogout;
window.addNewItem = addNewItem;
window.closeModal = closeModal;
window.showDaySales = showDaySales;
window.recordSaleFromPOS = recordSaleFromPOS;
window.getSalesReportData = getSalesReportData;
window.calculateMenuValue = calculateMenuValue;
window.showDeleteModal = showDeleteModal;
window.confirmDeleteItem = confirmDeleteItem;
window.closeDeleteModal = closeDeleteModal;
window.showItemDetails = showItemDetails;
window.toggleSelectAll = toggleSelectAll;
window.toggleItemSelection = toggleItemSelection;
window.showBulkRestock = showBulkRestock;
window.closeBulkModal = closeBulkModal;
window.submitBulkRestock = submitBulkRestock;
window.showBulkDelete = showBulkDelete;
window.bulkExportItems = bulkExportItems;
window.quickFilter = quickFilter;
window.sortMenu = sortMenu;
window.refreshMenu = refreshMenu;
window.printMenu = printMenu;
window.exportToCSV = exportToCSV;
window.exportToPDF = exportToPDF;
window.showLowStockReport = showLowStockReport;
window.restockAllLow = restockAllLow;
window.generateStockReport = generateStockReport;
window.showRestockHistory = showRestockHistory;
window.quickRestock = quickRestock;
window.setRestockQuantity = setRestockQuantity;
window.closeEditModal = closeEditModal;
window.closeAllModals = closeAllModals;

window.onclick = function(event) {
    const daySalesModal = document.getElementById('daySalesModal');
    if (event.target === daySalesModal) {
        closeModal();
    }
};