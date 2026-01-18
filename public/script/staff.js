let currentOrder = [];
let orderType = null;
let currentCategory = 'all';
let selectedPaymentMethod = null;
let orderCounter = 1;
let currentAmountPaid = 0;
let todaysSales = 0;
let totalSales = 0;
let totalTransactions = 0;
let productCatalog = []; // Will be populated from API

// Load menu items from API when page loads
document.addEventListener('DOMContentLoaded', function() {
  loadMenuItemsFromAPI();
  setupCategoryButtons();
});

// Load menu items from the API
async function loadMenuItemsFromAPI() {
  try {
    const response = await fetch('/api/menu', {
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    if (!response.ok) {
      console.error('Failed to load menu items:', response.status);
      // Fall back to default catalog if API fails
      loadDefaultCatalog();
      return;
    }

    const result = await response.json();
    
    if (result.success && result.data) {
      // Convert menu items from API to product catalog format
      productCatalog = result.data.map(item => ({
        name: item.name,
        price: item.price,
        category: item.category,
        image: item.image || 'default_food.jpg',
        stock: 100, // Default stock value
        unit: 'pcs',
        vatable: true,
        _id: item._id
      }));
      
      console.log('Menu items loaded from API:', productCatalog.length);
      renderMenu();
    } else {
      console.error('Invalid API response:', result);
      loadDefaultCatalog();
    }
  } catch (error) {
    console.error('Error loading menu items from API:', error);
    // Fall back to default catalog if API fails
    loadDefaultCatalog();
  }
}

// Setup category button listeners
function setupCategoryButtons() {
  const categoryButtons = document.querySelectorAll('.category-btn');
  categoryButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      // Remove active class from all buttons
      categoryButtons.forEach(b => b.classList.remove('active'));
      // Add active class to clicked button
      this.classList.add('active');
      // Update current category and render
      currentCategory = this.dataset.category;
      renderMenu();
    });
  });
}

// Default product catalog (fallback if API fails)
function loadDefaultCatalog() {
  productCatalog = [
  { name: 'Korean Spicy Bulgogi (Pork)', price: 158, category: 'Rice', image: 'korean_spicy_bulgogi.png', stock: 100, unit: 'pcs', vatable: true },
  { name: 'Korean Salt and Pepper (Pork)', price: 158, category: 'Rice', image: 'korean_salt_pepper_pork.png', stock: 100, unit: 'pcs', vatable: true },
  { name: 'Crispy Pork Lechon Kawali', price: 158, category: 'Rice', image: 'lechon_kawali.png', stock: 100, unit: 'pcs', vatable: true },
  { name: 'Cream Dory Fish Fillet', price: 138, category: 'Rice', image: 'cream_dory.png', stock: 100, unit: 'pcs', vatable: true },
  { name: 'Buttered Honey Chicken', price: 128, category: 'Rice', image: 'buttered_honey_chicken.png', stock: 100, unit: 'pcs', vatable: true },
  { name: 'Buttered Spicy Chicken', price: 128, category: 'Rice', image: 'buttered_spicy_chicken.png', stock: 100, unit: 'pcs', vatable: true },
  { name: 'Chicken Adobo', price: 128, category: 'Rice', image: 'chicken_adobo.png', stock: 100, unit: 'pcs', vatable: true },
  { name: 'Pork Shanghai', price: 128, category: 'Rice', image: 'pork_shanghai.png', stock: 100, unit: 'pcs', vatable: true },
  { name: 'Sizzling Pork Sisig', price: 168, category: 'Sizzling', image: 'pork_sisig.png', stock: 100, unit: 'pcs', vatable: true },
  { name: 'Sizzling Liempo', price: 168, category: 'Sizzling', image: 'liempo.png', stock: 100, unit: 'pcs', vatable: true },
  { name: 'Sizzling Porkchop', price: 148, category: 'Sizzling', image: 'porkchop.png', stock: 100, unit: 'pcs', vatable: true },
  { name: 'Sizzling Fried Chicken', price: 148, category: 'Sizzling', image: 'fried_chicken.png', stock: 100, unit: 'pcs', vatable: true },
  { name: 'Pancit Bihon (S)', price: 300, category: 'Party', image: 'pancit_bihon_small.png', stock: 100, unit: 'trays', vatable: true },
  { name: 'Pancit Bihon (M)', price: 500, category: 'Party', image: 'pancit_bihon_medium.png', stock: 100, unit: 'trays', vatable: true },
  { name: 'Pancit Bihon (L)', price: 700, category: 'Party', image: 'pancit_bihon_large.png', stock: 100, unit: 'trays', vatable: true },
  { name: 'Pancit Canton (S)', price: 300, category: 'Party', image: 'pancit_canton_small.png', stock: 100, unit: 'trays', vatable: true },
  { name: 'Pancit Canton (M)', price: 500, category: 'Party', image: 'pancit_canton_medium.png', stock: 100, unit: 'trays', vatable: true },
  { name: 'Pancit Canton (L)', price: 700, category: 'Party', image: 'pancit_canton_large.png', stock: 100, unit: 'trays', vatable: true },
  { name: 'Spaghetti (S)', price: 400, category: 'Party', image: 'spaghetti_small.png', stock: 100, unit: 'trays', vatable: true },
  { name: 'Spaghetti (M)', price: 700, category: 'Party', image: 'spaghetti_medium.png', stock: 100, unit: 'trays', vatable: true },
  { name: 'Spaghetti (L)', price: 1000, category: 'Party', image: 'spaghetti_large.png', stock: 100, unit: 'trays', vatable: true },
  { name: 'Cucumber Lemonade (Glass)', price: 38, category: 'Drink', image: 'cucumber_lemonade.png', stock: 100, unit: 'glasses', vatable: true },
  { name: 'Cucumber Lemonade (Pitcher)', price: 108, category: 'Drink', image: 'cucumber_lemonade_pitcher.png', stock: 100, unit: 'pitchers', vatable: true },
  { name: 'Blue Lemonade (Glass)', price: 38, category: 'Drink', image: 'blue_lemonade.png', stock: 100, unit: 'glasses', vatable: true },
  { name: 'Blue Lemonade (Pitcher)', price: 108, category: 'Drink', image: 'blue_lemonade_pitcher.png', stock: 100, unit: 'pitchers', vatable: true },
  { name: 'Red Tea (Glass)', price: 38, category: 'Drink', image: 'red_tea.png', stock: 100, unit: 'glasses', vatable: true },
  { name: 'Soda (Mismo)', price: 28, category: 'Drink', image: 'soda_mismo.png', stock: 100, unit: 'bottles', vatable: true },
  { name: 'Soda 1.5L', price: 118, category: 'Drink', image: 'soda_1.5liter.png', stock: 100, unit: 'bottles', vatable: true },
  { name: 'Cafe Americano Tall', price: 88, category: 'Cafe', image: 'cafe_americano_tall.png', stock: 100, unit: 'cups', vatable: true },
  { name: 'Cafe Americano Grande', price: 108, category: 'Cafe', image: 'cafe_americano_grande.png', stock: 100, unit: 'cups', vatable: true },
  { name: 'Cafe Latte Tall', price: 108, category: 'Cafe', image: 'cafe_latte_tall.png', stock: 100, unit: 'cups', vatable: true },
  { name: 'Cafe Latte Grande', price: 128, category: 'Cafe', image: 'cafe_latte_grande.png', stock: 100, unit: 'cups', vatable: true },
  { name: 'Caramel Macchiato Tall', price: 108, category: 'Cafe', image: 'caramel_macchiato_tall.png', stock: 100, unit: 'cups', vatable: true },
  { name: 'Caramel Macchiato Grande', price: 128, category: 'Cafe', image: 'caramel_macchiato_grande.png', stock: 100, unit: 'cups', vatable: true },
  { name: 'Milk Tea Regular HC', price: 68, category: 'Milk', image: 'Milktea_regular.png', stock: 100, unit: 'cups', vatable: true },
  { name: 'Milk Tea Regular MC', price: 88, category: 'Milk', image: 'Milktea_regular_MC.png', stock: 100, unit: 'cups', vatable: true },
  { name: 'Matcha Green Tea HC', price: 78, category: 'Milk', image: 'Matcha_greentea_HC.png', stock: 100, unit: 'cups', vatable: true },
  { name: 'Matcha Green Tea MC', price: 88, category: 'Milk', image: 'Matcha_greentea_MC.png', stock: 100, unit: 'cups', vatable: true },
  { name: 'Matcha Green Tea HC', price: 108, category: 'Frappe', image: 'Matcha_greentea_HC.png', stock: 100, unit: 'cups', vatable: true },
  { name: 'Matcha Green Tea MC', price: 138, category: 'Frappe', image: 'Matcha_greentea_HC.png', stock: 100, unit: 'cups', vatable: true },
  { name: 'Cookies & Cream HC', price: 98, category: 'Frappe', image: 'Cookies_&Cream_HC.png', stock: 100, unit: 'cups', vatable: true },
  { name: 'Cookies & Cream MC', price: 128, category: 'Frappe', image: 'Cookies_&Cream_HC.png', stock: 100, unit: 'cups', vatable: true },
  { name: 'Strawberry & Cream HC', price: 180, category: 'Frappe', image: 'Strawberr_Cream_frappe_HC.png', stock: 100, unit: 'cups', vatable: true },
  { name: 'Mango cheese cake HC', price: 180, category: 'Frappe', image: 'Mango_cheesecake_HC.png', stock: 100, unit: 'cups', vatable: true },
  { name: 'Cheesy Nachos', price: 88, category: 'Snack & Appetizer', image: 'cheesy_nachos.png', stock: 100, unit: 'servings', vatable: true },
  { name: 'Nachos Supreme', price: 108, category: 'Snack & Appetizer', image: 'nachos_supreme.png', stock: 100, unit: 'servings', vatable: true },
  { name: 'French fries', price: 58, category: 'Snack & Appetizer', image: 'french_fries.png', stock: 100, unit: 'servings', vatable: true },
  { name: 'Clubhouse Sandwich', price: 118, category: 'Snack & Appetizer', image: 'club_house_sandwich.png', stock: 100, unit: 'sandwiches', vatable: true },
  { name: 'Fish and Fries', price: 128, category: 'Snack & Appetizer', image: 'fish_fries.png', stock: 100, unit: 'servings', vatable: true },
  { name: 'Cheesy Dynamite Lumpia', price: 88, category: 'Snack & Appetizer', image: 'Cheesy_dynamite.png', stock: 100, unit: 'pieces', vatable: true },
  { name: 'Lumpiang Shanghai', price: 88, category: 'Snack & Appetizer', image: 'lumpiang_shanghai.png', stock: 100, unit: 'pieces', vatable: true },
  { name: 'Fried Chicken', price: 78, category: 'Budget Meals Served with Rice', image: 'fried_chicken_Meal.png', stock: 100, unit: 'meals', vatable: true },
  { name: 'Buttered Honey Chicken', price: 78, category: 'Budget Meals Served with Rice', image: 'buttered_honey_chicken.png', stock: 100, unit: 'meals', vatable: true },
  { name: 'Buttered Spicy Chicken', price: 78, category: 'Budget Meals Served with Rice', image: 'buttered_spicy_chicken.png', stock: 100, unit: 'meals', vatable: true },
  { name: 'Tinapa Rice', price: 108, category: 'Budget Meals Served with Rice', image: 'Tinapa_fried_rice.png', stock: 100, unit: 'meals', vatable: true },
  { name: 'Tuyo Pesto', price: 108, category: 'Budget Meals Served with Rice', image: 'Tuyo_pesto.png', stock: 100, unit: 'meals', vatable: true },
  { name: 'Fried Rice', price: 128, category: 'Budget Meals Served with Rice', image: 'fried_rice.png', stock: 100, unit: 'servings', vatable: true },
  { name: 'Plain Rice', price: 18, category: 'Budget Meals Served with Rice', image: 'plain_rice.png', stock: 100, unit: 'bowls', vatable: true },
  { name: 'Sinigang (PORK)', price: 188, category: 'Specialties', image: 'sinigang_pork.png', stock: 100, unit: 'servings', vatable: true },
  { name: 'Sinigang (Shrimp)', price: 178, category: 'Specialties', image: 'sinigang_shrimp.png', stock: 100, unit: 'servings', vatable: true },
  { name: 'Paknet (Pakbet w/ Bagnet)', price: 188, category: 'Specialties', image: 'paknet.png', stock: 100, unit: 'servings', vatable: true },
  { name: 'Buttered Shrimp', price: 108, category: 'Specialties', image: 'buttered_shrimp.png', stock: 100, unit: 'servings', vatable: true },
  { name: 'Special Bulalo (good for 2-3 Persons)', price: 128, category: 'Specialties', image: 'Special_Bulalo.png', stock: 100, unit: 'pots', vatable: true },
  { name: 'Special Bulalo Buy 1 Take 1 (good for 6-8 Persons)', price: 180, category: 'Specialties', image: 'Special_Bulalo_buy1_take1.png', stock: 100, unit: 'pots', vatable: false }
  ];
  renderMenu();
}

