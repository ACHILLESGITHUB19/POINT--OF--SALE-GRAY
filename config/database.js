import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;

export const connectDB = async () => {
  try {
    if (!MONGO_URI) {
      throw new Error("MONGODB_URI is not defined in environment variables");
    }
    
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000, 
      socketTimeoutMS: 45000,
    }); 
    
    console.log("MongoDB Atlas connected successfully");
  } catch (error) {
    console.error("MongoDB Atlas connection failed:", error.message);
    process.exit(1); 
  }
};

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["admin", "staff", "Cashier"], default: "staff" },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

export const User = mongoose.model("User", userSchema);

// Category Schema
const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      unique: true,
      trim: true,
    },
  },
  { timestamps: true }
);

export const Category = mongoose.model("Category", categorySchema);

// Inventory Item Schema
const inventoryItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Inventory item name is required"],
      unique: true,
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: [
        "Rice Bowl Meals",
        "Hot Sizzlers",
        "Party Tray",
        "Drinks",
        "Coffee",
        "Milk Tea",
        "Frappe",
        "Snacks & Appetizer",
        "Budget Meals Served with Rice",
        "Specialties"
      ]
    },
    currentStock: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    minStock: {
      type: Number,
      required: true,
      min: 1,
      default: 10
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: 0
    },
    lastRestock: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ["sufficient", "low", "critical", "out"],
      default: "sufficient"
    },
    restockHistory: [{
      quantity: Number,
      cost: Number,
      notes: String,
      date: { type: Date, default: Date.now },
      userId: String
    }],
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Calculate status based on stock levels
inventoryItemSchema.pre('save', function(next) {
  if (this.currentStock === 0) {
    this.status = "out";
  } else if (this.currentStock <= this.minStock * 0.3) {
    this.status = "critical";
  } else if (this.currentStock <= this.minStock * 0.7) {
    this.status = "low";
  } else {
    this.status = "sufficient";
  }
  
  this.updatedAt = Date.now();
  next();
});

export const InventoryItem = mongoose.model("InventoryItem", inventoryItemSchema);

// Product Schema (for POS/menu items)
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      unique: true
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: [
        "Rice Bowl Meals",
        "Hot Sizzlers",
        "Party Tray",
        "Drinks",
        "Coffee",
        "Milk Tea",
        "Frappe",
        "Snacks & Appetizer",
        "Budget Meals Served with Rice",
        "Specialties"
      ]
    },
    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: 0,
    },
    inventoryItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: [true, "Inventory item reference is required"]
    },
    status: {
      type: String,
      enum: ["available", "unavailable"],
      default: "available"
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

export const Product = mongoose.model("Product", productSchema);

// Customer Schema
const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    sparse: true
  },
  email: {
    type: String,
    sparse: true
  },
  totalOrders: {
    type: Number,
    default: 0,
    min: 0
  },
  totalSpent: {
    type: Number,
    default: 0,
    min: 0
  },
  firstOrder: {
    type: Date
  },
  lastOrder: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

export const Customer = mongoose.model("Customer", customerSchema);

// Order Schema
const orderSchema = new mongoose.Schema({
  items: [
    {
      name: String,
      price: Number,
      quantity: Number,
      inventoryItemId: mongoose.Schema.Types.ObjectId,
      productId: mongoose.Schema.Types.ObjectId
    }
  ],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    sparse: true
  },
  payment: {
    method: {
      type: String,
      enum: ["cash", "gcash"],
      default: "cash",
      required: true
    },
    amountPaid: {
      type: Number,
      required: true,
      min: 0
    },
    change: {
      type: Number,
      default: 0,
      min: 0
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "completed"
    }
  },
  type: {
    type: String,
    enum: ["Dine In", "Take Out"],
    default: "Dine In"
  },
  status: {
    type: String,
    enum: ["pending", "preparing", "ready", "served", "completed", "cancelled"],
    default: "pending"
  },
  orderNumber: {
    type: String,
    unique: true,
    default: function() {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return `ORD-${year}${month}${day}-${random}`;
    }
  },
  notes: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
}, {
  timestamps: true
});

