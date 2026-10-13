const mongoose = require('mongoose');

const POItemSchema = new mongoose.Schema({
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
  rate: {
    type: Number,
    required: true,
    min: 0
  },
  discountPercent: {
    type: Number,
    default: 0
  },
  amount: {
    type: Number,
    required: true
  },
  gstRate: {
    type: Number,
    default: 18
  },
  receivedQuantity: {
    type: Number,
    default: 0
  }
}, { _id: false });

const PurchaseOrderSchema = new mongoose.Schema({
  poNumber: {
    type: String,
    required: true,
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
  vendorAddress: {
    type: String,
    trim: true
  },
  vendorGst: {
    type: String,
    trim: true
  },
  quotationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VendorQuotation'
  },
  quotationNumber: {
    type: String,
    trim: true
  },
  orderDate: {
    type: Date,
    default: Date.now
  },
  expectedDeliveryDate: {
    type: Date
  },
  items: [POItemSchema],
  subTotal: {
    type: Number,
    required: true,
    default: 0
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  gstAmount: {
    type: Number,
    required: true,
    default: 0
  },
  grandTotal: {
    type: Number,
    required: true,
    default: 0
  },
  paymentTerms: {
    type: String,
    default: '30 Days Net'
  },
  deliveryTerms: {
    type: String,
    default: 'Door Delivery Factory Gate'
  },
  status: {
    type: String,
    enum: ['draft', 'issued', 'partially_received', 'received', 'cancelled'],
    default: 'issued'
  },
  // Inward Gate entries received against this PO
  inwardGateEntries: [{
    gateEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'GateEntry' },
    gateEntryNumber: String,
    billNumber: String,
    receivedDate: { type: Date, default: Date.now },
    receivedQty: Number,
    vehicleNumber: String,
    verifiedBy: String
  }],
  totalReceivedQty: {
    type: Number,
    default: 0
  },
  pdfUrl: {
    type: String
  },
  notes: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdByName: {
    type: String,
    trim: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

PurchaseOrderSchema.index({ poNumber: 1 });
PurchaseOrderSchema.index({ vendorId: 1 });
PurchaseOrderSchema.index({ status: 1 });
PurchaseOrderSchema.index({ orderDate: -1 });

const tenantPlugin = require('../utils/tenantPlugin');
PurchaseOrderSchema.plugin(tenantPlugin);

module.exports = mongoose.model('PurchaseOrder', PurchaseOrderSchema);
