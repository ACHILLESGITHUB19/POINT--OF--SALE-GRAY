import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from 'url';
import { connectDB, User, Category } from "./config/database.js";
import Stats from "./models/Stats.js";
import MenuItem from "./models/Menuitems.js";
import Product from "./models/Product.js";
import Order from "./models/Order.js";
import categoryRoutes from "./routes/categoryroute.js";
import productRoutes from "./routes/productroute.js";

// Dotenv config
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'MONGODB_URI'];
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`ERROR: ${varName} not defined in .env file`);
    process.exit(1);
  }
});

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to database
await connectDB();

// ==================== GLOBAL VARIABLES ====================
const adminClients = new Set();

// ==================== MIDDLEWARE ====================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use('/images', express.static(path.join(__dirname, "images")));
app.set("view engine", "ejs");
app.set('views', path.join(__dirname, 'views'));

// ==================== AUTHENTICATION MIDDLEWARE ====================

// Authentication middleware
const verifyToken = (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.redirect("/login");

    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    console.error("Token verification failed:", err);
    res.clearCookie("token");
    res.redirect("/login");
  }
};

// Admin middleware
const verifyAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.redirect("/staffdashboard");
  }
  next();
};

// ==================== REAL-TIME UPDATES (SSE) ====================

// SSE endpoint for admin dashboard
app.get('/api/admin/events', verifyToken, verifyAdmin, (req, res) => {
  console.log('📡 Admin client connecting to real-time events...');
  
  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  // Send initial connection message
  res.write('data: {"type": "connected", "message": "Connected to real-time updates"}\n\n');

  // Add client to set
  const clientId = Date.now();
  const client = {
    id: clientId,
    res: res
  };
  
  adminClients.add(client);
  console.log(`✅ Admin client ${clientId} connected. Total clients: ${adminClients.size}`);

  // Remove client when connection closes
  req.on('close', () => {
    adminClients.delete(client);
    console.log(`❌ Admin client ${clientId} disconnected. Remaining: ${adminClients.size}`);
  });
});

// Function to broadcast events to all connected admin clients
const broadcastToAdmins = (data) => {
  if (adminClients.size === 0) {
    console.log('⚠️ No admin clients connected to send event:', data.type);
    return;
  }
  
  const eventData = `data: ${JSON.stringify(data)}\n\n`;
  console.log(`📤 Broadcasting ${data.type} to ${adminClients.size} admin clients`);
  
  adminClients.forEach(client => {
    try {
      client.res.write(eventData);
      // Try to flush the data immediately
      if (client.res.flush) {
        client.res.flush();
      }
    } catch (error) {
      console.error('❌ Error sending SSE to client:', error.message);
      adminClients.delete(client);
    }
  });
};

// Function to send new order notification
const sendOrderNotification = (order) => {
  console.log('🆕 Sending new order notification:', order.orderNumber);
  
  broadcastToAdmins({
    type: 'new_order',
    data: {
      id: order._id.toString(),
      orderNumber: order.orderNumber || `ORD-${Date.now()}`,
      total: order.total || 0,
      type: order.type || 'Dine In',
      paymentMethod: order.payment?.method || 'cash',
      timestamp: new Date().toLocaleTimeString(),
      items: order.items?.length || 0,
      createdAt: order.createdAt || new Date()
    },
    message: `New order #${order.orderNumber} received!`
  });

  // Also send stats update after a short delay
  setTimeout(() => {
    updateStatsForAdmins();
  }, 500);
};

// Function to update stats for admin clients
const updateStatsForAdmins = async () => {
  try {
    const totalOrders = await Order.countDocuments();
    const ordersToday = await Order.countDocuments({
      createdAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0))
      }
    });
    
    const totalRevenueResult = await Order.aggregate([
      { $group: { _id: null, total: { $sum: "$total" } } }
    ]);
    
    const totalRevenue = totalRevenueResult[0]?.total || 0;

    broadcastToAdmins({
      type: 'stats_update',
      data: {
        totalOrders,
        ordersToday,
        totalRevenue
      }
    });
  } catch (error) {
    console.error('❌ Error updating stats for admins:', error);
  }
};

// ==================== ROUTES ====================
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);

// Static pages
const pages = ["login", "register", "order"];
pages.forEach(page => {
  app.get(`/${page.toLowerCase()}`, (req, res) => res.render(page));
});

// Home route
app.get('/', (req, res) => {
  res.redirect('/login');
});