// Update inventory when order is completed
orderSchema.pre('save', async function(next) {
  if (this.isModified('status') && this.status === 'completed') {
    try {
      for (const item of this.items) {
        if (item.inventoryItemId) {
          const inventoryItem = await InventoryItem.findById(item.inventoryItemId);
          if (inventoryItem) {
            inventoryItem.currentStock -= item.quantity;
            await inventoryItem.save();
          }
        }
      }
    } catch (error) {
      console.error('Error updating inventory:', error);
    }
  }
  next();
});

orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ "payment.status": 1 });

export const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);

// Sales Data Schema (for dashboard)
const salesDataSchema = new mongoose.Schema({
  date: {
    type: String, // Format: "Mon", "Tue", etc.
    required: true
  },
  fullDate: {
    type: Date,
    required: true
  },
  total: {
    type: Number,
    default: 0
  },
  items: {
    type: Map,
    of: {
      quantity: Number,
      price: Number
    },
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

salesDataSchema.index({ fullDate: 1 });

export const SalesData = mongoose.model("SalesData", salesDataSchema);

// Daily Sales Schema
const dailySalesSchema = new mongoose.Schema({
  dateKey: {
    type: String, // Format: YYYY-MM-DD
    required: true,
    unique: true
  },
  totalSales: {
    type: Number,
    default: 0
  },
  totalCosts: {
    type: Number,
    default: 0
  },
  profit: {
    type: Number,
    default: 0
  },
  itemsSold: {
    type: Map,
    of: {
      quantity: Number,
      price: Number
    },
    default: {}
  },
  inventoryCosts: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

export const DailySales = mongoose.model("DailySales", dailySalesSchema);

// Stats Schema
const StatsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true,
    default: () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return today;
    }
  },
  
  totalOrders: {
    type: Number,
    default: 0
  },
  ordersToday: {
    type: Number,
    default: 0
  },
  
  itemsSold: {
    type: Number,
    default: 0
  },
  itemsSoldToday: {
    type: Number,
    default: 0
  },
  
  dineInOrders: {
    type: Number,
    default: 0
  },
  takeoutOrders: {
    type: Number,
    default: 0
  },
  
  paymentStats: {
    cash: { type: Number, default: 0 },
    gcash: { type: Number, default: 0 }
  },
  
  categoryStats: {
    Rice: { type: Number, default: 0 },
    Sizzling: { type: Number, default: 0 },
    Party: { type: Number, default: 0 },
    Drink: { type: Number, default: 0 },
    Cafe: { type: Number, default: 0 },
    Milk: { type: Number, default: 0 },
    Frappe: { type: Number, default: 0 }
  },
  
  topProducts: [{
    name: String,
    quantity: Number,
  }],
  
  // Inventory Statistics
  inventoryStats: {
    totalItems: { type: Number, default: 0 },
    lowStockItems: { type: Number, default: 0 },
    outOfStockItems: { type: Number, default: 0 },
    totalInventoryValue: { type: Number, default: 0 },
    itemsAddedToday: { type: Number, default: 0 },
    itemsRestockedToday: { type: Number, default: 0 },
    totalRestockCost: { type: Number, default: 0 }
  },
  
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update statistics including inventory data
StatsSchema.statics.updateStats = async function(orderData, inventoryUpdate = null) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let stats = await this.findOne({ date: today });
  
  if (!stats) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStats = await this.findOne({ date: yesterday });
    
    stats = new this({
      date: today,
      totalOrders: yesterdayStats ? yesterdayStats.totalOrders : 0,
      itemsSold: yesterdayStats ? yesterdayStats.itemsSold : 0,
      dineInOrders: yesterdayStats ? yesterdayStats.dineInOrders : 0,
      takeoutOrders: yesterdayStats ? yesterdayStats.takeoutOrders : 0,
      paymentStats: yesterdayStats ? yesterdayStats.paymentStats : {
        cash: 0, gcash: 0
      },
      categoryStats: yesterdayStats ? yesterdayStats.categoryStats : {
        Rice: 0, Sizzling: 0, Party: 0, Drink: 0, 
        Cafe: 0, Milk: 0, Frappe: 0
      },
      inventoryStats: yesterdayStats ? yesterdayStats.inventoryStats : {
        totalItems: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
        totalInventoryValue: 0,
        itemsAddedToday: 0,
        itemsRestockedToday: 0,
        totalRestockCost: 0
      }
    });
  }
  
  // Update order statistics
  stats.totalOrders += 1;
  stats.ordersToday += 1;
  
  const itemsInOrder = orderData.items.reduce((sum, item) => sum + item.quantity, 0);
  stats.itemsSold += itemsInOrder;
  stats.itemsSoldToday += itemsInOrder;
  
  if (orderData.type === 'Dine In') {
    stats.dineInOrders += 1;
  } else if (orderData.type === 'Take Out') {
    stats.takeoutOrders += 1;
  }
  
  const paymentMethod = orderData.payment?.method || 'cash';
  if (stats.paymentStats[paymentMethod] !== undefined) {
    stats.paymentStats[paymentMethod] += 1;
  }
  
  // Update category statistics
  orderData.items.forEach(item => {
    const itemName = item.name.toLowerCase();
    if (itemName.includes('bulgogi') || itemName.includes('lechon') || 
        itemName.includes('chicken') || itemName.includes('adobo') || 
        itemName.includes('shanghai') || itemName.includes('fish') || 
        itemName.includes('dory') || itemName.includes('pork')) {
      stats.categoryStats.Rice += item.quantity;
    } else if (itemName.includes('sizzling') || itemName.includes('sisig') || 
               itemName.includes('liempo') || itemName.includes('porkchop')) {
      stats.categoryStats.Sizzling += item.quantity;
    } else if (itemName.includes('pancit') || itemName.includes('spaghetti') || 
               itemName.includes('party')) {
      stats.categoryStats.Party += item.quantity;
    } else if (itemName.includes('lemonade') || itemName.includes('soda') || 
               itemName.includes('red tea') && !itemName.includes('milk')) {
      stats.categoryStats.Drink += item.quantity;
    } else if (itemName.includes('cafe') || itemName.includes('americano') || 
               itemName.includes('latte') || itemName.includes('macchiato') || 
               itemName.includes('coffee')) {
      stats.categoryStats.Cafe += item.quantity;
    } else if (itemName.includes('milk tea') || itemName.includes('matcha green tea')) {
      stats.categoryStats.Milk += item.quantity;
    } else if (itemName.includes('frappe') || itemName.includes('cookies & cream')) {
      stats.categoryStats.Frappe += item.quantity;
    }
  });
  
  // Update top products
  orderData.items.forEach(item => {
    const existingProduct = stats.topProducts.find(p => p.name === item.name);
    if (existingProduct) {
      existingProduct.quantity += item.quantity;
    } else {
      stats.topProducts.push({
        name: item.name,
        quantity: item.quantity,
      });
    }
  });
  
  stats.topProducts.sort((a, b) => b.quantity - a.quantity);
  stats.topProducts = stats.topProducts.slice(0, 10);
  
  // Update inventory statistics if provided
  if (inventoryUpdate) {
    if (inventoryUpdate.type === 'add') {
      stats.inventoryStats.itemsAddedToday += 1;
    } else if (inventoryUpdate.type === 'restock') {
      stats.inventoryStats.itemsRestockedToday += 1;
      stats.inventoryStats.totalRestockCost += inventoryUpdate.cost || 0;
    }
  }
  
  stats.lastUpdated = new Date();
  await stats.save();
  
  return stats;
};

// Update inventory statistics
StatsSchema.statics.updateInventoryStats = async function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let stats = await this.findOne({ date: today });
  
  if (!stats) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStats = await this.findOne({ date: yesterday });
    
    stats = new this({
      date: today,
      totalOrders: yesterdayStats ? yesterdayStats.totalOrders : 0,
      itemsSold: yesterdayStats ? yesterdayStats.itemsSold : 0,
      dineInOrders: yesterdayStats ? yesterdayStats.dineInOrders : 0,
      takeoutOrders: yesterdayStats ? yesterdayStats.takeoutOrders : 0,
      paymentStats: yesterdayStats ? yesterdayStats.paymentStats : {
        cash: 0, gcash: 0
      },
      categoryStats: yesterdayStats ? yesterdayStats.categoryStats : {
        Rice: 0, Sizzling: 0, Party: 0, Drink: 0, 
        Cafe: 0, Milk: 0, Frappe: 0
      },
      inventoryStats: {
        totalItems: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
        totalInventoryValue: 0,
        itemsAddedToday: 0,
        itemsRestockedToday: 0,
        totalRestockCost: 0
      }
    });
  }
  
  // Get current inventory statistics
  const inventoryItems = await InventoryItem.find();
  
  let lowStock = 0;
  let outOfStock = 0;
  let totalValue = 0;
  
  inventoryItems.forEach(item => {
    if (item.status === "low" || item.status === "critical") {
      lowStock++;
    }
    if (item.status === "out") {
      outOfStock++;
    }
    if (item.price && item.currentStock) {
      totalValue += item.currentStock * item.price;
    }
  });
  
  stats.inventoryStats.totalItems = inventoryItems.length;
  stats.inventoryStats.lowStockItems = lowStock;
  stats.inventoryStats.outOfStockItems = outOfStock;
  stats.inventoryStats.totalInventoryValue = totalValue;
  
  stats.lastUpdated = new Date();
  await stats.save();
  
  return stats;
};