function checkAllFieldsFilled() {
  const hasItems = currentOrder.length > 0;
  const hasOrderType = orderType && orderType !== "None";
  const hasPaymentMethod = selectedPaymentMethod && selectedPaymentMethod.trim() !== '';
  
  let hasTableNumber = true;
  if (orderType === "Dine In") {
    const tableInput = document.getElementById('tableNumber');
    hasTableNumber = tableInput && tableInput.value.trim() !== '';
  }
  
  let hasPaymentAmount = true;
  if (selectedPaymentMethod === 'cash') {
    const inputPayment = document.getElementById('inputPayment');
    hasPaymentAmount = inputPayment && inputPayment.value.trim() !== '';
  }
  
  return hasItems && hasOrderType && hasPaymentMethod && hasTableNumber && hasPaymentAmount;
}

function updatePayButtonState() {
  const payButton = document.getElementById('payButton');
  if (!payButton) return;
  
  const allFieldsFilled = checkAllFieldsFilled();
  
  if (allFieldsFilled) {
    payButton.disabled = false;
    payButton.style.opacity = '1';
    payButton.style.cursor = 'pointer';
    payButton.style.backgroundColor = '#28a745';
  } else {
    payButton.disabled = true;
    payButton.style.opacity = '0.6';
    payButton.style.cursor = 'not-allowed';
    payButton.style.backgroundColor = '#6c757d';
  }
}

function searchFood(searchTerm) {
  const container = document.getElementById('menuContainer');
  if (!container) return;
  
  if (!searchTerm.trim()) {
    renderMenu();
    return;
  }
  
  const term = searchTerm.toLowerCase().trim();
  
  const filteredProducts = productCatalog.filter(product => {
    if (currentCategory !== 'all' && product.category !== currentCategory) return false;
    if (product.name.toLowerCase().includes(term)) return true;
    if (product.category.toLowerCase().includes(term)) return true;
    return false;
  });
  
  container.innerHTML = '';
  
  if (filteredProducts.length === 0) {
    container.innerHTML = `
      <div class="no-results">
        <i class="fas fa-search"></i>
        <h3>No products found</h3>
        <p>Try searching with different keywords</p>
      </div>
    `;
    return;
  }
  
  filteredProducts.forEach(product => {
    const card = document.createElement('div');
    card.className = 'compact-product-card';
    
    const isOutOfStock = product.stock <= 0;
    
    if (isOutOfStock) {
      card.classList.add('out-of-stock');
    } else {
      card.onclick = () => addItemToOrder(product.name, product.price, product.stock);
    }

    let stockStatus = '';
    let stockClass = '';
    
    if (product.stock <= 0) {
      stockStatus = 'Out of Stock';
      stockClass = 'out-stock';
    } else if (product.stock <= 10) {
      stockStatus = `${product.stock} ${product.unit} left`;
      stockClass = 'low-stock';
    } else if (product.stock <= 30) {
      stockStatus = `${product.stock} ${product.unit}`;
      stockClass = 'medium-stock';
    } else {
      stockStatus = `${product.stock} ${product.unit} available`;
      stockClass = 'high-stock';
    }

    card.innerHTML = `
      <img src="/images/${product.image}" onerror="this.src='/images/default_food.jpg'" />
      <div class="compact-product-name">${product.name}</div>
      <div class="compact-product-category">${product.category}</div>
      <div class="compact-product-price">₱${product.price}</div>
      <div class="compact-product-stock ${stockClass}">
        ${stockStatus}
      </div>
    `;
    container.appendChild(card);
  });
  
  updatePayButtonState();
}