// Register route
app.post("/register", async (req, res) => {
  try {
    const referer = req.headers.referer || req.headers.referrer;
    if (!referer || !referer.includes('/admindashboard/addstaff')) {
      return res.status(403).json({ 
        message: "Access denied. Use admin dashboard to register staff." 
      });
    }

    const { user, pass, role } = req.body;
    
    if (!user || !pass) {
      return res.status(400).json({  
        message: "Username and password are required" 
      });
    }

    const existingUser = await User.findOne({ username: user });
    if (existingUser) {
      return res.status(409).json({ 
        message: "User already exists" 
      });
    }

    const hashedPassword = bcrypt.hashSync(pass, 10);
    const newUser = new User({ 
      username: user, 
      password: hashedPassword, 
      role: role || "staff",
      status: "active"
    });

    await newUser.save(); 
    
    res.status(201).json({  
      message: "Staff account created successfully" 
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ 
      message: "Server error" 
    });
  }
});

// Login route
app.post("/login", async (req, res) => {
  try {
    const { user, pass } = req.body;

    const existingUser = await User.findOne({ username: user });
    if (!existingUser) {
      return res.render("login", {
        error: "User not found"
      });
    }

    if (existingUser.status === "inactive") {
      return res.render("login", {
        error: "Account is deactivated"
      });
    }

    const isMatch = bcrypt.compareSync(pass, existingUser.password);
    if (!isMatch) {
      return res.render("login", {
        error: "Invalid password"
      });
    }

    const token = jwt.sign(
      { 
        id: existingUser._id, 
        username: existingUser.username, 
        role: existingUser.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: "365d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "strict",
      maxAge: 1000 * 60 * 60 * 24 * 365
    });

    // Redirect based on user role
    if (existingUser.role === "admin") {
      return res.redirect("/admindashboard");
    } else {
      return res.redirect("/staffdashboard");
    }

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.render("login", {
      error: "Login error"
    });
  }
});

// Order API
app.post('/api/orders', async (req, res) => {
  try {
    const orderData = req.body;
    
    if (!orderData.items || !orderData.items.length) {
      return res.status(400).json({ 
        success: false, 
        message: "No items in order" 
      });
    }
    
    if (!orderData.total || orderData.total <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Total amount is required and must be greater than 0" 
      });
    }
    
    if (!orderData.payment || !orderData.payment.amountPaid) {
      return res.status(400).json({ 
        success: false, 
        message: "Payment amount is required" 
      });
    }
    
    const amountPaid = orderData.payment.amountPaid || 0;
    const total = orderData.total || 0;
    const change = amountPaid - total;
    
    if (change < 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Insufficient payment amount" 
      });
    }
    
    if (!orderData.type) {
      orderData.type = "Dine In";
    }
    
    const paymentMethod = orderData.payment?.method || "cash";
    
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const orderCount = await Order.countDocuments({
      createdAt: {
        $gte: new Date(today.setHours(0, 0, 0, 0)),
        $lt: new Date(today.setHours(23, 59, 59, 999))
      }
    });
    const orderNumber = `ORD-${dateStr}-${(orderCount + 1).toString().padStart(3, '0')}`;
    
    const order = new Order({
      orderNumber,
      items: orderData.items.map(item => ({
        name: item.name || "Unknown Item",
        price: item.price || 0,
        quantity: item.quantity || 1,
        size: item.size || "Regular",
        image: item.image || 'default_food.jpg',
        productId: item.id || null
      })),
      subtotal: orderData.subtotal || 0,
      tax: orderData.tax || 0,
      total: orderData.total,
      payment: {
        method: paymentMethod,
        amountPaid: amountPaid,
        change: change,
        status: "completed"
      },
      type: orderData.type,
      status: "completed",
      notes: orderData.notes || ""
    });
    
    const savedOrder = await order.save();
    console.log('Order saved to MongoDB:', savedOrder._id);
    
    // Send real-time notification to admin dashboard
    sendOrderNotification(savedOrder);
    
    // Update product stock
    try {
      for (const item of orderData.items) {
        if (item.id) {
          const product = await Product.findById(item.id);
          if (product && product.stock !== undefined) {
            const newStock = Math.max(0, product.stock - (item.quantity || 1));
            await Product.findByIdAndUpdate(item.id, { stock: newStock });
          }
        }
      }
    } catch (stockError) {
      console.error('Stock update error (non-critical):', stockError);
    }
    
    res.json({ 
      success: true, 
      orderId: savedOrder._id,
      orderNumber: savedOrder.orderNumber,
      message: "Payment and order processed successfully",
      change: change
    });
    
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Failed to save order to database"
    });
  }
});

// Stats API
app.get('/api/stats', async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const ordersToday = await Order.countDocuments({
      createdAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0))
      }
    });
    
    const totalRevenueResult = await Order.aggregate([
      { $group: { _id: null, total: { $sum: "$total" } } }
    ]);
    
    const totalRevenue = totalRevenueResult[0]?.total || 0;
    
    const paymentStats = await Order.aggregate([
      { $group: { _id: "$payment.method", count: { $sum: 1 } } }
    ]);
    
    const paymentStatsObj = {
      cash: 0,
      wallet: 0
    };
    
    paymentStats.forEach(stat => {
      if (stat._id && (stat._id === "cash" || stat._id === "wallet")) {
        paymentStatsObj[stat._id] = stat.count;
      }
    });
    
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    
    res.json({
      totalOrders,
      ordersToday,
      totalRevenue,
      paymentStats: paymentStatsObj,
      recentOrders
    });
  } catch (error) {
    console.error('Stats fetch error:', error);
    res.status(500).json({ 
      error: error.message 
    });
  }
});

