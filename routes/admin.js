const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const Product = require('../models/Product');
const Order = require('../models/Order');
const Message = require('../models/message');
const upload = require('../config/upload');

// Middleware للتحقق من التوكن
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'مطلوب توكن مصادقة' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'انتهت صلاحية التوكن' });
    }
    res.status(401).json({ message: 'توكن غير صالح' });
  }
};

// تسجيل الدخول وإنشاء التوكن
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (username === adminUsername && password === adminPassword) {
    // إنشاء JWT token
    const token = jwt.sign(
      { 
        username: username, 
        role: 'admin' 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' } // صلاحية التوكن 24 ساعة
    );

    res.json({ 
      success: true, 
      message: 'تم تسجيل الدخول بنجاح',
      token: token,
      user: {
        username: username,
        role: 'admin'
      }
    });
  } else {
    res.status(401).json({ 
      success: false, 
      message: 'بيانات الدخول غير صحيحة' 
    });
  }
});

// الحصول على جميع المنتجات
router.get('/products', verifyToken, async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// إضافة منتج جديد مع رفع صورة
router.post('/products', verifyToken, upload.single('image'), async (req, res) => {
  try {
    // التحقق من وجود صورة
    if (!req.file) {
      return res.status(400).json({ message: 'الصورة مطلوبة' });
    }

    const productData = {
      ...req.body,
      image: `/uploads/products/${req.file.filename}` // حفظ مسار الصورة
    };

    const product = new Product(productData);
    const savedProduct = await product.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});


// تحديث منتج مع إمكانية تحديث الصورة
router.put('/products/:id', verifyToken, upload.single('image'), async (req, res) => {
  try {
    let updateData = { ...req.body };
    
    // إذا تم رفع صورة جديدة، تحديث المسار
    if (req.file) {
      updateData.image = `/uploads/products/${req.file.filename}`;
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!product) {
      return res.status(404).json({ message: 'المنتج غير موجود' });
    }
    
    res.json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// حذف منتج
router.delete('/products/:id', verifyToken, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'المنتج غير موجود' });
    }
    
    res.json({ message: 'تم حذف المنتج بنجاح' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// الحصول على جميع الطلبات
router.get('/orders', verifyToken, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('items.product')
      .sort({ orderDate: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// تحديث حالة الطلب
router.patch('/orders/:id', verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['pending', 'shipped', 'delivered'].includes(status)) {
      return res.status(400).json({ message: 'حالة غير صالحة' });
    }
    
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('items.product');
    
    if (!order) {
      return res.status(404).json({ message: 'الطلب غير موجود' });
    }
    
    res.json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// إحصائيات
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    
    const totalRevenueResult = await Order.aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    res.json({
      totalProducts,
      totalOrders,
      pendingOrders,
      totalRevenue: totalRevenueResult[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;