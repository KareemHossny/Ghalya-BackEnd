const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const Product = require('../models/Product');
const Order = require('../models/Order');
const Message = require('../models/message');

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

// إضافة منتج جديد مع صورة Base64
router.post('/products', verifyToken, async (req, res) => {
  try {
    console.log('📦 طلب إضافة منتج جديد');

    const { name, description, price, stock, bestseller, imageBase64 } = req.body;
    
    // التحقق من البيانات المطلوبة
    if (!name || !price || !stock) {
      return res.status(400).json({ message: 'جميع الحقول المطلوبة يجب ملؤها' });
    }

    // التحقق من وجود صورة
    if (!imageBase64) {
      return res.status(400).json({ message: 'الصورة مطلوبة' });
    }

    // التحقق من صيغة Base64
    if (!imageBase64.startsWith('data:image/')) {
      return res.status(400).json({ message: 'صيغة الصورة غير صالحة' });
    }

    // زيادة الحد المسموح للهواتف (5MB بدلاً من 3MB)
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const fileSizeInMB = buffer.length / (1024 * 1024);
    
    console.log(`📊 حجم الصورة المستلمة: ${fileSizeInMB.toFixed(2)}MB`);
    
    if (fileSizeInMB > 5) {
      return res.status(400).json({ 
        message: `حجم الصورة كبير جداً (${fileSizeInMB.toFixed(2)}MB). يجب أن يكون أقل من 5MB` 
      });
    }

    const productData = {
      name,
      description: description || '',
      price: parseFloat(price),
      stock: parseInt(stock),
      bestseller: bestseller === 'true' || bestseller === true,
      image: imageBase64
    };

    const product = new Product(productData);
    const savedProduct = await product.save();
    
    console.log('✅ تم إضافة المنتج بنجاح:', savedProduct._id);
    res.status(201).json(savedProduct);
  } catch (error) {
    console.error('❌ خطأ في إضافة المنتج:', error);
    
    // رسالة خطأ أكثر وضوحاً
    let errorMessage = error.message;
    if (error.name === 'PayloadTooLargeError') {
      errorMessage = 'حجم البيانات كبير جداً. يرجى اختيار صورة أصغر';
    } else if (error.code === 'BSONError') {
      errorMessage = 'حجم الصورة كبير جداً. يرجى اختيار صورة أصغر';
    } else if (error.message.includes('buffering timed out')) {
      errorMessage = 'انتهت مهلة تحميل الصورة. يرجى اختيار صورة أصغر';
    }
    
    res.status(400).json({ message: errorMessage });
  }
});

// تحديث منتج مع إمكانية تحديث الصورة
router.put('/products/:id', verifyToken, async (req, res) => {
  try {
    console.log('📦 طلب تحديث منتج:', req.params.id);

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'المنتج غير موجود' });
    }

    const { name, description, price, stock, bestseller, imageBase64 } = req.body;

    let updateData = {
      name,
      description: description || '',
      price: parseFloat(price),
      stock: parseInt(stock),
      bestseller: bestseller === 'true' || bestseller === true
    };

    // إذا كانت هناك صورة جديدة Base64، قم بتحديثها
    if (imageBase64 && imageBase64.startsWith('data:image/')) {
      // التحقق من حجم الصورة الجديدة
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const fileSizeInMB = buffer.length / (1024 * 1024);
      
      if (fileSizeInMB > 5) {
        return res.status(400).json({ message: 'حجم الصورة يجب أن يكون أقل من 5MB' });
      }

      updateData.image = imageBase64;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    console.log('✅ تم تحديث المنتج بنجاح');
    res.json(updatedProduct);
  } catch (error) {
    console.error('❌ خطأ في تحديث المنتج:', error);
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