// ==================== MENU MANAGEMENT ROUTES ====================

// Get all menu items
app.get("/api/menu", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { category, search, status } = req.query;
    let query = {};

    if (category && category !== 'all') {
      query.category = category;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const items = await MenuItem.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('Get menu items error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Get single menu item
app.get("/api/menu/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ 
        success: false, 
        message: 'Menu item not found' 
      });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Get menu item error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Add new menu item
app.post("/api/menu", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { name, price, category } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide name, price, and category' 
      });
    }

    const existingItem = await MenuItem.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') } 
    });

    if (existingItem) {
      return res.status(400).json({ 
        success: false, 
        message: 'Menu item with this name already exists' 
      });
    }

    const newItem = new MenuItem({
      name,
      price: parseFloat(price),
      category,
      status: 'available'
    });

    await newItem.save();

    res.status(201).json({ 
      success: true, 
      message: 'Menu item added successfully',
      data: newItem
    });
  } catch (error) {
    console.error('Add menu item error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: error.message 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Update menu item
app.put("/api/menu/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { name, price, category, status } = req.body;

    const updatedItem = await MenuItem.findByIdAndUpdate(
      req.params.id,
      { 
        name, 
        price: parseFloat(price), 
        category,
        status,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );

    if (!updatedItem) {
      return res.status(404).json({ 
        success: false, 
        message: 'Menu item not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Menu item updated successfully',
      data: updatedItem
    });
  } catch (error) {
    console.error('Update menu item error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: error.message 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Delete menu item
app.delete("/api/menu/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const deletedItem = await MenuItem.findByIdAndDelete(req.params.id);

    if (!deletedItem) {
      return res.status(404).json({ 
        success: false, 
        message: 'Menu item not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Menu item deleted successfully' 
    });
  } catch (error) {
    console.error('Delete menu item error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Get menu categories
app.get("/api/menu/categories/all", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const categories = [
      'Rice Meals',
      'Sizzling',
      'Drinks',
      'Party Tray',
      'Coffee',
      'Milk Tea',
      'Snacks',
      'Budget Meal',
      'Desserts',
      'Specialities',
      'Frape'
    ];
    
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// ==================== END MENU MANAGEMENT ROUTES ====================

// Get all products (for staff dashboard)
app.get("/api/all-products", async (req, res) => {
  try {
    const products = await Product.find()
      .populate('category', 'name')
      .lean();
    
    const formattedProducts = products.map(product => ({
      id: product._id,
      name: product.name,
      price: product.price,
      category: product.category ? product.category.name : 'Uncategorized',
      stock: product.stock || 0,
      image: product.image || 'default_food.jpg'
    }));
    
    res.json(formattedProducts);
  } catch (error) {
    console.error('Products fetch error:', error);
    res.status(500).json({ 
      error: error.message 
    });
  }
});

// Update product image
app.post('/api/products/:id/image', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { image } = req.body;
    
    const product = await Product.findByIdAndUpdate(
      id,
      { image },
      { new: true }
    );
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json({ success: true, product });
  } catch (error) {
    console.error('Product image update error:', error);
    res.status(500).json({ 
      error: error.message 
    });
  }
});

// ==================== ADMIN DASHBOARD ROUTES ====================

app.get("/admindashboard", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const products = await Product.find({}, "stock").lean();
    const totalStocks = products.reduce((sum, p) => sum + (p.stock || 0), 0);
    const totalOrders = await Order.countDocuments();
    const totalCustomers = await User.countDocuments();
    res.render("admindashboard", { 
      user: req.user, 
      stats: { 
        totalProducts, 
        totalStocks, 
        totalOrders, 
        totalCustomers 
      } 
    });
  } catch (err) {
    console.error("ADMIN DASHBOARD ERROR:", err);
    res.render("admindashboard", { 
      user: req.user, 
      stats: { 
        totalProducts: 0, 
        totalStocks: 0, 
        totalOrders: 0, 
        totalCustomers: 0 
      } 
    });
  }
});

app.get("/admindashboard/dashboard", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const totalProducts = await Product.countDocuments();
    const totalCustomers = await User.countDocuments({ role: "staff" });
    const totalRevenueResult = await Order.aggregate([
      { $group: { _id: null, total: { $sum: "$total" } } }
    ]);
    const totalRevenue = totalRevenueResult[0]?.total || 0;

    res.render("dashboard", { 
      stats: { 
        totalOrders, 
        totalProducts, 
        totalCustomers,
        totalRevenue 
      } 
    });
  } catch (err) {
    console.error("DASHBOARD ERROR:", err);
    res.render("dashboard", { 
      stats: { 
        totalOrders: 0, 
        totalProducts: 0, 
        totalCustomers: 0,
        totalRevenue: 0 
      } 
    });
  }
});

app.get("/admindashboard/inventory", verifyToken, verifyAdmin, (req, res) => {
  res.render("Inventory");
});

app.get("/admindashboard/addstaff", verifyToken, verifyAdmin, (req, res) => {
  res.render("addstaff");
});

app.get("/admindashboard/salesandreports", verifyToken, verifyAdmin, (req, res) => {
  res.render("salesandreports", {
    title: "Sales & Reports"
  });
});

app.get("/admindashboard/infosettings", verifyToken, verifyAdmin, (req, res) => {
  res.render("infosettings");
});

app.get("/admindashboard/orderhistory", verifyToken, verifyAdmin, (req, res) => {
  res.render("orderhistory");
});

app.get("/admindashboard/menumanagement", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const menuItems = await MenuItem.find().sort({ createdAt: -1 }).limit(50);
    
    res.render("menumanagement", {
      user: req.user,
      initialMenuItems: menuItems
    });
  } catch (error) {
    console.error("Menu management load error:", error);
    res.render("menumanagement", {
      user: req.user,
      initialMenuItems: []
    });
  }
});

// Staff dashboard
app.get("/staffdashboard", verifyToken, async (req, res, next) => {
  try {
    if (req.user.role !== "staff") return res.redirect("/admindashboard");

    const products = await Product.find().populate("category", "name").lean();

    const categories = [
      ...new Set(products.map(p => (p.category && p.category.name) ? p.category.name : "Uncategorized"))
    ];

    res.render("staffdashboard", {
      user: req.user,
      products,
      categories
    });
  } catch (err) {
    console.error("STAFF DASHBOARD ERROR:", err);
    next(err);
  }
});

// Logout
app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});