function renderMenu() {
  const container = document.getElementById('menuContainer');
  if (!container) return;
  container.innerHTML = '';

  const items = currentCategory === 'all'
    ? productCatalog
    : productCatalog.filter(p => p.category === currentCategory);

  if (items.length === 0) {
    container.innerHTML = `
      <div class="no-results">
        <i class="fas fa-utensils"></i>
        <h3>No products in this category</h3>
        <p>Try selecting a different category</p>
      </div>
    `;
    return;
  }

  items.forEach(product => {
    const card = document.createElement('div');
    card.className = 'compact-product-card';
    
    const isOutOfStock = product.stock <= 0;
    
    if (isOutOfStock) {
      card.classList.add('out-of-stock');
    } else {
      card.onclick = () => addItemToOrder(product.name, product.price, product.stock);
    }

    let stockStatus = '';
    let stockClass = '';
    
    if (product.stock <= 0) {
      stockStatus = 'Out of Stock';
      stockClass = 'out-stock';
    } else if (product.stock <= 10) {
      stockStatus = `${product.stock} ${product.unit} left`;
      stockClass = 'low-stock';
    } else if (product.stock <= 30) {
      stockStatus = `${product.stock} ${product.unit}`;
      stockClass = 'medium-stock';
    } else {
      stockStatus = `${product.stock} ${product.unit} available`;
      stockClass = 'high-stock';
    }

    card.innerHTML = `
      <img src="/images/${product.image}" onerror="this.src='/images/default_food.jpg'" />
      <div class="compact-product-name">${product.name}</div>
      <div class="compact-product-category">${product.category}</div>
      <div class="compact-product-price">₱${product.price}</div>
      <div class="compact-product-stock ${stockClass}">
        ${stockStatus}
      </div>
    `;
    container.appendChild(card);
  });
  
  updatePayButtonState();
}

function addItemToOrder(name, price, stock) {
  const product = productCatalog.find(p => p.name === name);
  
  if (!product) {
    alert('Product Not Found In Menu');
    return;
  }
  
  if (product.stock <= 0) {
    alert(`Sorry, ${name} is out of stock!`);
    return;
  }
  
  const existingItem = currentOrder.find(i => i.name === name);
  
  const currentQuantity = existingItem ? existingItem.quantity : 0;
  if (currentQuantity >= product.stock) {
    alert(`Only ${product.stock} ${product.unit} of ${name} available in stock!`);
    return;
  }
  
  if (existingItem) {
    existingItem.quantity++;
  } else {
    currentOrder.push({ name, price, quantity: 1, stock: product.stock, unit: product.unit, vatable: product.vatable });
  }
  
  renderOrder();
  updateInputPaymentField();
  updatePayButtonState();
}

function removeItemFromOrder(index) {
  if (currentOrder[index].quantity > 1) {
    currentOrder[index].quantity--;
  } else {
    currentOrder.splice(index, 1);
  }
  renderOrder();
  updateInputPaymentField();
  updatePayButtonState();
}

function renderOrder() {
  const list = document.getElementById('productlist');
  const subtotalEl = document.getElementById('subtotal');
  const taxEl = document.getElementById('tax');
  const totalEl = document.getElementById('totals');

  if (!list) {
    console.error('productlist element not found!');
    return;
  }

  list.innerHTML = '';
  let subtotal = 0;
  let vatableAmount = 0;
  let vatExemptAmount = 0;

  currentOrder.forEach((item, index) => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;
    
    if (item.vatable) {
      vatableAmount += itemTotal;
    } else {
      vatExemptAmount += itemTotal;
    }

    const product = productCatalog.find(p => p.name === item.name);
    const remainingStock = product ? product.stock - item.quantity : 0;
    
    list.innerHTML += `
      <li>
        <div class="order-item-info">
          <span class="order-item-name">${item.name}</span>
          <span class="order-item-stock">Stock: ${remainingStock} ${item.unit || 'left'}</span>
        </div>
        <div class="order-item-controls">
          <span class="order-item-quantity">x${item.quantity}</span>
          <span class="order-item-price">₱${itemTotal.toFixed(2)}</span>
          <button onclick="removeItemFromOrder(${index})" class="remove-item-btn">✕</button>
        </div>
      </li>`;
  });

  const fixedTax = 57.70;
  const total = subtotal + fixedTax;

  try {
    if (subtotalEl) {
      subtotalEl.textContent = `₱${subtotal.toFixed(2)}`;
    }
    
    if (taxEl) {
      taxEl.textContent = '₱57.70';
    }
    
    if (totalEl) {
      totalEl.textContent = `${total.toFixed(2)}`;
    }
  } catch (error) {
    console.error('Error updating totals:', error);
  }
  
  updatePayButtonState();
}

function updateStockAfterPayment() {
  currentOrder.forEach(orderItem => {
    const productIndex = productCatalog.findIndex(p => p.name === orderItem.name);
    if (productIndex !== -1) {
      productCatalog[productIndex].stock -= orderItem.quantity;
      if (productCatalog[productIndex].stock < 0) {
        productCatalog[productIndex].stock = 0;
      }
    }
  });
  
  // Save updated inventory to localStorage
  try {
    localStorage.setItem('menuData', JSON.stringify(productCatalog));
    
    // Broadcast inventory update
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const channel = new BroadcastChannel('dashboard_updates');
        channel.postMessage({
          type: 'inventory_updated',
          menuData: productCatalog,
          timestamp: new Date().toISOString()
        });
        channel.close();
      } catch (e) {
        console.log('Broadcast error:', e);
      }
    }
  } catch (error) {
    console.error('Error updating inventory:', error);
  }
}

function setDineIn() {
  orderType = "Dine In";
  
  const display = document.getElementById("orderTypeDisplay") || 
                  document.getElementById("orderType") ||
                  document.querySelector(".order-type-display");
  
  if (display) {
    display.textContent = orderType;
  }
  
  const dineInBtn = document.querySelector('.dineinandtakeout-btn:nth-child(1)');
  const takeoutBtn = document.querySelector('.dineinandtakeout-btn:nth-child(2)');
  
  if (dineInBtn) dineInBtn.classList.add('active');
  if (takeoutBtn) takeoutBtn.classList.remove('active');
  
  const tableInput = document.getElementById('tableNumber');
  if (tableInput) {
    tableInput.placeholder = "Enter Table:";
    tableInput.value = '';
    tableInput.disabled = false;
    tableInput.oninput = updatePayButtonState;
  }
  
  updatePayButtonState();
}

function setTakeout() {
  orderType = "Take Out";
  
  const display = document.getElementById("orderTypeDisplay") || 
                  document.getElementById("orderType") ||
                  document.querySelector(".order-type-display");
  
  if (display) {
    display.textContent = orderType;
  }
  
  const dineInBtn = document.querySelector('.dineinandtakeout-btn:nth-child(1)');
  const takeoutBtn = document.querySelector('.dineinandtakeout-btn:nth-child(2)');
  
  if (dineInBtn) dineInBtn.classList.remove('active');
  if (takeoutBtn) takeoutBtn.classList.add('active');
  
  const tableInput = document.getElementById('tableNumber');
  if (tableInput) {
    tableInput.value = 'Takeout';
    tableInput.disabled = true;
  }
  
  updatePayButtonState();
}

function resetOrderTypeDisplay() {
  const display = document.getElementById("orderTypeDisplay") || 
                  document.getElementById("orderType") ||
                  document.querySelector(".order-type-display");
  
  if (display) {
    display.textContent = "None";
  }
}

function selectPaymentMethod(method) {
  selectedPaymentMethod = method.toLowerCase();
  
  const buttons = document.querySelectorAll('.payment-method-btn');
  buttons.forEach(btn => {
    btn.classList.remove('active');
    btn.style.backgroundColor = '';
    btn.style.color = '';
  });
  
  const clickedButton = event ? event.currentTarget : null;
  
  if (clickedButton) {
    clickedButton.classList.add('active');
    clickedButton.style.backgroundColor = '#28a745';
    clickedButton.style.color = 'white';
  } else {
    const buttonsArray = Array.from(buttons);
    const selectedBtn = buttonsArray.find(btn => {
      const onclickAttr = btn.getAttribute('onclick');
      return onclickAttr && onclickAttr.toLowerCase().includes(method.toLowerCase());
    });
    
    if (selectedBtn) {
      selectedBtn.classList.add('active');
      selectedBtn.style.backgroundColor = '#28a745';
      selectedBtn.style.color = 'white';
    }
  }
  
  updatePaymentMethodDisplay();
  updateInputPaymentField();
  updateAllPaymentDisplays();
  updatePayButtonState();
  
  if (method.toLowerCase() === 'gcash' && currentOrder.length > 0) {
    const totalEl = document.getElementById('totals');
    const totalAmount = parseFloat(totalEl?.textContent) || 0;
    
    if (totalAmount > 0) {
      showQRCodeModal(method.toLowerCase(), totalAmount, true);
    } else {
      showQRCodeModal(method.toLowerCase(), 0, true);
    }
  }
}

