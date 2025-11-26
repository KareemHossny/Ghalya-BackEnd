const mongoose = require('mongoose');

const sizeSchema = new mongoose.Schema({
  size: {
    type: String,
    required: true,
    enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  }
});

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  sizes: [sizeSchema],
  bestseller: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// دالة مساعدة للحصول على إجمالي الكمية
productSchema.virtual('totalStock').get(function() {
  return this.sizes.reduce((total, size) => total + size.quantity, 0);
});

// للتأكد من أن الحقول الافتراضية تعمل مع JSON
productSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);