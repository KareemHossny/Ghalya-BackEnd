const express = require('express');
const router = express.Router();

// بيانات المحافظات ومصاريف الشحن
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

// الحصول على جميع المحافظات
router.get('/governorates', (req, res) => {
  try {
    res.json(governorates);
  } catch (error) {
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

// الحصول على تكلفة الشحن لمحافظة معينة
router.get('/shipping-cost/:governorateId', (req, res) => {
  try {
    const governorateId = parseInt(req.params.governorateId);
    
    if (isNaN(governorateId)) {
      return res.status(400).json({ message: 'معرف المحافظة غير صالح' });
    }
    
    const governorate = governorates.find(g => g.id === governorateId);
    
    if (!governorate) {
      return res.status(404).json({ message: 'المحافظة غير موجودة' });
    }
    
    res.json({ 
      shippingCost: governorate.shippingCost,
      governorateName: governorate.name 
    });
  } catch (error) {
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

// الحصول على معلومات محافظة معينة
router.get('/governorate/:governorateId', (req, res) => {
  try {
    const governorateId = parseInt(req.params.governorateId);
    
    if (isNaN(governorateId)) {
      return res.status(400).json({ message: 'معرف المحافظة غير صالح' });
    }
    
    const governorate = governorates.find(g => g.id === governorateId);
    
    if (!governorate) {
      return res.status(404).json({ message: 'المحافظة غير موجودة' });
    }
    
    res.json(governorate);
  } catch (error) {
    res.status(500).json({ message: 'حدث خطأ في الخادم' });
  }
});

module.exports = router;