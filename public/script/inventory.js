let inventoryData = [];
let filteredInventory = [];
let currentRestockProduct = null;
let salesData = {};
let weeklySales = {};
let dailySales = {};
let searchTimeout;
let editMode = false;
let currentEditProduct = null;
let selectedProducts = new Set();
let sortConfig = { field: 'name', direction: 'asc' };

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    loadInventoryData();
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
    if (bulkExportBtn) bulkExportBtn.addEventListener('click', bulkExportProducts);
    
    const printBtn = document.getElementById('printBtn');
    const exportCSVBtn = document.getElementById('exportCSV');
    const exportPDFBtn = document.getElementById('exportPDF');
    
    if (printBtn) printBtn.addEventListener('click', printInventory);
    if (exportCSVBtn) exportCSVBtn.addEventListener('click', exportToCSV);
    if (exportPDFBtn) exportPDFBtn.addEventListener('click', exportToPDF);
    
    const searchInput = document.getElementById('searchInventory');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            searchInventory(this.value);
        });
    }
    
    const statusFilter = document.getElementById('statusFilter');
    const categoryFilter = document.getElementById('categoryFilter');
    
    if (statusFilter) statusFilter.addEventListener('change', filterInventory);
    if (categoryFilter) categoryFilter.addEventListener('change', filterInventory);
    
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            const [field, direction] = this.value.split('-');
            sortInventory(field, direction);
        });
    }
    
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', refreshInventory);
    
    const addProductBtn = document.getElementById('addProductBtn');
    if (addProductBtn) addProductBtn.addEventListener('click', showRestockModal);
    
    // Low stock alert removed
}

function initializeQuickActions() {
    const quickActionContainer = document.getElementById('quickActions');
    if (!quickActionContainer) return;
    
    const actions = [
        { icon: 'fa-plus', text: 'Add Product', action: showRestockModal, color: 'primary' },
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
        const grid = document.getElementById('inventoryGrid');
        if (grid) {
            grid.classList.add('print-mode');
        }
    });
    
    window.addEventListener('afterprint', function() {
        const grid = document.getElementById('inventoryGrid');
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

async function loadInventoryData() {
    try {
        const response = await fetch('/api/inventory');
        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
                inventoryData = data;
            } else if (typeof data === 'object') {
                inventoryData = convertInventoryObjectToArray(data);
            }
        } else {
            const savedData = localStorage.getItem('inventoryData');
            inventoryData = savedData ? JSON.parse(savedData) : [];
        }
    } catch (error) {
        const savedData = localStorage.getItem('inventoryData');
        inventoryData = savedData ? JSON.parse(savedData) : [];
    }
    
    inventoryData.forEach(item => {
        if (!item.id) item.id = generateId();
        if (!item.status) item.status = calculateStatus(item);
        if (!item.lastRestock) item.lastRestock = new Date().toISOString().split('T')[0];
    });
    
    updateInventorySummary();
    renderInventoryGrid();
    updateQuickStats();
}

