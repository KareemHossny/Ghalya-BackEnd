const express = require('express');
const router = express.Router();
const Message = require('../models/message');
const jwt = require('jsonwebtoken');

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

// إرسال رسالة جديدة (بدون مصادقة)
router.post('/', async (req, res) => {
    try {
      const { name, email, subject, message } = req.body;
      
      console.log('🔵 Received message data:', req.body);
      
      // تحقق إضافي من البيانات
      if (!name || !email || !subject || !message) {
        console.log('🔴 Missing fields:', { name, email, subject, message });
        return res.status(400).json({ 
          success: false, 
          message: 'جميع الحقول مطلوبة' 
        });
      }
  
      // تحقق من القيم الفارغة بعد trim
      if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
        console.log('🔴 Empty fields after trim');
        return res.status(400).json({ 
          success: false, 
          message: 'جميع الحقول مطلوبة ولا يمكن أن تكون فارغة' 
        });
      }
  
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        console.log('🔴 Invalid email:', email);
        return res.status(400).json({ 
          success: false, 
          message: 'البريد الإلكتروني غير صالح' 
        });
      }
  
      // إنشاء رسالة جديدة
      const newMessage = new Message({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        subject: subject.trim(),
        message: message.trim(),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      });
      
      await newMessage.save();
      
      console.log('🟢 Message saved successfully:', newMessage._id);
      
      res.status(201).json({ 
        success: true, 
        message: 'تم استلام رسالتك بنجاح، سنقوم بالرد عليك في أقرب وقت ممكن.',
        messageId: newMessage._id 
      });
      
    } catch (error) {
      console.error('🔴 Error saving message:', error);
      
      // تحقق من أخطاء MongoDB
      if (error.name === 'ValidationError') {
        return res.status(400).json({ 
          success: false, 
          message: 'بيانات غير صالحة' 
        });
      }
      
      res.status(500).json({ 
        success: false, 
        message: 'حدث خطأ في إرسال الرسالة، يرجى المحاولة مرة أخرى.' 
      });
    }
});

// الحصول على جميع الرسائل مع التصفية والترقيم
router.get('/', verifyToken, async (req, res) => {
    try {
      const { page = 1, limit = 10, status } = req.query;
      
      console.log('طلب رسائل:', { page, limit, status });
      
      const query = {};
      if (status && status !== 'all') {
        query.status = status;
      }
      
      const messages = await Message.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));
      
      const total = await Message.countDocuments(query);
      
      console.log(`تم جلب ${messages.length} رسالة من إجمالي ${total}`);
      
      res.json({
        success: true,
        messages,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total
      });
    } catch (error) {
      console.error('خطأ في جلب الرسائل:', error);
      res.status(500).json({ 
        success: false,
        message: error.message 
      });
    }
});

// الحصول على رسالة محددة
router.get('/:id', verifyToken, async (req, res) => {
    try {
      const message = await Message.findById(req.params.id);
      
      if (!message) {
        return res.status(404).json({ 
          success: false,
          message: 'الرسالة غير موجودة' 
        });
      }
      
      // تحديث الحالة إلى مقروء إذا كانت جديدة
      if (message.status === 'new') {
        message.status = 'read';
        await message.save();
      }
      
      res.json({
        success: true,
        message: message
      });
    } catch (error) {
      console.error('خطأ في جلب الرسالة:', error);
      res.status(500).json({ 
        success: false,
        message: error.message 
      });
    }
});

// تحديث حالة الرسالة
router.patch('/:id', verifyToken, async (req, res) => {
    try {
      const { status } = req.body;
      
      // إزالة 'replied' من الحالات المسموحة
      if (!['new', 'read'].includes(status)) {
        return res.status(400).json({ 
          success: false,
          message: 'حالة غير صالحة' 
        });
      }
      
      const message = await Message.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      );
      
      if (!message) {
        return res.status(404).json({ 
          success: false,
          message: 'الرسالة غير موجودة' 
        });
      }
      
      res.json({
        success: true,
        message: message
      });
    } catch (error) {
      console.error('خطأ في تحديث الرسالة:', error);
      res.status(400).json({ 
        success: false,
        message: error.message 
      });
    }
});

// حذف رسالة
router.delete('/:id', verifyToken, async (req, res) => {
    try {
      const message = await Message.findByIdAndDelete(req.params.id);
      
      if (!message) {
        return res.status(404).json({ 
          success: false,
          message: 'الرسالة غير موجودة' 
        });
      }
      
      res.json({ 
        success: true,
        message: 'تم حذف الرسالة بنجاح' 
      });
    } catch (error) {
      console.error('خطأ في حذف الرسالة:', error);
      res.status(500).json({ 
        success: false,
        message: error.message 
      });
    }
});

// إحصائيات الرسائل
router.get('/stats/messages', verifyToken, async (req, res) => {
    try {
      const totalMessages = await Message.countDocuments();
      const newMessages = await Message.countDocuments({ status: 'new' });
      const readMessages = await Message.countDocuments({ status: 'read' });
      
      // الرسائل في آخر 7 أيام
      const last7Days = new Date();
      last7Days.setDate(last7Days.getDate() - 7);
      
      const recentMessages = await Message.countDocuments({
        createdAt: { $gte: last7Days }
      });
      
      res.json({
        success: true,
        stats: {
          totalMessages,
          newMessages,
          readMessages,
          recentMessages
        }
      });
    } catch (error) {
      console.error('خطأ في إحصائيات الرسائل:', error);
      res.status(500).json({ 
        success: false,
        message: error.message 
      });
    }
});

module.exports = router;