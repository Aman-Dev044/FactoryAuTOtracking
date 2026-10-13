const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  clientName: {
    type: String,
    required: true
  },
  modelNumber: {
    type: String,
    required: true
  },
  orderQuantity: {
    type: Number, // in Meters
    required: true
  },
  deliveryDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'shortage', 'ready', 'dispatched'],
    default: 'pending'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pdfUrl: {
    type: String
  }
}, {
  timestamps: true
});

OrderSchema.index({ status: 1 });
OrderSchema.index({ modelNumber: 1 });

const tenantPlugin = require('../utils/tenantPlugin');
OrderSchema.plugin(tenantPlugin);

module.exports = mongoose.model('Order', OrderSchema);
