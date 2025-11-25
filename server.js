const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const xss = require('xss-clean');
const helmet = require('helmet');
const connectDB = require('./config/database');
require('dotenv').config();

const app = express();

// 🔥 الحل: إضافة trust proxy لـ Vercel
app.set('trust proxy', 1);

app.use(helmet());

// إعدادات CORS المحدثة
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));

// 🔥 تحديث rate limit مع keyGenerator مخصص لـ Vercel
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 100, // حد 100 طلب لكل IP
  message: {
    error: 'لقد تجاوزت الحد المسموح به من الطلبات، يرجى المحاولة لاحقاً'
  },
  keyGenerator: (req) => {
    // استخدام X-Forwarded-For header في Vercel
    return req.headers['x-forwarded-for'] || req.ip;
  },
  standardHeaders: true, // إرجاع معلومات rate limit في headers
  legacyHeaders: false, // تعطيل headers القديمة
});

app.use(limiter);
app.use(express.json());
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// Routes
app.use('/api/products', require('./routes/products'));
app.use('/api/shipping', require('./routes/shipping'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/contact', require('./routes/contact'));

app.get('/api/shipping/governorates', (req, res) => {
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
  res.json(governorates);
});

app.get('/api/shipping/shipping-cost/:governorateId', (req, res) => {
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
  
  const governorateId = parseInt(req.params.governorateId);
  const governorate = governorates.find(g => g.id === governorateId);
  
  if (!governorate) {
    return res.status(404).json({ message: 'المحافظة غير موجودة' });
  }
  
  res.json({ 
    shippingCost: governorate.shippingCost,
    governorateName: governorate.name 
  });
});

// Connect to MongoDB
connectDB();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});