function convertInventoryObjectToArray(objData) {
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

function updateInventorySummary() {
    const totalProducts = inventoryData.length;
    let lowStock = 0;
    let outOfStock = 0;
    let criticalStock = 0;
    let totalValue = 0;
    let totalProductsValue = 0;

    inventoryData.forEach(item => {
        if (!item.status) {
            item.status = calculateStatus(item);
        }
        if (item.status === "low") lowStock++;
        if (item.status === "critical") criticalStock++;
        if (item.status === "out") outOfStock++;
        if (item.price && item.currentStock) {
            const itemValue = item.currentStock * item.price;
            totalValue += itemValue;
            totalProductsValue++;
        }
    });

    const totalEl = document.getElementById('totalInventoryProducts');
    const lowEl = document.getElementById('lowStockCount');
    const outEl = document.getElementById('outOfStockCount');
    const criticalEl = document.getElementById('criticalStockCount');
    const valueEl = document.getElementById('inventoryValue');
    const avgValueEl = document.getElementById('avgProductValue');
    
    if (totalEl) totalEl.textContent = totalProducts;
    if (lowEl) lowEl.textContent = lowStock;
    if (outEl) outEl.textContent = outOfStock;
    if (criticalEl) criticalEl.textContent = criticalStock;
    if (valueEl) valueEl.textContent = `₱${totalValue.toFixed(2)}`;
    if (avgValueEl && totalProductsValue > 0) {
        const avgValue = totalValue / totalProductsValue;
        avgValueEl.textContent = `₱${avgValue.toFixed(2)}`;
    }
    
}

function updateLowStockAlert(count) {
    const alertBadge = document.getElementById("lowStockAlertBadge");
    if (alertBadge) {
        if (count > 0) {
            alertBadge.textContent = count;
            alertBadge.style.display = "inline-block";
        } else {
            alertBadge.style.display = "none";
        }
    }
    
    const notificationBell = document.getElementById("notificationBell");
    if (notificationBell && count > 0) {
        notificationBell.classList.add("has-notification");
    }
}


function updateQuickStats() {
    const statsContainer = document.getElementById('quickStats');
    if (!statsContainer) return;
    
    const criticalProducts = inventoryData.filter(item => item.status === 'critical');
    const lowProducts = inventoryData.filter(item => item.status === 'low');
    
    statsContainer.innerHTML = `
        <div class="stat-card">
            <i class="fas fa-exclamation-triangle"></i>
            <div class="stat-content">
                <h4>${criticalProducts.length}</h4>
                <p>Critical Products</p>
            </div>
        </div>
        <div class="stat-card">
            <i class="fas fa-exclamation-circle"></i>
            <div class="stat-content">
                <h4>${lowProducts.length}</h4>
                <p>Low Stock Products</p>
            </div>
        </div>
        <div class="stat-card">
            <i class="fas fa-boxes"></i>
            <div class="stat-content">
                <h4>${inventoryData.length}</h4>
                <p>Total Products</p>
            </div>
        </div>
    `;
}

function renderInventoryGrid() {
    const inventoryGrid = document.getElementById('inventoryGrid');
    if (!inventoryGrid) return;
    
    const displayData = filteredInventory.length > 0 ? filteredInventory : inventoryData;
    
    if (displayData.length === 0) {
        inventoryGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open fa-3x"></i>
                <h3>No Inventory Products Found</h3>
                <p>Add your first inventory item to get started</p>
                <button class="btn-primary" onclick="showRestockModal()">
                    <i class="fas fa-plus"></i> Add First Product
                </button>
            </div>
        `;
        return;
    }
    
    inventoryGrid.innerHTML = '';
    
    displayData.forEach(item => {
        const card = document.createElement('div');
        card.className = 'inventory-card';
        card.dataset.id = item.id;
        
        const statusInfo = getStatusInfo(item.status);
        const stockPercentage = (item.currentStock / item.minStock) * 100;
        
        card.innerHTML = `
            <div class="inventory-card-header">
                <div class="card-header-left">
                    <input type="checkbox" class="item-checkbox" data-id="${item.id}" 
                           onchange="toggleProductSelection('${item.id}', this.checked)">
                    <h4>${item.name || 'Unnamed Product'}</h4>
                </div>
                <div class="card-header-right">
                    <span class="status-badge ${statusInfo.class}">${statusInfo.text}</span>
                    <div class="card-actions">
                        <button class="btn-icon" onclick="showProductDetails('${item.id}')" data-tooltip="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon" onclick="showRestockForm('${item.id}')" data-tooltip="Restock">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="inventory-card-body">
                <div class="stock-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min(stockPercentage, 100)}%"></div>
                    </div>
                    <div class="stock-numbers">
                        <span>${item.currentStock || 0} / ${item.minStock || 0}</span>
                        <span>${stockPercentage.toFixed(0)}%</span>
                    </div>
                </div>
                <div class="inventory-details-grid">
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
            <div class="inventory-card-footer">
                <button class="btn-small btn-primary" onclick="quickRestock('${item.id}')">
                    <i class="fas fa-bolt"></i> Quick Restock
                </button>
                <button class="btn-small btn-secondary" onclick="editProduct('${item.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn-small btn-danger" onclick="showDeleteModal('${item.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
        
        inventoryGrid.appendChild(card);
    });
    
    updateBulkActions();
}

