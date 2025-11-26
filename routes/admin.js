const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const Product = require('../models/Product');
const Order = require('../models/Order');
const Message = require('../models/message');
const cloudinary = require('../config/cloudinary');

// زيادة حجم الـ payload لهذا المسار تحديداً
router.use(express.json({ limit: '10mb' }));
router.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

// دالة لرفع الصور إلى Cloudinary
const uploadToCloudinary = async (imageBase64) => {
  try {
    console.log('☁️ بدء رفع الصورة لـ Cloudinary...');
    
    const result = await cloudinary.uploader.upload(imageBase64, {
      folder: 'ghalya/products',
      quality: 'auto:good',
      fetch_format: 'auto',
      width: 800,
      height: 800,
      crop: 'limit'
    });

    console.log('✅ تم رفع الصورة بنجاح، الحجم:', result.bytes, 'bytes');
    return result.secure_url;
  } catch (error) {
    console.error('❌ خطأ في رفع الصورة لـ Cloudinary:', error);
    throw new Error('فشل في رفع الصورة: ' + error.message);
  }
};

// تسجيل الدخول وإنشاء التوكن
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (username === adminUsername && password === adminPassword) {
    const token = jwt.sign(
      { 
        username: username, 
        role: 'admin' 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
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

// إضافة منتج جديد مع Cloudinary
router.post('/products', verifyToken, async (req, res) => {
  try {
    console.log('📦 طلب إضافة منتج جديد');
    console.log('📊 حجم البيانات المستلمة:', JSON.stringify(req.body).length, 'bytes');

    const { name, description, price, sizes, bestseller, imageBase64 } = req.body;
    
    // التحقق من البيانات المطلوبة
    if (!name || !price || !sizes) {
      return res.status(400).json({ message: 'جميع الحقول المطلوبة يجب ملؤها' });
    }

    // التحقق من وجود صورة
    if (!imageBase64) {
      return res.status(400).json({ message: 'الصورة مطلوبة' });
    }

    let imageUrl;

    // إذا كانت صورة Base64 جديدة، ارفعها لـ Cloudinary
    if (imageBase64.startsWith('data:image/')) {
      try {
        imageUrl = await uploadToCloudinary(imageBase64);
      } catch (uploadError) {
        console.error('❌ فشل في رفع الصورة:', uploadError);
        return res.status(400).json({ 
          message: 'فشل في رفع الصورة: ' + uploadError.message 
        });
      }
    } else {
      imageUrl = imageBase64; // إذا كانت رابطاً موجوداً
    }

    const productData = {
      name,
      description: description || '',
      price: parseFloat(price),
      sizes: Array.isArray(sizes) ? sizes : JSON.parse(sizes),
      bestseller: bestseller === 'true' || bestseller === true,
      image: imageUrl
    };

    const product = new Product(productData);
    const savedProduct = await product.save();
    
    console.log('✅ تم إضافة المنتج بنجاح:', savedProduct._id);
    res.status(201).json(savedProduct);
  } catch (error) {
    console.error('❌ خطأ في إضافة المنتج:', error);
    
    let errorMessage = error.message;
    if (error.message.includes('Cloudinary') || error.message.includes('رفع الصورة')) {
      errorMessage = 'فشل في رفع الصورة. يرجى المحاولة مرة أخرى';
    } else if (error.name === 'PayloadTooLargeError') {
      errorMessage = 'حجم الصورة كبير جداً. يرجى اختيار صورة أصغر';
    }
    
    res.status(400).json({ message: errorMessage });
  }
});

// تحديث منتج مع Cloudinary
router.put('/products/:id', verifyToken, async (req, res) => {
  try {
    console.log('📦 طلب تحديث منتج:', req.params.id);

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'المنتج غير موجود' });
    }

    const { name, description, price, sizes, bestseller, imageBase64 } = req.body;

    let updateData = {
      name,
      description: description || '',
      price: parseFloat(price),
      sizes: Array.isArray(sizes) ? sizes : JSON.parse(sizes),
      bestseller: bestseller === 'true' || bestseller === true
    };

    // إذا كانت هناك صورة جديدة Base64، ارفعها لـ Cloudinary
    if (imageBase64 && imageBase64.startsWith('data:image/')) {
      try {
        const imageUrl = await uploadToCloudinary(imageBase64);
        updateData.image = imageUrl;
        console.log('✅ تم تحديث الصورة بنجاح');
      } catch (uploadError) {
        console.error('❌ فشل في تحديث الصورة:', uploadError);
        return res.status(400).json({ 
          message: 'فشل في تحديث الصورة: ' + uploadError.message 
        });
      }
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

// حذف منتج مع حذف الصورة من Cloudinary
router.delete('/products/:id', verifyToken, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'المنتج غير موجود' });
    }

    // إذا كانت الصورة مخزنة في Cloudinary، احذفها
    if (product.image && product.image.includes('cloudinary.com')) {
      try {
        // استخراج public_id من الرابط
        const urlParts = product.image.split('/');
        const publicId = urlParts[urlParts.length - 1].split('.')[0];
        const fullPublicId = `ghalya/products/${publicId}`;
        
        await cloudinary.uploader.destroy(fullPublicId);
        console.log('🗑️ تم حذف الصورة من Cloudinary');
      } catch (cloudinaryError) {
        console.error('⚠️ خطأ في حذف الصورة من Cloudinary:', cloudinaryError);
        // استمر في حذف المنتج حتى لو فشل حذف الصورة
      }
    }

    await Product.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'تم حذف المنتج بنجاح' });
  } catch (error) {
    console.error('❌ خطأ في حذف المنتج:', error);
    res.status(500).json({ message: error.message });
  }
});

// الباقي من الكود يبقى كما هو...
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