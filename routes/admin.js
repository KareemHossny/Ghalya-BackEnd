const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const Product = require('../models/Product');
const Order = require('../models/Order');
const Message = require('../models/message');
const upload = require('../config/upload');
const path = require('path');
const fs = require('fs');

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
    console.log('📦 طلب إضافة منتج جديد');
    console.log('📁 الملف:', req.file);
    console.log('📋 البيانات:', req.body);

    // التحقق من وجود صورة
    if (!req.file) {
      return res.status(400).json({ message: 'الصورة مطلوبة' });
    }

    // التحقق من البيانات المطلوبة
    const { name, description, price, stock, bestseller } = req.body;
    
    if (!name || !price || !stock) {
      // حذف الصورة المرفوعة إذا كانت البيانات ناقصة
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ message: 'جميع الحقول المطلوبة يجب ملؤها' });
    }

    const productData = {
      name,
      description: description || '',
      price: parseFloat(price),
      stock: parseInt(stock),
      bestseller: bestseller === 'true' || bestseller === true,
      image: `/uploads/products/${req.file.filename}` // حفظ مسار الصورة
    };

    const product = new Product(productData);
    const savedProduct = await product.save();
    
    console.log('✅ تم إضافة المنتج بنجاح:', savedProduct._id);
    res.status(201).json(savedProduct);
  } catch (error) {
    // حذف الصورة المرفوعة إذا حدث خطأ
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    console.error('❌ خطأ في إضافة المنتج:', error);
    res.status(400).json({ message: error.message });
  }
});

// تحديث منتج مع إمكانية تحديث الصورة
router.put('/products/:id', verifyToken, upload.single('image'), async (req, res) => {
  try {
    console.log('📦 طلب تحديث منتج:', req.params.id);
    console.log('📁 الملف:', req.file);
    console.log('📋 البيانات:', req.body);

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'المنتج غير موجود' });
    }

    let updateData = { ...req.body };
    
    // إذا تم رفع صورة جديدة، تحديث المسار وحذف الصورة القديمة
    if (req.file) {
      // حذف الصورة القديمة إذا كانت موجودة
      if (product.image && product.image.startsWith('/uploads/products/')) {
        const oldImagePath = path.join(__dirname, '..', product.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      updateData.image = `/uploads/products/${req.file.filename}`;
    }

    // تحويل أنواع البيانات
    if (updateData.price) updateData.price = parseFloat(updateData.price);
    if (updateData.stock) updateData.stock = parseInt(updateData.stock);
    if (updateData.bestseller) {
      updateData.bestseller = updateData.bestseller === 'true' || updateData.bestseller === true;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    console.log('✅ تم تحديث المنتج بنجاح');
    res.json(updatedProduct);
  } catch (error) {
    // حذف الصورة المرفوعة إذا حدث خطأ
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    console.error('❌ خطأ في تحديث المنتج:', error);
    res.status(400).json({ message: error.message });
  }
});

// حذف منتج
router.delete('/products/:id', verifyToken, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'المنتج غير موجود' });
    }

    // حذف الصورة المرتبطة بالمنتج
    if (product.image && product.image.startsWith('/uploads/products/')) {
      const imagePath = path.join(__dirname, '..', product.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Product.findByIdAndDelete(req.params.id);
    
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