function updatePaymentMethodDisplay() {
  const displayElement = document.getElementById("paymentMethodDisplay");
  
  if (displayElement) {
    let displayText = "None";
    
    switch(selectedPaymentMethod) {
      case 'gcash':
        displayText = 'GCash';
        break;
      case 'cash':
        displayText = 'Cash';
        break;
      default:
        if (selectedPaymentMethod) {
          displayText = selectedPaymentMethod.charAt(0).toUpperCase() + selectedPaymentMethod.slice(1);
        }
    }
    
    displayElement.textContent = displayText;
  }
}

function updateAllPaymentDisplays() {
  updatePaymentMethodDisplay();
}

function updateInputPaymentField() {
  const inputPayment = document.getElementById('inputPayment');
  const changeSection = document.getElementById('changeSection');
  
  if (!inputPayment) return;
  
  if (selectedPaymentMethod === 'cash' && currentOrder.length > 0) {
    inputPayment.disabled = false;
    inputPayment.placeholder = "Enter Cash Amount";
    inputPayment.value = '';
    inputPayment.oninput = calculateChange;
    
    setTimeout(() => {
      inputPayment.focus();
    }, 100);
  } else {
    inputPayment.disabled = true;
    inputPayment.placeholder = "Select Cash Payment First";
    inputPayment.value = '';
    if (changeSection) changeSection.style.display = 'none';
  }
  
  updatePayButtonState();
}

function validateCashPayment(total) {
  const inputPayment = document.getElementById('inputPayment');
  
  if (!inputPayment) {
    return { isValid: false, message: "Payment input field not found!" };
  }
  
  const inputValue = inputPayment.value.trim();
  
  if (!inputValue) {
    return { isValid: false, message: "Please enter the cash Amount" };
  }
  
  const paid = parseFloat(inputValue);
  
  if (isNaN(paid)) {
    return { isValid: false, message: "Please enter a valid number for cash amount!" };
  }
  
  if (paid < total) {
    return { 
      isValid: false, 
      message: `Insufficient payment!\n\nTotal: ₱${total.toFixed(2)}\nPaid: ₱${paid.toFixed(2)}\nShort: ₱${(total - paid).toFixed(2)}`
    };
  }
  
  return { isValid: true, paid: paid };
}

function calculateChange() {
  const inputPayment = document.getElementById('inputPayment');
  const changeSection = document.getElementById('changeSection');
  const changeAmount = document.getElementById('changeAmount');
  const totalEl = document.getElementById('totals');
  
  if (!inputPayment || !changeSection || !changeAmount || !totalEl) return;
  
  const total = parseFloat(totalEl.textContent.replace('₱', '')) || 0;
  const paid = parseFloat(inputPayment.value) || 0;
  
  if (paid >= total && paid > 0) {
    const change = paid - total;
    changeAmount.textContent = change.toFixed(2);
    changeSection.style.display = 'block';
  } else {
    changeSection.style.display = 'none';
  }
  
  updatePayButtonState();
}

function showModal(title, content, modalClass = '') {
  let modal = document.getElementById('customModal');
  
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'customModal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    `;
    
    document.body.appendChild(modal);
  }
  
  modal.className = modalClass;
  modal.innerHTML = `
    <div style="
      background: white;
      border-radius: 8px;
      width: 90%;
      max-width: 400px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      animation: modalFadeIn 0.3s ease;
    ">
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 20px;
        border-bottom: 1px solid #e9ecef;
        background: #f8f9fa;
        border-radius: 8px 8px 0 0;
      ">
        <h3 style="margin: 0; color: #333; font-size: 18px;">${title}</h3>
        <button onclick="closeQRCodeModal()" style="
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #666;
          padding: 0;
          line-height: 1;
        ">&times;</button>
      </div>
      <div style="padding: 20px;">
        ${content}
      </div>
    </div>
  `;
  
  const style = document.createElement('style');
  style.textContent = `
    @keyframes modalFadeIn {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;
  document.head.appendChild(style);
  
  modal.style.display = 'flex';
  
  modal.onclick = function(e) {
    if (e.target === modal) {
      closeQRCodeModal();
    }
  };
}

function closeQRCodeModal() {
  const modal = document.getElementById('customModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function showQRCodeModal(method, totalAmount, isPreview = false) {
  const methodName = 'GCash';
  
  const imageFilename = 'gcash-qr.png';
  
  const modalContent = `
    <div style="text-align: center; padding: 20px;">
      <h3 style="margin-bottom: 20px; color: #333;">${methodName} Payment</h3>
      
      ${totalAmount > 0 ? `
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px; border: 2px solid #28a745;">
          <div style="font-size: 16px; font-weight: bold; margin-bottom: 8px; color: #495057;">Total Amount</div>
          <div style="font-size: 32px; color: #28a745; font-weight: bold;">₱${totalAmount.toFixed(2)}</div>
        </div>
      ` : `
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #ffeaa7;">
          <div style="font-size: 14px; color: #856404;">
            <i class="fas fa-exclamation-circle" style="margin-right: 8px;"></i>
            Add items to order to see the total amount
          </div>
        </div>
      `}
      
      <div style="margin-bottom: 20px;">
        <img src="/images/${imageFilename}" onerror="this.src='/images/default.png'; this.onerror=null;" alt="${methodName} QR Code" style="width: 250px; height: 250px; border: 2px solid #ddd; padding: 15px; background: white;">
      </div>
      
      <div style="margin-bottom: 25px; color: #666; font-size: 14px; font-weight: bold;">
        ${methodName} QR Code
      </div>
      
      ${!isPreview ? `
        <div style="display: flex; gap: 15px; justify-content: center;">
          <button onclick="completeQRPayment('${method}', ${totalAmount})" style="padding: 12px 35px; background: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: bold; min-width: 160px;">
            <i class="fas fa-check-circle" style="margin-right: 8px;"></i>
            Payment Done
          </button>
          <button onclick="closeQRCodeModal()" style="padding: 12px 25px; background: #dc3545; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; min-width: 120px;">
            <i class="fas fa-times-circle" style="margin-right: 8px;"></i>
            Cancel
          </button>
        </div>
      ` : `
        <button onclick="closeQRCodeModal()" style="padding: 12px 40px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; min-width: 160px;">
          <i class="fas fa-times" style="margin-right: 8px;"></i>
          Close Preview
        </button>
      `}
    </div>
  `;
  
  showModal(`Pay with ${methodName}`, modalContent, 'qr-code-modal');
}

function completeQRPayment(method, total) {
  closeQRCodeModal();
  
  const tableNumber = orderType.toLowerCase() === 'dine in' 
    ? (document.getElementById('tableNumber')?.value || '1')
    : 'N/A';
  
  const methodName = 'GCash';
  const confirmMessage = `Confirm ${methodName} Payment:\n\n` +
    `Order Type: ${orderType}\n` +
    `Table: ${tableNumber}\n` +
    `Payment Method: ${methodName}\n` +
    `Total Amount: ₱${total.toFixed(2)}\n\n` +
    `Have you received payment confirmation in ${methodName}?`;
  
  if (!confirm(confirmMessage)) {
    return;
  }
  
  completePayment(method, total, total, 0, tableNumber);
}

function initializeQRCodeImages() {
  const qrImages = [
    { path: '/images/gcash-qr.png', method: 'GCash' },
    { path: '/images/default.png', method: 'Default' }
  ];
  
  qrImages.forEach(qr => {
    const img = new Image();
    img.onload = function() {
    };
    img.onerror = function() {
      if (qr.method === 'Default') {
      }
    };
    img.src = qr.path;
  });
}

function Payment() {
  console.log('Payment() called');
  console.log('currentOrder:', currentOrder);
  console.log('orderType:', orderType);
  console.log('selectedPaymentMethod:', selectedPaymentMethod);
  
  if (!Array.isArray(currentOrder) || currentOrder.length === 0) {
    alert("Please Add Product First");
    return;
  }
  
  if (!orderType || orderType.trim() === '' || orderType === "None") {
    alert("Please Choose if Dine or Take Out");
    return;
  }
  
  if (!selectedPaymentMethod || selectedPaymentMethod.trim() === '') {
    alert("Please Select a payment method");
    return;
  }
  
  if (orderType === "Dine In") {
    const tableInput = document.getElementById('tableNumber');
    if (!tableInput || !tableInput.value.trim()) {
      alert("Please Enter table number");
      tableInput?.focus();
      return;
    }
  }
  
  for (let i = 0; i < currentOrder.length; i++) {
    const item = currentOrder[i];
    if (!item || typeof item !== 'object') {
      alert(`Invalid item at position ${i + 1}!`);
      return;
    }
    
    if (!item.name || typeof item.price !== 'number' || typeof item.quantity !== 'number') {
      alert(`Invalid Product data: ${JSON.stringify(item)}`);
      return;
    }
    
    if (item.price <= 0 || item.quantity <= 0) {
      alert(`Product "${item.name}" has invalid price`);
      return;
    }
  }
  
  let subtotal = 0;
  let vatableAmount = 0;
  
  try {
    currentOrder.forEach(item => {
      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;
      
      if (item.vatable === true || item.vatable === undefined) {
        vatableAmount += itemTotal;
      }
    });
    
    if (subtotal <= 0) {
      alert("Order total must be greater than 0!");
      return;
    }
    
    const fixedTax = 57.70;
    const total = parseFloat((subtotal + fixedTax).toFixed(2));
    
    console.log('Calculated amounts:', { subtotal, fixedTax, total });
    
    const tableNumber = orderType.toLowerCase() === 'dine in' 
      ? (document.getElementById('tableNumber')?.value || '1')
      : 'N/A';
    
    switch(selectedPaymentMethod) {
      case 'cash':
        const inputPayment = document.getElementById('inputPayment');
        if (!inputPayment) {
          alert("Payment input field not found! Please refresh the page.");
          return;
        }
        
        if (!inputPayment.value.trim()) {
          alert("Please Input Cash Amount");
          inputPayment.focus();
          return;
        }
        
        const paid = parseFloat(inputPayment.value);
        if (isNaN(paid)) {
          alert("Please enter a valid number for cash amount!");
          inputPayment.value = '';
          inputPayment.focus();
          return;
        }
        
        if (paid < total) {
          alert(`Insufficient payment!\n\nTotal: ₱${total.toFixed(2)}\nPaid: ₱${paid.toFixed(2)}\nShort: ₱${(total - paid).toFixed(2)}`);
          inputPayment.focus();
          inputPayment.select();
          return;
        }
        
        const change = parseFloat((paid - total).toFixed(2));
        
        const confirmMessage = `Confirm Cash Payment:\n\n` +
          `Order Type: ${orderType}\n` +
          `Table: ${tableNumber}\n` +
          `Payment Method: Cash\n` +
          `Total Amount: ₱${total.toFixed(2)}\n` +
          `Amount Paid: ₱${paid.toFixed(2)}\n` +
          `Change: ₱${change.toFixed(2)}\n\n` +
          `Proceed with payment?`;
        
        if (!confirm(confirmMessage)) {
          return;
        }
        
        completePayment('cash', total, paid, change, tableNumber);
        break;
        
      case 'gcash':
        showQRCodeModal(selectedPaymentMethod, total, false);
        break;
        
      default:
        alert(`Unsupported payment method: ${selectedPaymentMethod}`);
        return;
    }
    
  } catch (error) {
    console.error('Error processing payment:', error);
    alert(`Payment processing error: ${error.message}`);
  }
}

// ==================== UPDATE STAFF DASHBOARD FUNCTIONS ====================

// UPDATED completePayment function
function completePayment(paymentMethod, total, paid, change, tableNumber) {
    const orderNumber = 'ORD' + Date.now().toString().slice(-6);
    
    const subtotal = parseFloat(currentOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2));
    
    const vatableAmount = currentOrder
        .filter(item => item.vatable === true || item.vatable === undefined)
        .reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const vatAmount = parseFloat((vatableAmount * 0.12).toFixed(2));
    
    // Prepare order data for MongoDB
    const orderData = {
        orderNumber: orderNumber,
        type: orderType,
        tableNumber: tableNumber,
        payment: {
            method: paymentMethod,
            amountPaid: paid,
            change: change,
            status: "completed"
        },
        items: currentOrder.map(item => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            productId: item._id,
            total: item.price * item.quantity
        })),
        subtotal: subtotal,
        tax: vatAmount,
        total: total,
        customerName: 'Walk-in Customer',
        customerPhone: '',
        status: 'completed',
        notes: '',
        createdAt: new Date().toISOString()
    };
    
    console.log('Processing order for MongoDB:', orderData);
    
    setTimeout(async () => {
        try {
            // 1. Print receipt
            await printReceipt(orderData);
            
            // 2. Save to MongoDB
            const saved = await saveOrderToMongoDB(orderData);
            
            if (saved.success) {
                // 3. Update stock in MongoDB
                await updateStockInMongoDB(currentOrder);
                
                // 4. Show success message
                alert(`Payment Successful!\n\nOrder #: ${orderNumber}\nTotal: ₱${total.toFixed(2)}\nThank you!`);
                
                // 5. Reset UI
                resetOrderUI();
                
                // 6. Broadcast update (optional - for real-time)
                broadcastOrderUpdate(saved.orderId);
                
            } else {
                alert('Error saving order to database. Please try again.');
            }
            
        } catch (error) {
            console.error('Error completing payment:', error);
            alert('Payment processed but there was an error saving to database.');
            resetOrderUI();
        }
    }, 500);
}