function getStatusInfo(status) {
    const statusMap = {
        'sufficient': { text: 'Sufficient', class: 'status-sufficient', icon: 'fa-check-circle' },
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
        <form id="addProductForm" onsubmit="event.preventDefault(); addNewProduct();">
            <div class="form-group">
                <label for="itemName"><i class="fas fa-tag"></i> Product Name *</label>
                <input type="text" id="itemName" placeholder="Enter item name" required>
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
                    <i class="fas fa-plus"></i> Add Product
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
    const item = inventoryData.find(i => i.id == itemId);
    if (!item) {
        // Notification removed
        return;
    }
    
    currentRestockProduct = item;
    const modal = document.getElementById('restockModal');
    const restockContent = document.getElementById('restockContent');
    
    if (!modal || !restockContent) return;
    
    restockContent.innerHTML = `
        <form id="restockForm" onsubmit="event.preventDefault(); submitRestock();">
            <div class="restock-header">
                <h4><i class="fas fa-box"></i> Restock: ${item.name}</h4>
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
    currentRestockProduct = null;
}

async function addNewProduct() {
    const itemName = document.getElementById('itemName').value.trim();
    const category = document.getElementById('itemCategory').value;
    const initialStock = parseInt(document.getElementById('initialStock').value);
    const minStock = parseInt(document.getElementById('minStock').value);
    const price = parseFloat(document.getElementById('price').value);
    
    if (!itemName || !category || isNaN(initialStock) || isNaN(minStock) || isNaN(price)) {
        // Validation error notification removed
        return;
    }
    
    if (minStock <= 0) {
        // Validation error notification removed
        return;
    }
    
    const newProduct = {
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
        const savedProduct = await saveProductToDatabase(newProduct);
        inventoryData.push(savedProduct);
        
        updateSalesDataWithNewProduct(savedProduct);
        
        updateInventorySummary();
        renderInventoryGrid();
        closeRestockModal();
        
        // Success notification removed
        
        logActivity('ADD_ITEM', `Added new item: ${itemName}`, {
            itemId: savedProduct.id,
            category: category,
            initialStock: initialStock
        });
    } catch (error) {
        // Error notification removed
    }
}

async function submitRestock() {
    if (!currentRestockProduct) {
        // Error notification removed
        return;
    }
    
    const restockQuantity = parseInt(document.getElementById('restockQuantity').value);
    const restockCost = parseFloat(document.getElementById('restockCost').value);
    
    if (isNaN(restockQuantity) || restockQuantity <= 0) {
        // Validation error notification removed
        return;
    }
    
    if (isNaN(restockCost) || restockCost < 0) {
        // Validation error notification removed
        return;
    }
    
    try {
        const itemIndex = inventoryData.findIndex(i => i.id == currentRestockProduct.id);
        if (itemIndex === -1) {
            // Error notification removed
            return;
        }
        
        const oldStock = inventoryData[itemIndex].currentStock;
        inventoryData[itemIndex].currentStock += restockQuantity;
        inventoryData[itemIndex].lastRestock = new Date().toISOString().split('T')[0];
        inventoryData[itemIndex].status = calculateStatus(inventoryData[itemIndex]);
        
        const restockRecord = {
            itemId: currentRestockProduct.id,
            itemName: currentRestockProduct.name,
            quantity: restockQuantity,
            unitCost: restockCost / restockQuantity,
            totalCost: restockCost,
            date: new Date().toISOString(),
            userId: getCurrentUserId(),
            previousStock: oldStock,
            newStock: inventoryData[itemIndex].currentStock
        };
        
        await saveRestockRecord(restockRecord);
        
        updateInventoryCostTracking(currentRestockProduct.name, restockCost, restockQuantity);
        
        updateInventorySummary();
        renderInventoryGrid();
        closeRestockModal();
        
        // Success notification removed
        
        logActivity('RESTOCK', `Restocked ${restockQuantity} units of ${currentRestockProduct.name}`, {
            itemId: currentRestockProduct.id,
            quantity: restockQuantity,
            cost: restockCost
        });
    } catch (error) {
        // Error notification removed
    }
}

function filterInventory() {
    const statusFilter = document.getElementById('statusFilter');
    const categoryFilter = document.getElementById('categoryFilter');
    
    if (!statusFilter || !categoryFilter) return;
    
    const statusValue = statusFilter.value;
    const categoryValue = categoryFilter.value;
    
    filteredInventory = inventoryData.filter(item => {
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
    
    renderInventoryGrid();
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
    
    filteredInventory = [];
    renderInventoryGrid();
    updateFilterBadges('all', 'all');
}

function searchInventory(searchTerm) {
    clearTimeout(searchTimeout);
    
    searchTimeout = setTimeout(() => {
        const term = searchTerm.toLowerCase().trim();
        
        if (!term) {
            filteredInventory = [];
            renderInventoryGrid();
            return;
        }
        
        filteredInventory = inventoryData.filter(item => {
            return (
                (item.name && item.name.toLowerCase().includes(term)) ||
                (item.category && item.category.toLowerCase().includes(term))
            );
        });
        
        renderInventoryGrid();
        
        const searchResults = document.getElementById('searchResults');
        if (searchResults) {
            if (filteredInventory.length > 0) {
                searchResults.textContent = `${filteredInventory.length} items found`;
            } else {
                searchResults.textContent = 'No items found';
            }
        }
    }, 300);
}

function exportInventory() {
    const dataToExport = filteredInventory.length > 0 ? filteredInventory : inventoryData;
    
    if (dataToExport.length === 0) {
        // Warning notification removed
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
    link.setAttribute('download', `inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Success notification removed
}

function exportToCSV() {
    exportInventory();
}

async function exportToPDF() {
    // PDF export notification removed
}

function editProduct(itemId) {
    const item = inventoryData.find(i => i.id == itemId);
    if (!item) {
        // Error notification removed
        return;
    }
    
    currentEditProduct = item;
    const modal = document.getElementById('editModal');
    const editContent = document.getElementById('editContent');
    
    if (!modal || !editContent) return;
    
    editContent.innerHTML = `
        <form id="editProductForm" onsubmit="event.preventDefault(); submitEditProduct();">
            <div class="form-group">
                <label for="editProductName">Product Name *</label>
                <input type="text" id="editProductName" value="${item.name}" required>
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
    currentEditProduct = null;
}

function submitEditProduct() {
    if (!currentEditProduct) return;
    
    const itemName = document.getElementById('editProductName').value.trim();
    const category = document.getElementById('editCategory').value;
    const currentStock = parseInt(document.getElementById('editCurrentStock').value);
    const minStock = parseInt(document.getElementById('editMinStock').value);
    const price = parseFloat(document.getElementById('editPrice').value);
    
    if (!itemName || !category || isNaN(currentStock) || isNaN(minStock) || isNaN(price)) {
        // Validation error notification removed
        return;
    }
    
    const itemIndex = inventoryData.findIndex(i => i.id == currentEditProduct.id);
    if (itemIndex === -1) {
        // Error notification removed
        return;
    }
    
    const oldProduct = { ...inventoryData[itemIndex] };
    
    inventoryData[itemIndex] = {
        ...inventoryData[itemIndex],
        name: itemName,
        category: category,
        currentStock: currentStock,
        minStock: minStock,
        price: price,
        status: calculateStatus({ currentStock: currentStock, minStock: minStock }),
        updatedAt: new Date().toISOString()
    };
    
    updateInventorySummary();
    renderInventoryGrid();
    closeEditModal();
    
    // Success notification removed
    
    logActivity('EDIT_ITEM', `Edited item: ${itemName}`, {
        itemId: currentEditProduct.id,
        changes: getChanges(oldProduct, inventoryData[itemIndex])
    });
}

function getChanges(oldProduct, newProduct) {
    const changes = [];
    Object.keys(newProduct).forEach(key => {
        if (oldProduct[key] !== newProduct[key] && !['updatedAt', 'status'].includes(key)) {
            changes.push(`${key}: ${oldProduct[key]} → ${newProduct[key]}`);
        }
    });
    return changes;
}

function showDeleteModal(itemId) {
    const item = inventoryData.find(i => i.id == itemId);
    if (!item) {
        // Error notification removed
        return;
    }
    
    currentEditProduct = item;
    const modal = document.getElementById('deleteModal');
    const deleteContent = document.getElementById('deleteContent');
    
    if (!modal || !deleteContent) return;
    
    deleteContent.innerHTML = `
        <div class="delete-confirmation">
            <div class="delete-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h3>Delete Product</h3>
            <p>Are you sure you want to delete <strong>"${item.name}"</strong>?</p>
            <p class="text-warning">This action cannot be undone.</p>
            
            <div class="item-details">
                <p><strong>Current Stock:</strong> ${item.currentStock} units</p>
                <p><strong>Stock Value:</strong> ₱${(item.currentStock * item.price).toFixed(2)}</p>
                <p><strong>Category:</strong> ${item.category}</p>
            </div>
            
            <div class="modal-actions">
                <button type="button" class="btn-secondary" onclick="closeDeleteModal()">Cancel</button>
                <button type="button" class="btn-danger" onclick="confirmDeleteProduct()">
                    <i class="fas fa-trash"></i> Delete Product
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
    currentEditProduct = null;
}

function confirmDeleteProduct() {
    if (!currentEditProduct) return;
    
    const itemIndex = inventoryData.findIndex(i => i.id == currentEditProduct.id);
    
    if (itemIndex === -1) {
        // Error notification removed
        return;
    }
    
    const deletedProduct = inventoryData.splice(itemIndex, 1)[0];
    
    updateInventorySummary();
    renderInventoryGrid();
    closeDeleteModal();
    
    // Success notification removed
    
    logActivity('DELETE_ITEM', `Deleted item: ${deletedProduct.name}`, {
        itemId: deletedProduct.id,
        stockValue: deletedProduct.currentStock * deletedProduct.price
    });
}

function quickRestock(itemId) {
    const item = inventoryData.find(i => i.id == itemId);
    if (!item) return;
    
    const quickAmount = Math.max(10, item.minStock - item.currentStock);
    
    if (confirm(`Quick restock ${quickAmount} units of ${item.name}?`)) {
        const itemIndex = inventoryData.findIndex(i => i.id == itemId);
        inventoryData[itemIndex].currentStock += quickAmount;
        inventoryData[itemIndex].lastRestock = new Date().toISOString().split('T')[0];
        inventoryData[itemIndex].status = calculateStatus(inventoryData[itemIndex]);
        
        updateInventorySummary();
        renderInventoryGrid();
        
        // Success notification removed
        
        logActivity('QUICK_RESTOCK', `Quick restocked ${quickAmount} units of ${item.name}`, {
            itemId: item.id,
            quantity: quickAmount
        });
    }
}

function showProductDetails(itemId) {
    const item = inventoryData.find(i => i.id == itemId);
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
                    <button class="btn-small btn-secondary" onclick="editProduct('${item.id}'); this.parentElement.parentElement.parentElement.parentElement.remove()">
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
    
    selectedProducts.clear();
    
    itemCheckboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
        if (selectAllCheckbox.checked) {
            selectedProducts.add(checkbox.dataset.id);
        }
    });
    
    updateBulkActions();
}

