const mongoose = require('mongoose');

const QuotationItemSchema = new mongoose.Schema({
  materialType: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0.01
  },
  unit: {
    type: String,
    default: 'kg'
  },
  unitRate: {
    type: Number,
    required: true,
    min: 0
  },
  discountPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  taxRate: {
    type: Number,
    default: 18
  },
  totalAmount: {
    type: Number,
    required: true
  }
}, { _id: false });

const VendorQuotationSchema = new mongoose.Schema({
  quotationNumber: {
    type: String,
    required: [true, 'Please provide quotation reference number'],
    trim: true
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  vendorName: {
    type: String,
    trim: true
  },
  vendorCode: {
    type: String,
    trim: true
  },
  quotationDate: {
    type: Date,
    default: Date.now
  },
  validUntil: {
    type: Date
  },
  items: [QuotationItemSchema],
  subTotal: {
    type: Number,
    default: 0
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  taxAmount: {
    type: Number,
    default: 0
  },
  grandTotal: {
    type: Number,
    default: 0
  },
  paymentTerms: {
    type: String,
    default: '30 Days Net'
  },
  deliveryLeadTime: {
    type: String,
    default: '7 Days'
  },
  status: {
    type: String,
    enum: ['draft', 'pending_approval', 'approved', 'rejected', 'converted_to_po'],
    default: 'pending_approval'
  },
  poId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder'
  },
  poNumber: {
    type: String,
    trim: true
  },
  quotationFileUrl: {
    type: String,
    trim: true
  },
  remarks: {
    type: String,
    trim: true
  },
  createdByUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

VendorQuotationSchema.index({ quotationNumber: 1 });
VendorQuotationSchema.index({ vendorId: 1 });
VendorQuotationSchema.index({ status: 1 });

const tenantPlugin = require('../utils/tenantPlugin');
VendorQuotationSchema.plugin(tenantPlugin);

module.exports = mongoose.model('VendorQuotation', VendorQuotationSchema);