// Print receipt
app.post("/printreceipt", async (req, res, next) => {
  try {
    const { cart, orderType, payment } = req.body;
    if (!cart || !cart.length) return res.status(400).json({ error: "Empty cart" });

    const receiptData = {
      receiptId: Date.now(),
      cart,
      orderType,
      payment,
      subtotal: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      tax: 0,
      total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      date: new Date().toLocaleString()
    };
    
    res.json(receiptData);
  } catch (err) {
    next(err);
  }
});

// ==================== USER MANAGEMENT ROUTES ====================

app.get("/api/users", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const search = req.query.search || "";
    const query = search
      ? { username: { $regex: search, $options: "i" } }
      : {};

    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    console.error("Users fetch error:", error);
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/users/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put("/api/users/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const updateData = { username, role };

    if (password && password.trim() !== "") {
      updateData.password = bcrypt.hashSync(password, 10);
    }

    if (username) {
      const existingUser = await User.findOne({
        username,
        _id: { $ne: req.params.id },
      });
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
    }

    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    }).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      message: "User updated successfully",
      user,
    });
  } catch (error) {
    console.error("User update error:", error);
    res.status(400).json({ message: error.message });
  }
});

app.put("/api/users/:id/status", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { status } = req.body;

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      message: `User ${status === "active" ? "activated" : "deactivated"} successfully`,
      user,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete("/api/users/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: "Cannot delete your own account" });
    }

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("User delete error:", error);
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/users/create", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ message: "Username already exists" });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const newUser = new User({
      username,
      password: hashedPassword,
      role: role || "staff",
      status: "active",
    });

    await newUser.save();

    const userData = newUser.toObject();
    delete userData.password;

    res.status(201).json({
      message: "User created successfully",
      user: userData,
    });
  } catch (error) {
    console.error("User creation error:", error);
    res.status(400).json({ message: error.message });
  }
});

// Orders API for admin
app.get("/api/orders", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    
    res.json(orders);
  } catch (error) {
    console.error("Orders fetch error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== BASIC ERROR HANDLING ====================

// Basic 404 handler
app.use((req, res) => {
  if (req.accepts('html')) {
    res.redirect('/login');
  } else if (req.accepts('json')) {
    res.status(404).json({ error: 'Not found' });
  } else {
    res.status(404).type('txt').send('Not found');
  }
});

// Basic error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  
  if (req.accepts('html')) {
    res.redirect('/login');
  } else if (req.accepts('json')) {
    res.status(500).json({ error: 'Server error' });
  } else {
    res.status(500).type('txt').send('Server error');
  }
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 5050;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
  console.log(`📡 Real-time SSE endpoint: http://localhost:${PORT}/api/admin/events`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please use a different port.`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', error);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});