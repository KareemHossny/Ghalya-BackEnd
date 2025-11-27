const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: true
  },
  customerPhone: {
    type: String,
    required: true
  },
  customerAddress: {
    type: String,
    required: true
  },
  governorate: {
    type: String,
    required: true
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    selectedSize: { // إضافة حقل المقاس المختار
      type: String,
      required: true,
      enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']
    }
  }],
  subtotal: {
    type: Number,
    required: true
  },
  shippingCost: {
    type: Number,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'shipped', 'delivered'],
    default: 'pending'
  },
  orderDate: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    default: ''
  }
});

module.exports = mongoose.model('Order', orderSchema);