StatsSchema.statics.getDashboardStats = async function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const stats = await this.findOne({ date: today });
  
  if (!stats) {
    // Get inventory statistics if no stats exist
    const inventoryItems = await InventoryItem.find();
    let lowStock = 0;
    let outOfStock = 0;
    let totalValue = 0;
    
    inventoryItems.forEach(item => {
      if (item.status === "low" || item.status === "critical") {
        lowStock++;
      }
      if (item.status === "out") {
        outOfStock++;
      }
      if (item.price && item.currentStock) {
        totalValue += item.currentStock * item.price;
      }
    });
    
    return {
      totalOrders: 0,
      totalProducts: 0,
      totalStocks: 0,
      ordersToday: 0,
      itemsSoldToday: 0,
      dineInToday: 0,
      takeoutToday: 0,
      paymentStats: {
        cash: 0, gcash: 0
      },
      categoryStats: {
        Rice: 0, Sizzling: 0, Party: 0, Drink: 0, 
        Cafe: 0, Milk: 0, Frappe: 0
      },
      topProducts: [],
      inventoryStats: {
        totalItems: inventoryItems.length,
        lowStockItems: lowStock,
        outOfStockItems: outOfStock,
        totalInventoryValue: totalValue,
        itemsAddedToday: 0,
        itemsRestockedToday: 0,
        totalRestockCost: 0
      }
    };
  }
  
  const uniqueProducts = stats.topProducts.length;
  
  return {
    totalOrders: stats.totalOrders,
    totalProducts: uniqueProducts,
    totalStocks: stats.itemsSold,
    ordersToday: stats.ordersToday,
    itemsSoldToday: stats.itemsSoldToday,
    dineInToday: stats.dineInOrders,
    takeoutToday: stats.takeoutOrders,
    paymentStats: stats.paymentStats,
    categoryStats: stats.categoryStats,
    topProducts: stats.topProducts,
    inventoryStats: stats.inventoryStats
  };
};

export const Stats = mongoose.models.Stats || mongoose.model("Stats", StatsSchema);

// MenuItem Schema
const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Rice Bowl Meals',
      'Hot Sizzlers',
      'Party Tray',
      'Drinks',
      'Coffee',
      'Milk Tea',
      'Frappe',
      'Snacks & Appetizer',
      'Budget Meals Served with Rice',
      'Specialties'
    ]
  },
  status: {
    type: String,
    enum: ['available', 'unavailable'],
    default: 'available'
  },
  image: {
    type: String,
    default: 'default_food.png'
  },
  stock: {
    type: Number,
    default: 100,
    min: 0
  },
  unit: {
    type: String,
    default: 'pcs'
  },
  vatable: {
    type: Boolean,
    default: true
  },
  inventoryItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "InventoryItem",
    sparse: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update timestamp
menuItemSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export const MenuItem = mongoose.model('MenuItem', menuItemSchema);