function toggleProductSelection(itemId, isSelected) {
    if (isSelected) {
        selectedProducts.add(itemId);
    } else {
        selectedProducts.delete(itemId);
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
    
    const count = selectedProducts.size;
    
    if (selectedCount) {
        selectedCount.textContent = count;
        selectedCount.style.display = count > 0 ? 'inline-block' : 'none';
    }
    
    if (bulkRestockBtn) bulkRestockBtn.disabled = count === 0;
    if (bulkDeleteBtn) bulkDeleteBtn.disabled = count === 0;
    if (bulkExportBtn) bulkExportBtn.disabled = count === 0;
}

function showBulkRestock() {
    if (selectedProducts.size === 0) {
        // Warning notification removed
        return;
    }
    
    const modal = document.getElementById('bulkModal');
    const bulkContent = document.getElementById('bulkContent');
    
    if (!modal || !bulkContent) return;
    
    const items = Array.from(selectedProducts).map(id => inventoryData.find(i => i.id === id));
    
    bulkContent.innerHTML = `
        <form id="bulkRestockForm" onsubmit="event.preventDefault(); submitBulkRestock();">
            <h3>Bulk Restock (${selectedProducts.size} items)</h3>
            
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
    selectedProducts.clear();
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
            const itemIndex = inventoryData.findIndex(i => i.id === itemId);
            if (itemIndex !== -1) {
                inventoryData[itemIndex].currentStock += quantity;
                inventoryData[itemIndex].lastRestock = new Date().toISOString().split('T')[0];
                inventoryData[itemIndex].status = calculateStatus(inventoryData[itemIndex]);
                
                totalRestocked += quantity;
                itemsRestocked.push(inventoryData[itemIndex].name);
            }
        }
    });
    
    updateInventorySummary();
    renderInventoryGrid();
    closeBulkModal();
    
    // Success notification removed
    
    logActivity('BULK_RESTOCK', `Bulk restocked ${itemsRestocked.length} items`, {
        items: itemsRestocked,
        totalQuantity: totalRestocked,
        totalCost: totalCost
    });
}

function showBulkDelete() {
    if (selectedProducts.size === 0) {
        // Warning notification removed
        return;
    }
    
    if (confirm(`Delete ${selectedProducts.size} selected items? This action cannot be undone.`)) {
        const itemsToDelete = Array.from(selectedProducts);
        let deletedCount = 0;
        
        itemsToDelete.forEach(itemId => {
            const itemIndex = inventoryData.findIndex(i => i.id === itemId);
            if (itemIndex !== -1) {
                inventoryData.splice(itemIndex, 1)[0];
                deletedCount++;
            }
        });
        
        updateInventorySummary();
        renderInventoryGrid();
        selectedProducts.clear();
        updateBulkActions();
        
        // Success notification removed
        
        logActivity('BULK_DELETE', `Deleted ${deletedCount} items in bulk`, {
            count: deletedCount
        });
    }
}

function bulkExportProducts() {
    if (selectedProducts.size === 0) {
        // Warning notification removed
        return;
    }
    
    const itemsToExport = Array.from(selectedProducts).map(id => 
        inventoryData.find(i => i.id === id)
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
    link.setAttribute('download', `selected_items_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Success notification removed
}

function quickFilter(status) {
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.value = status;
        filterInventory();
    }
}