// NEW: Save order to MongoDB
async function saveOrderToMongoDB(orderData) {
    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData),
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success) {
            console.log('Order saved to MongoDB:', result.orderNumber);
            return {
                success: true,
                orderId: result.orderId,
                orderNumber: result.orderNumber
            };
        } else {
            throw new Error(result.message || 'Failed to save order');
        }
    } catch (error) {
        console.error('Error saving order to MongoDB:', error);
        
        // Fallback: Try to save locally and sync later
        saveOrderLocally(orderData);
        
        return {
            success: false,
            error: error.message
        };
    }
}

// NEW: Update stock in MongoDB
async function updateStockInMongoDB(orderItems) {
    try {
        for (const item of orderItems) {
            if (item._id) {
                // Update menu item stock
                const response = await fetch(`/api/menu/${item._id}/update-stock`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        quantity: -item.quantity // Negative to reduce stock
                    }),
                    credentials: 'include'
                });

                if (!response.ok) {
                    console.warn(`Failed to update stock for ${item.name}`);
                }
            }
        }
    } catch (error) {
        console.error('Error updating stock in MongoDB:', error);
    }
}

// NEW: Save order locally (fallback when offline)
function saveOrderLocally(orderData) {
    try {
        let pendingOrders = JSON.parse(localStorage.getItem('pendingOrders') || '[]');
        pendingOrders.push({
            ...orderData,
            _localId: Date.now().toString(),
            _synced: false,
            _timestamp: new Date().toISOString()
        });
        localStorage.setItem('pendingOrders', JSON.stringify(pendingOrders));
        console.log('Order saved locally for later sync');
    } catch (error) {
        console.error('Error saving order locally:', error);
    }
}

// NEW: Broadcast order update (for real-time)
function broadcastOrderUpdate(orderId) {
    // Method 1: Use BroadcastChannel for real-time updates
    if (typeof BroadcastChannel !== 'undefined') {
        try {
            const channel = new BroadcastChannel('order_updates');
            channel.postMessage({
                type: 'NEW_ORDER',
                timestamp: new Date().toISOString(),
                message: 'New order completed'
            });
            channel.close();
        } catch (e) {
            console.log('BroadcastChannel error:', e);
        }
    }
    
    // Method 2: Trigger storage event
    try {
        localStorage.setItem('lastOrderUpdate', JSON.stringify({
            timestamp: new Date().toISOString(),
            message: 'Order update available'
        }));
    } catch (e) {
        console.log('Storage event error:', e);
    }
}

// NEW: Sync pending orders
async function syncPendingOrders() {
    try {
        const pendingOrders = JSON.parse(localStorage.getItem('pendingOrders') || '[]');
        const unsyncedOrders = pendingOrders.filter(order => !order._synced);
        
        for (const order of unsyncedOrders) {
            const result = await saveOrderToMongoDB(order);
            if (result.success) {
                order._synced = true;
                order._syncedAt = new Date().toISOString();
            }
        }
        
        // Save updated list
        localStorage.setItem('pendingOrders', JSON.stringify(pendingOrders.filter(order => !order._synced)));
        
        if (unsyncedOrders.length > 0) {
            console.log(`Synced ${unsyncedOrders.length} pending orders`);
        }
    } catch (error) {
        console.error('Error syncing pending orders:', error);
    }
}

