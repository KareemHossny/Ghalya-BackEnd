const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// الحصول على جميع المنتجات
router.get('/', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// الحصول على المنتجات الأكثر مبيعاً
router.get('/bestsellers', async (req, res) => {
  try {
    const bestsellers = await Product.find({ bestseller: true });
    res.json(bestsellers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// الحصول على منتج محدد
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;