function sortInventory(field, direction) {
    sortConfig = { field, direction };
    
    const sortedData = [...inventoryData].sort((a, b) => {
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
    
    inventoryData = sortedData;
    renderInventoryGrid();
    
    const sortIndicator = document.getElementById('sortIndicator');
    if (sortIndicator) {
        sortIndicator.textContent = `Sorted by: ${field} (${direction})`;
    }
}

function refreshInventory() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        refreshBtn.disabled = true;
    }
    
    loadInventoryData();
    
    setTimeout(() => {
        if (refreshBtn) {
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
            refreshBtn.disabled = false;
        }
        // Success notification removed
    }, 1000);
}

function printInventory() {
    const printContent = document.getElementById('inventoryGrid').innerHTML;
    const originalContent = document.body.innerHTML;
    
    document.body.innerHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Inventory Report - ${new Date().toLocaleDateString()}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .print-header { text-align: center; margin-bottom: 30px; }
                .print-header h1 { margin: 0; color: #333; }
                .print-header p { margin: 5px 0; color: #666; }
                .inventory-card { 
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
                <h1>Inventory Report</h1>
                <p>Generated: ${new Date().toLocaleString()}</p>
                <p>Total Products: ${inventoryData.length}</p>
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
    renderInventoryGrid();
}

function showLowStockReport() {
    const lowStockProducts = inventoryData.filter(item => 
        item.status === 'low' || item.status === 'critical' || item.status === 'out'
    );
    
    if (lowStockProducts.length === 0) {
        // Info notification removed
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content large-modal">
            <div class="modal-header">
                <h3>Low Stock Report (${lowStockProducts.length} items)</h3>
                <button class="close-modal" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</button>
            </div>
            <div class="modal-body">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Category</th>
                            <th>Current Stock</th>
                            <th>Min Stock</th>
                            <th>Needed</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${lowStockProducts.map(item => `
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
                    <p>Total items needing restock: ${lowStockProducts.length}</p>
                    <p>Total units needed: ${lowStockProducts.reduce((sum, item) => sum + Math.max(0, item.minStock - item.currentStock), 0)}</p>
                    <button class="btn-primary" onclick="restockAllLow()">
                        <i class="fas fa-bolt"></i> Restock All Critical Products
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
}

function restockAllLow() {
    const criticalProducts = inventoryData.filter(item => item.status === 'critical');
    
    if (criticalProducts.length === 0) {
        // Info notification removed
        return;
    }
    
    if (confirm(`Quick restock all ${criticalProducts.length} critical items to minimum stock level?`)) {
        let totalRestocked = 0;
        
        criticalProducts.forEach(item => {
            const itemIndex = inventoryData.findIndex(i => i.id === item.id);
            if (itemIndex !== -1) {
                const needed = Math.max(10, item.minStock - item.currentStock);
                inventoryData[itemIndex].currentStock += needed;
                inventoryData[itemIndex].lastRestock = new Date().toISOString().split('T')[0];
                inventoryData[itemIndex].status = calculateStatus(inventoryData[itemIndex]);
                totalRestocked += needed;
            }
        });
        
        updateInventorySummary();
        renderInventoryGrid();
        
        // Success notification removed
        
        logActivity('RESTOCK_ALL_LOW', `Restocked all critical items`, {
            itemsCount: criticalProducts.length,
            totalUnits: totalRestocked
        });
    }
}

function generateStockReport() {
    const categories = [...new Set(inventoryData.map(item => item.category))];
    let reportHTML = `
        <div class="stock-report">
            <h3>Stock Level Report</h3>
            <p>Generated: ${new Date().toLocaleString()}</p>
            
            <div class="report-summary">
                <h4>Overall Summary</h4>
                <p>Total Products: ${inventoryData.length}</p>
                <p>Total Stock Value: ₱${calculateInventoryValue().toFixed(2)}</p>
            </div>
    `;
    
    categories.forEach(category => {
        const categoryProducts = inventoryData.filter(item => item.category === category);
        const categoryValue = categoryProducts.reduce((sum, item) => 
            sum + (item.currentStock * item.price), 0);
        
        reportHTML += `
            <div class="category-section">
                <h4>${category} (${categoryProducts.length} items)</h4>
                <p>Category Value: ₱${categoryValue.toFixed(2)}</p>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Stock</th>
                            <th>Min</th>
                            <th>Status</th>
                            <th>Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${categoryProducts.map(item => `
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
            <title>Stock Level Report</title>
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

// Removed setupStockAlerts function completely

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
                                <th>Product</th>
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

function showTooltip(e) {
    const tooltip = e.target.dataset.tooltip;
    if (!tooltip) return;
    
    const tooltipEl = document.createElement('div');
    tooltipEl.className = 'tooltip';
    tooltipEl.textContent = tooltip;
    tooltipEl.style.position = 'absolute';
    tooltipEl.style.left = e.pageX + 'px';
    tooltipEl.style.top = (e.pageY - 30) + 'px';
    tooltipEl.id = 'currentTooltip';
    
    document.body.appendChild(tooltipEl);
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

async function saveProductToDatabase(item) {
    return new Promise(resolve => {
        setTimeout(() => {
            const savedProduct = { ...item, id: item.id || generateId() };
            localStorage.setItem('inventoryData', JSON.stringify(inventoryData));
            resolve(savedProduct);
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
        html = '<table class="sales-table"><tr><th>Product</th><th>Quantity</th><th>Price</th><th>Total</th></tr>';
        
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

function updateSalesDataWithNewProduct(item) {
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
    
    const inventoryStats = {
        itemId: item.id,
        itemName: item.name,
        category: item.category,
        currentStock: item.currentStock,
        price: item.price,
        lastUpdated: new Date().toISOString()
    };
    
    let inventoryTracking = localStorage.getItem('inventoryTracking');
    if (!inventoryTracking) {
        inventoryTracking = {};
    } else {
        inventoryTracking = JSON.parse(inventoryTracking);
    }
    
    inventoryTracking[item.id] = inventoryStats;
    localStorage.setItem('inventoryTracking', JSON.stringify(inventoryTracking));
    
    saveSalesData();
}

function updateInventoryCostTracking(itemName, cost, quantity) {
    let costTracking = localStorage.getItem('inventoryCostTracking');
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
    
    localStorage.setItem('inventoryCostTracking', JSON.stringify(costTracking));
    
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
            inventoryCosts: 0
        };
    }
    
    dailySales[dateKey].inventoryCosts += cost;
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
            inventoryCosts: 0
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
        
        updateInventoryStockAfterSale(name, quantity);
    });
    
    dailySales[dateKey].profit = dailySales[dateKey].totalSales - dailySales[dateKey].totalCosts;
    
    saveAllData();
    updateDashboard();
}

function updateInventoryStockAfterSale(itemName, quantity) {
    const itemIndex = inventoryData.findIndex(item => item.name === itemName);
    if (itemIndex !== -1) {
        inventoryData[itemIndex].currentStock -= quantity;
        inventoryData[itemIndex].status = calculateStatus(inventoryData[itemIndex]);
        
        updateInventorySummary();
        renderInventoryGrid();
        
        saveInventoryData();
    }
}

function saveInventoryData() {
    localStorage.setItem('inventoryData', JSON.stringify(inventoryData));
}

function getSalesReportData() {
    loadSalesData();
    
    return {
        weeklySales: weeklySales,
        dailySales: dailySales,
        inventoryData: inventoryData,
        costTracking: JSON.parse(localStorage.getItem('inventoryCostTracking') || '{}')
    };
}

function calculateInventoryValue() {
    let totalValue = 0;
    inventoryData.forEach(item => {
        if (item.price && item.currentStock) {
            totalValue += item.currentStock * item.price;
        }
    });
    return totalValue;
}

function handleLogout() {
    // Clear session and redirect to login
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login';
}

window.showRestockModal = showRestockModal;
window.showRestockForm = showRestockForm;
window.submitRestock = submitRestock;
window.closeRestockModal = closeRestockModal;
window.filterInventory = filterInventory;
window.searchInventory = searchInventory;
window.exportInventory = exportInventory;
window.editProduct = editProduct;
window.handleLogout = handleLogout;
window.addNewProduct = addNewProduct;
window.closeModal = closeModal;
window.showDaySales = showDaySales;
window.recordSaleFromPOS = recordSaleFromPOS;
window.getSalesReportData = getSalesReportData;
window.calculateInventoryValue = calculateInventoryValue;
window.showDeleteModal = showDeleteModal;
window.confirmDeleteProduct = confirmDeleteProduct;
window.closeDeleteModal = closeDeleteModal;
window.showProductDetails = showProductDetails;
window.toggleSelectAll = toggleSelectAll;
window.toggleProductSelection = toggleProductSelection;
window.showBulkRestock = showBulkRestock;
window.closeBulkModal = closeBulkModal;
window.submitBulkRestock = submitBulkRestock;
window.showBulkDelete = showBulkDelete;
window.bulkExportProducts = bulkExportProducts;
window.quickFilter = quickFilter;
window.sortInventory = sortInventory;
window.refreshInventory = refreshInventory;
window.printInventory = printInventory;
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