// Call this on staff dashboard load
document.addEventListener('DOMContentLoaded', function() {
    // Your existing load code...
    
    // Add sync for pending orders
    syncPendingOrders();
    
    // Set up periodic sync every 5 minutes
    setInterval(syncPendingOrders, 300000);
});

function resetOrderUI() {
  currentOrder = [];
  
  renderOrder();
  renderMenu();
  
  const orderTypeDisplay = document.getElementById("orderTypeDisplay");
  if (orderTypeDisplay) orderTypeDisplay.textContent = "None";
  
  const paymentMethodDisplayEl = document.getElementById("paymentMethodDisplay");
  if (paymentMethodDisplayEl) {
    paymentMethodDisplayEl.textContent = "None";
  }
  
  document.querySelectorAll('.payment-method-btn').forEach(btn => {
    btn.classList.remove('active');
    btn.style.backgroundColor = '';
    btn.style.color = '';
  });
  
  document.querySelectorAll('.dineinandtakeout-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  const tableInput = document.getElementById('tableNumber');
  if (tableInput) {
    tableInput.value = '';
    tableInput.disabled = false;
    tableInput.placeholder = "Enter table #";
  }
  
  const inputPayment = document.getElementById('inputPayment');
  if (inputPayment) {
    inputPayment.value = '';
    inputPayment.disabled = true;
    inputPayment.placeholder = "Select cash payment first";
  }
  
  const changeSection = document.getElementById('changeSection');
  if (changeSection) changeSection.style.display = 'none';
  
  orderType = null;
  selectedPaymentMethod = null;
  
  updatePayButtonState();
  
  console.log('UI reset successfully');
}

function printReceipt(orderData) {
  return new Promise((resolve) => {
    const now = new Date();
    const dateString = now.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const timeString = now.toLocaleTimeString('en-PH', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const companyName = "GRAY COUNTRYSIDE CAFE";
    const storeLocation = "JD Building, Crossing, Norzagaray, Bulacan, Norzagaray, Philippines, 3013";
    const tinNumber = "000-000-000-000";
    const posSerial = "POS001";
    const minNumber = now.getTime().toString().slice(-15);
    const cashier = "CASHIER001";
    
    const invoiceNumber = `SI-${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}-${Math.floor(Math.random()*10000).toString().padStart(4,'0')}`;
    const transactionNumber = `TRX-${now.getTime().toString().slice(-8)}`;
    
    const totalQuantity = orderData.items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = orderData.subtotal;
    const totalDue = orderData.total;
    
    let itemsHTML = '';
    orderData.items.forEach(item => {
      const itemTotal = item.price * item.quantity;
      itemsHTML += `
        <div class="item-row">
          <div class="item-left">
            <span class="item-name">${item.name}</span>
          </div>
          <div class="item-right">
            <span class="item-price">${itemTotal.toFixed(2)}</span>
          </div>
        </div>
      `;
    });
    
    itemsHTML += `
      <div class="divider">---</div>
      
      <div class="subtotal-row">
        <span>SUB-TOTAL</span>
        <span>PHP ${subtotal.toFixed(2)}</span>
      </div>
      
      <div class="subtotal-row">
        <span>VAT (12%)</span>
        <span>PHP ${orderData.vatAmount.toFixed(2)}</span>
      </div>
      
      <div class="divider">---</div>
      
      <div class="total-due-row">
        <span>TOTAL DUE</span>
        <span>PHP ${totalDue.toFixed(2)}</span>
      </div>
    `;
    
    const vatableSales = orderData.vatableAmount || (subtotal - orderData.vatAmount);
    const vatAmount = orderData.vatAmount;
    const zeroRatedSales = 0.00;
    const vatExemptSales = 0.00;
    
    const receiptContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>POS RECEIPT</title>
        <meta charset="UTF-8">
        <style>
          @media print {
            @page {
              size: 80mm auto;
              margin: 0;
              padding: 0;
            }
            
            body {
              width: 76mm;
              margin: 0 auto;
              padding: 1mm;
              font-family: 'Courier New', monospace;
              font-size: 9px;
              line-height: 1.2;
              background: white;
              letter-spacing: -0.5px;
            }
            
            .no-print {
              display: none !important;
            }
          }
          
          @media screen {
            body {
              font-family: 'Courier New', monospace;
              font-size: 9px;
              line-height: 1.2;
              width: 76mm;
              margin: 20px auto;
              padding: 5mm;
              border: 1px solid #ccc;
              background: white;
              letter-spacing: -0.5px;
            }
          }
          
          .receipt {
            width: 100%;
            max-width: 76mm;
          }
          
          .header {
            text-align: center;
            margin-bottom: 2px;
          }
          
          .company-name {
            font-weight: bold;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 1px;
          }
          
          .store-location {
            font-size: 8px;
            line-height: 1;
            margin: 1px 0;
          }
          
          .tin-info {
            font-size: 8px;
            margin: 2px 0;
            text-align: center;
            line-height: 1;
          }
          
          .receipt-title {
            text-align: center;
            font-size: 9px;
            font-weight: bold;
            margin: 3px 0;
          }
          
          .invoice-info {
            font-size: 8px;
            margin: 2px 0;
            text-align: center;
            line-height: 1;
          }
          
          .date-time {
            text-align: center;
            font-size: 8px;
            margin: 2px 0;
            line-height: 1;
          }
          
          .divider {
            text-align: center;
            margin: 2px 0;
            border-top: 1px dashed #000;
            border-bottom: 1px dashed #000;
            padding: 1px 0;
          }
          
          .order-type {
            text-align: center;
            font-size: 8px;
            margin: 2px 0;
            line-height: 1;
          }
          
          .items-list {
            margin: 3px 0;
          }
          
          .item-row {
            margin: 1px 0;
            line-height: 1.1;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          
          .item-left {
            flex: 1;
            display: flex;
            align-items: flex-start;
          }
          
          .item-right {
            flex-shrink: 0;
            text-align: right;
          }
          
          .item-name {
            display: inline-block;
            flex: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          
          .item-price {
            display: inline-block;
            min-width: 25px;
            text-align: right;
          }
          
          .subtotal-row {
            margin-top: 3px;
            padding-top: 2px;
            font-size: 8px;
            line-height: 1.1;
            display: flex;
            justify-content: space-between;
          }
          
          .total-due-row {
            margin-top: 2px;
            font-size: 9px;
            font-weight: bold;
            line-height: 1.1;
            display: flex;
            justify-content: space-between;
          }
          
          .payment-method {
            font-size: 8px;
            margin: 2px 0;
            text-align: center;
            line-height: 1;
          }
          
          .vat-breakdown {
            font-size: 8px;
            margin: 3px 0;
            padding-top: 2px;
            border-top: 1px dashed #000;
          }
          
          .vat-row {
            margin: 1px 0;
            display: flex;
            justify-content: space-between;
          }
          
          .footer {
            text-align: center;
            font-size: 7px;
            margin-top: 5px;
            padding-top: 3px;
            border-top: 1px solid #000;
            line-height: 1;
          }
          
          .thank-you {
            text-align: center;
            font-size: 8px;
            font-weight: bold;
            margin: 3px 0;
            line-height: 1;
          }
          
          .print-btn {
            display: block;
            width: 100%;
            padding: 8px;
            margin-top: 10px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
          }
          
          .print-btn:hover {
            background: #0056b3;
          }
          
          .close-btn {
            display: block;
            width: 100%;
            padding: 8px;
            margin-top: 5px;
            background: #6c757d;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <div class="company-name">${companyName}</div>
            <div class="store-location">${storeLocation}</div>
          </div>
          
          <div class="tin-info">
            TIN: ${tinNumber}<br>
            POS: ${posSerial}<br>
            MIN#: ${minNumber}
          </div>
          
          <div class="receipt-title">RECEIPT</div>
          
          <div class="invoice-info">
            Trans# ${transactionNumber}<br>
            Cashier: ${cashier}
          </div>
          
          <div class="date-time">
            ${dateString} ${timeString} #02
          </div>
          
          <div class="divider">
            ---
          </div>
          
          <div class="order-type">
            ${orderData.type || 'DINE-IN'} ${orderData.tableNumber ? `(Table: ${orderData.tableNumber})` : ''}
          </div>
          
          <div class="items-list">
            ${itemsHTML}
          </div>
          
          <div class="payment-method">
            ${orderData.paymentMethod.toUpperCase()} ${orderData.amountPaid.toFixed(2)}
          </div>
          
          ${orderData.change > 0 ? `
            <div class="subtotal-row">
              <span>CHANGE</span>
              <span>PHP ${orderData.change.toFixed(2)}</span>
            </div>
          ` : ''}
          
          <div class="vat-breakdown">
            <div class="vat-row">
              <span>VATable Sales</span>
              <span>${vatableSales.toFixed(2)}</span>
            </div>
            <div class="vat-row">
              <span>VAT Amount</span>
              <span>${vatAmount.toFixed(2)}</span>
            </div>
            <div class="vat-row">
              <span>Zero-Rated Sales</span>
              <span>${zeroRatedSales.toFixed(2)}</span>
            </div>
            <div class="vat-row">
              <span>VAT-Exempt Sales</span>
              <span>${vatExemptSales.toFixed(2)}</span>
            </div>
          </div>
          
          <div class="thank-you">
            THANK YOU. PLEASE COME AGAIN.
          </div>
          
          <div class="footer">
            ${dateString.replace(/\//g, '').replace(/(\d{2})(\d{2})(\d{4})/, '$3$1$2')}-${timeString}-00000<br>
          </div>
          
          <button class="print-btn no-print" onclick="window.print()">Print Receipt</button>
          <button class="close-btn no-print" onclick="window.close()">Close Window</button>
        </div>
        
        <script>
          setTimeout(function() {
            try {
              window.print();
            } catch(e) {
              console.log('Print failed:', e);
            }
          }, 500);
        </script>
      </body>
      </html>
    `;
    
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.name = 'receiptFrame';
      document.body.appendChild(iframe);
      
      const iframeDoc = iframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(receiptContent);
      iframeDoc.close();
      
      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch (printError) {
          console.log('Iframe print failed:', printError);
        }
        
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
          resolve();
        }, 1000);
      }, 500);
      
    } catch (error) {
      console.log('Print failed:', error);
      resolve();
    }
  });
}

function calculateChangeBreakdown(change) {
  const denominations = [1000, 500, 200, 100, 50, 20, 10, 5, 1, 0.25, 0.10, 0.05, 0.01];
  let remaining = change;
  const breakdown = {};
  
  for (const denom of denominations) {
    if (remaining >= denom - 0.001) {
      const count = Math.floor(remaining / denom + 0.001);
      breakdown[denom.toFixed(2)] = count;
      remaining = Math.round((remaining - (count * denom)) * 100) / 100;
    }
  }
  
  return breakdown;
}

function clearCurrentOrder() {
  if (currentOrder.length === 0) {
    alert("No items to clear");
    return;
  }
  
  if (confirm(`Clear current order with ${currentOrder.length} item(s)?`)) {
    currentOrder = [];
    renderOrder();
    
    const inputPayment = document.getElementById('inputPayment');
    if (inputPayment) {
      inputPayment.value = '';
    }
    
    const changeSection = document.getElementById('changeSection');
    if (changeSection) {
      changeSection.style.display = 'none';
    }
    
    alert("Order cleared successfully");
    updatePayButtonState();
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

function filterCategory(category) {
  const categoryMapping = {
    'all': 'all',
    'Rice Bowl Meals': 'Rice',
    'Hot Sizzlers': 'Sizzling',
    'Party Tray': 'Party',
    'Drinks': 'Drink',
    'Coffee': 'Cafe',
    'Milk Tea': 'Milk',
    'Frappe': 'Frappe',
    'Snack & Appetizer': 'Snack & Appetizer',
    'Budget Meals Served with Rice': 'Budget Meals Served with Rice',
    'Specialties': 'Specialties'
  };
  
  const actualCategory = categoryMapping[category] || category;
  currentCategory = actualCategory;
  console.log(`Filtering category: ${category} -> ${actualCategory}`);
  renderMenu();
  
  document.querySelectorAll('.category-btn').forEach(btn => {
    const btnCategory = btn.getAttribute('data-category');
    if (btnCategory === category) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

document.addEventListener('DOMContentLoaded', function() {
  renderMenu();
  
  updatePayButtonState();
  
  if (!orderType) {
    setDineIn();
  }
  
  initializeQRCodeImages();
  
  const tableInput = document.getElementById('tableNumber');
  if (tableInput) {
    tableInput.addEventListener('input', updatePayButtonState);
  }
  
  const inputPayment = document.getElementById('inputPayment');
  if (inputPayment) {
    inputPayment.addEventListener('input', updatePayButtonState);
  }
  
  const categoryButtons = document.querySelectorAll('.category-btn');
  if (categoryButtons.length > 0) {
    categoryButtons.forEach(btn => {
      const category = btn.getAttribute('data-category');
      btn.addEventListener('click', () => filterCategory(category));
      
      if (category === 'all') {
        btn.classList.add('active');
      }
    });
  } else {
  }
  
  const searchInput = document.querySelector('input[type="text"][placeholder*="Search"]');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchFood(e.target.value);
    });
  }
  
  console.log('Point of Sale System - GCash & Cash Payment Methods Only');
});


// Sa staffdashboard.html or sales script
document.addEventListener('DOMContentLoaded', function() {
    // Function para mag-save ng bagong order
    function saveNewOrder(orderData) {
        // 1. I-save ang order sa database/local storage
        saveOrderToDatabase(orderData);
        
        // 2. I-update ang local totals
        updateLocalTotals(orderData);
        
        // 3. I-update ang UI
        updateDashboardUI();
    }
    
    function updateLocalTotals(orderData) {
        // Kunin ang current totals
        let currentOrders = localStorage.getItem('totalOrders') || 0;
        let currentRevenue = localStorage.getItem('totalRevenue') || 0;
        let currentCustomers = localStorage.getItem('totalCustomers') || 0;
        
        // Dagdagan ang totals
        let newTotalOrders = parseInt(currentOrders) + 1;
        let newTotalRevenue = parseFloat(currentRevenue) + parseFloat(orderData.total);
        
        // Check kung bagong customer
        let customerExists = checkCustomerExists(orderData.customerPhone);
        let newTotalCustomers = parseInt(currentCustomers);
        
        if (!customerExists) {
            newTotalCustomers += 1;
            saveNewCustomer(orderData);
        }
        
        // I-save ang updated totals
        localStorage.setItem('totalOrders', newTotalOrders);
        localStorage.setItem('totalRevenue', newTotalRevenue);
        localStorage.setItem('totalCustomers', newTotalCustomers);
        
        // I-sync sa server (kung may backend)
        syncTotalsToServer({
            orders: newTotalOrders,
            revenue: newTotalRevenue,
            customers: newTotalCustomers
        });
    }
    
    function checkCustomerExists(phone) {
        let customers = JSON.parse(localStorage.getItem('customers') || '[]');
        return customers.some(customer => customer.phone === phone);
    }
    
    function saveNewCustomer(orderData) {
        let customers = JSON.parse(localStorage.getItem('customers') || '[]');
        customers.push({
            id: Date.now(),
            name: orderData.customerName,
            phone: orderData.customerPhone,
            firstOrder: new Date().toISOString()
        });
        localStorage.setItem('customers', JSON.stringify(customers));
    }
});

// Sa parehong staff at admin dashboard
const dashboardData = {
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    lastUpdate: null
};

// Missing function implementations
function saveOrderToDatabase(orderData) {
    try {
        let orders = JSON.parse(localStorage.getItem('orders') || '[]');
        orders.push(orderData);
        localStorage.setItem('orders', JSON.stringify(orders));
        console.log('Order saved successfully');
    } catch (error) {
        console.error('Error saving order:', error);
    }
}

function updateDashboardUI() {
    try {
        const totalOrdersEl = document.getElementById('totalOrders');
        const totalRevenueEl = document.getElementById('totalRevenue');
        const totalCustomersEl = document.getElementById('totalCustomers');
        
        if (totalOrdersEl) totalOrdersEl.textContent = dashboardData.totalOrders;
        if (totalRevenueEl) totalRevenueEl.textContent = '₱' + dashboardData.totalRevenue.toFixed(2);
        if (totalCustomersEl) totalCustomersEl.textContent = dashboardData.totalCustomers;
    } catch (error) {
        console.error('Error updating dashboard UI:', error);
    }
}

function syncTotalsToServer(totals) {
    try {
        fetch('/api/sales-summary', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(totals),
            credentials: 'include'
        }).catch(err => console.log('Server sync skipped (offline mode)', err));
    } catch (error) {
        console.log('Sync to server failed - operating in offline mode');
    }
}

function updateOrderStats(orderData) {
    try {
        // Get current stats from localStorage
        let stats = JSON.parse(localStorage.getItem('dashboardStats') || '{"totalOrders": 0, "totalRevenue": 0, "totalCustomers": 0}');
        
        // Update counts
        stats.totalOrders = (stats.totalOrders || 0) + 1;
        stats.totalRevenue = (stats.totalRevenue || 0) + (orderData.total || 0);
        
        // Count unique customers (simplified: increment if order type is different or first order)
        stats.totalCustomers = (stats.totalCustomers || 0) + 1;
        stats.lastUpdate = new Date().toISOString();
        
        // Save back to localStorage
        localStorage.setItem('dashboardStats', JSON.stringify(stats));
        
        console.log('Order stats updated:', stats);
    } catch (error) {
        console.error('Error updating order stats:', error);
    }
}

function broadcastDashboardUpdate(orderData) {
    try {
        // Get current stats
        const stats = JSON.parse(localStorage.getItem('dashboardStats') || '{"totalOrders": 0, "totalRevenue": 0, "totalCustomers": 0}');
        
        const updateData = {
            type: 'order_completed',
            orderNumber: orderData.orderNumber,
            stats: stats,
            orderData: orderData,
            timestamp: new Date().toISOString()
        };
        
        // Trigger storage event for localStorage listeners
        localStorage.setItem('lastOrderUpdate', JSON.stringify(updateData));
        
        // Use BroadcastChannel for real-time updates
        if (typeof BroadcastChannel !== 'undefined') {
            try {
                const channel = new BroadcastChannel('dashboard_updates');
                channel.postMessage(updateData);
                channel.close();
            } catch (e) {
                console.log('BroadcastChannel error:', e);
            }
        }
        
        console.log('Dashboard update broadcasted');
    } catch (error) {
        console.error('Error broadcasting dashboard update:', error);
    }
}

function broadcastUpdate() {
    try {
        if (typeof BroadcastChannel !== 'undefined') {
            const channel = new BroadcastChannel('dashboard_updates');
            channel.postMessage(dashboardData);
            channel.close();
        }
    } catch (error) {
        console.log('Broadcast failed:', error);
    }
}

function updateFromStorage(data) {
    if (data && typeof data === 'object') {
        dashboardData.totalOrders = data.totalOrders || 0;
        dashboardData.totalRevenue = data.totalRevenue || 0;
        dashboardData.totalCustomers = data.totalCustomers || 0;
        dashboardData.lastUpdate = data.lastUpdate || null;
        updateDashboardUI();
    }
}

function updateDashboardDisplay(data) {
    updateFromStorage(data);
}

function customerExists(customerId) {
    try {
        let orders = JSON.parse(localStorage.getItem('orders') || '[]');
        return orders.some(order => order.customerId === customerId);
    } catch (error) {
        return false;
    }
}

// Function para i-sync ang data
function syncDashboardData() {
    // Sa staff dashboard (pag may bagong order)
    function onNewOrder(order) {
        // Update local data
        dashboardData.totalOrders += 1;
        dashboardData.totalRevenue += order.total;
        
        // Check for new customer
        if (!customerExists(order.customerId)) {
            dashboardData.totalCustomers += 1;
        }
        
        // Save to local storage
        localStorage.setItem('dashboardData', JSON.stringify(dashboardData));
        
        // Broadcast update (para sa real-time)
        broadcastUpdate();
    }
    
    // Sa admin dashboard (to receive updates)
    function listenForUpdates() {
        // Listen for storage events (cross-tab communication)
        window.addEventListener('storage', function(e) {
            if (e.key === 'dashboardData') {
                updateFromStorage(JSON.parse(e.newValue));
            }
        });
        
        // Or use BroadcastChannel API
        if (typeof BroadcastChannel !== 'undefined') {
            try {
                const channel = new BroadcastChannel('dashboard_updates');
                channel.onmessage = function(e) {
                    updateDashboardDisplay(e.data);
                };
            } catch (error) {
                console.log('BroadcastChannel not available');
            }
        }
    }
}

// Staff Dashboard - For order creation
document.addEventListener('DOMContentLoaded', function() {
    // Load existing dashboard data
    const savedData = localStorage.getItem('dashboardData');
    if (savedData) {
        const parsedData = JSON.parse(savedData);
        window.dashboardData = {
            totalOrders: parsedData.totalOrders || 0,
            totalRevenue: parsedData.totalRevenue || 0,
            totalCustomers: parsedData.totalCustomers || 0,
            customers: new Set(parsedData.customerIds || [])
        };
    } else {
        window.dashboardData = {
            totalOrders: 0,
            totalRevenue: 0,
            totalCustomers: 0,
            customers: new Set()
        };
    }
    
    // Set up order form submission
    const orderForm = document.getElementById('orderForm');
    if (orderForm) {
        orderForm.addEventListener('submit', handleOrderSubmit);
    }
});

function handleOrderSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const orderDetails = {
        customerId: formData.get('customerId'),
        items: JSON.parse(formData.get('items') || '[]'),
        total: parseFloat(formData.get('total')) || 0,
        timestamp: new Date().toISOString()
    };
    
    // Create the order
    createNewOrder(orderDetails);
    
    // Reset form
    event.target.reset();
    alert('Order created successfully!');
}

function createNewOrder(orderDetails) {
    // Update local data
    window.dashboardData.totalOrders += 1;
    window.dashboardData.totalRevenue += orderDetails.total;
    
    // Check for new customer
    if (orderDetails.customerId && !window.dashboardData.customers.has(orderDetails.customerId)) {
        window.dashboardData.customers.add(orderDetails.customerId);
        window.dashboardData.totalCustomers = window.dashboardData.customers.size;
    }
    
    // Save to localStorage
    const dataToSave = {
        totalOrders: window.dashboardData.totalOrders,
        totalRevenue: window.dashboardData.totalRevenue,
        totalCustomers: window.dashboardData.totalCustomers,
        lastUpdate: new Date().toISOString(),
        customerIds: Array.from(window.dashboardData.customers)
    };
    
    localStorage.setItem('dashboardData', JSON.stringify(dataToSave));
    
    // Broadcast update
    broadcastUpdate();
    
    // Send to server
    sendOrderToServer(orderDetails);
}

function broadcastUpdate() {
    // Use BroadcastChannel if available
    if (window.BroadcastChannel) {
        const channel = new BroadcastChannel('dashboard_updates');
        channel.postMessage({
            type: 'dashboard_update',
            payload: {
                totalOrders: window.dashboardData.totalOrders,
                totalRevenue: window.dashboardData.totalRevenue,
                totalCustomers: window.dashboardData.totalCustomers
            }
        });
    }
}

function sendOrderToServer(orderDetails) {
    fetch('/api/orders', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderDetails)
    })
    .then(response => response.json())
    .then(data => {
        console.log('Order saved to server:', data);
    })
    .catch(error => {
        console.error('Error saving order:', error);
    });
}

function broadcastToAdmin(orderData) {
  try {
    // 1. Update localStorage (for cross-tab communication)
    let currentOrders = JSON.parse(localStorage.getItem('orders') || '[]');
    currentOrders.push(orderData);
    localStorage.setItem('orders', JSON.stringify(currentOrders));
    
    // 2. Update dashboard stats
    let dashboardData = JSON.parse(localStorage.getItem('dashboardData') || '{"totalOrders": 0, "totalRevenue": 0, "totalCustomers": 0}');
    dashboardData.totalOrders = (dashboardData.totalOrders || 0) + 1;
    dashboardData.totalRevenue = (dashboardData.totalRevenue || 0) + orderData.total;
    dashboardData.totalCustomers = (dashboardData.totalCustomers || 0) + 1; // Simplified
    localStorage.setItem('dashboardData', JSON.stringify(dashboardData));
    
    // 3. Force storage event
    localStorage.setItem('lastUpdate', Date.now().toString());
    
    // 4. Use BroadcastChannel
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const channel = new BroadcastChannel('dashboard_updates');
        channel.postMessage({
          type: 'order_completed',
          orderData: orderData,
          stats: dashboardData,
          timestamp: new Date().toISOString()
        });
        channel.close();
      } catch (e) {
        console.log('BroadcastChannel error:', e);
      }
    }
    
    console.log('Order broadcasted to admin dashboard');
  } catch (error) {
    console.error('Error broadcasting to admin:', error);
  }
}

function loadMenuForStaff() {
    const menuData = JSON.parse(localStorage.getItem('menuData') || '[]');
    const inventoryData = JSON.parse(localStorage.getItem('inventoryData') || '[]');
    
    // Filter only available items (in stock)
    const availableItems = menuData.filter(item => 
        item.available && item.inStock && item.stockLevel > 0
    );
    
    renderMenuItems(availableItems);
}

function refreshMenuDisplay() {
    loadMenuForStaff();
}