const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');

// بيانات المحافظات (نفس البيانات في shipping.js)
const governorates = [
  { id: 1, name: 'القاهرة', shippingCost: 30 },
  { id: 2, name: 'الجيزة', shippingCost: 30 },
  { id: 3, name: 'الإسكندرية', shippingCost: 40 },
  { id: 4, name: 'الدقهلية', shippingCost: 50 },
  { id: 5, name: 'البحر الأحمر', shippingCost: 80 },
  { id: 6, name: 'البحيرة', shippingCost: 45 },
  { id: 7, name: 'الفيوم', shippingCost: 55 },
  { id: 8, name: 'الغربية', shippingCost: 45 },
  { id: 9, name: 'الإسماعيلية', shippingCost: 50 },
  { id: 10, name: 'المنوفية', shippingCost: 40 },
  { id: 11, name: 'المنيا', shippingCost: 60 },
  { id: 12, name: 'القليوبية', shippingCost: 35 },
  { id: 13, name: 'الوادي الجديد', shippingCost: 100 },
  { id: 14, name: 'السويس', shippingCost: 50 },
  { id: 15, name: 'أسوان', shippingCost: 90 },
  { id: 16, name: 'أسيوط', shippingCost: 70 },
  { id: 17, name: 'بني سويف', shippingCost: 55 },
  { id: 18, name: 'بورسعيد', shippingCost: 60 },
  { id: 19, name: 'دمياط', shippingCost: 50 },
  { id: 20, name: 'الشرقية', shippingCost: 45 },
  { id: 21, name: 'جنوب سيناء', shippingCost: 120 },
  { id: 22, name: 'كفر الشيخ', shippingCost: 50 },
  { id: 23, name: 'مطروح', shippingCost: 100 },
  { id: 24, name: 'الأقصر', shippingCost: 85 },
  { id: 25, name: 'قنا', shippingCost: 75 },
  { id: 26, name: 'شمال سيناء', shippingCost: 110 },
  { id: 27, name: 'سوهاج', shippingCost: 65 }
];

// إنشاء طلب جديد
router.post('/', async (req, res) => {
  try {
    const { customerName, customerPhone, customerAddress, governorate, items, notes } = req.body;
    
    // التحقق من البيانات المطلوبة
    if (!customerName || !customerPhone || !customerAddress || !governorate || !items || items.length === 0) {
      return res.status(400).json({ message: 'جميع الحقول المطلوبة يجب ملؤها' });
    }

    // التحقق من صحة رقم الهاتف
    const phoneRegex = /^01[0-2,5]{1}[0-9]{8}$/;
    if (!phoneRegex.test(customerPhone)) {
      return res.status(400).json({ message: 'رقم الهاتف غير صحيح' });
    }

    // التحقق من صحة المحافظة
    const selectedGovernorate = governorates.find(g => g.id === parseInt(governorate));
    if (!selectedGovernorate) {
      return res.status(400).json({ message: 'المحافظة غير صالحة' });
    }

    // حساب المبلغ الإجمالي والتحقق من المخزون
    let subtotal = 0;
    const orderItems = [];
    
    // التحقق من المخزون وتحديثه لكل منتج
    for (let item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ message: `المنتج غير موجود` });
      }

      // التحقق من وجود المقاس المطلوب
      if (!item.selectedSize) {
        return res.status(400).json({ message: `المقاس مطلوب للمنتج ${product.name}` });
      }

      // البحث عن المقاس في المنتج والتحقق من الكمية
      const productSize = product.sizes.find(size => size.size === item.selectedSize);
      if (!productSize) {
        return res.status(400).json({ message: `المقاس ${item.selectedSize} غير متوفر للمنتج ${product.name}` });
      }

      if (productSize.quantity < item.quantity) {
        return res.status(400).json({ 
          message: `لا يوجد مخزون كافي لـ ${product.name} - المقاس ${item.selectedSize}. المتاح: ${productSize.quantity}` 
        });
      }
      
      subtotal += product.price * item.quantity;
      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        selectedSize: item.selectedSize, // حفظ المقاس المختار
        price: product.price
      });

      // تحديث المخزون مباشرة بعد التحقق
      productSize.quantity -= item.quantity;
    }

    // حفظ جميع التحديثات في قاعدة البيانات
    for (let item of items) {
      const product = await Product.findById(item.product);
      const productSize = product.sizes.find(size => size.size === item.selectedSize);
      productSize.quantity -= item.quantity;
      await product.save();
    }
    
    // حساب تكلفة الشحن
    const shippingCost = selectedGovernorate.shippingCost;
    const totalAmount = subtotal + shippingCost;
    
    // إنشاء الطلب
    const order = new Order({
      customerName,
      customerPhone,
      customerAddress,
      governorate,
      items: orderItems,
      subtotal,
      shippingCost,
      totalAmount,
      notes: notes || '',
      status: 'pending'
    });
    
    const savedOrder = await order.save();
    
    // جلب البيانات الكاملة للطلب مع معلومات المنتجات
    const populatedOrder = await Order.findById(savedOrder._id)
      .populate('items.product');
    
    res.status(201).json(populatedOrder);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء إنشاء الطلب' });
  }
});

// الحصول على جميع الطلبات (للوحة الإدارة)
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('items.product')
      .sort({ orderDate: -1 });
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

// الحصول على طلب بواسطة ID
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.product');
    
    if (!order) {
      return res.status(404).json({ message: 'الطلب غير موجود' });
    }
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

// تحديث حالة الطلب
router.patch('/:id', async (req, res) => {
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

module.exports = router;