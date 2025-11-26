const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const connectDB = require('./config/database');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const helmet = require('helmet');
const path = require('path');

require('dotenv').config();

const app = express();
app.use(helmet());

const corsOptions = {
  origin: [
    'http://localhost:3000', 
    'http://localhost:3001', 
    'https://ghalya.vercel.app',
    'https://ghalya-admin.vercel.app'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));

// زيادة حجم الـ payload المسموح به
app.use(express.json({ limit: '10mb' })); // زيادة من 1MB إلى 10MB
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(mongoSanitize());
app.use(hpp());

// خدمة الملفات الثابتة من مجلد uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.json({ message: 'API Ghalya is working!' });
});

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

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;