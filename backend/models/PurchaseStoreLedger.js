const mongoose = require('mongoose');

const PurchaseStoreLedgerSchema = new mongoose.Schema({
  entryType: {
    type: String,
    enum: ['IN', 'OUT'],
    required: true
  },
  materialId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Material'
  },
  materialName: {
    type: String,
    required: [true, 'Material name is required'],
    trim: true
  },
  materialType: {
    type: String,
    default: 'nylon',
    trim: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: 0.01
  },
  unit: {
    type: String,
    default: 'kg',
    trim: true
  },
  storeLocation: {
    type: String,
    default: 'Purchase Store - Main Bay',
    trim: true
  },
  rackBin: {
    type: String,
    trim: true
  },
  referenceType: {
    type: String,
    enum: ['PO_INWARD', 'GATE_ENTRY', 'DIRECT_PURCHASE_INWARD', 'PRODUCTION_ISSUE', 'RETURN_TO_VENDOR', 'STOCK_ADJUSTMENT'],
    default: 'DIRECT_PURCHASE_INWARD'
  },
  referenceNumber: {
    type: String,
    trim: true
  },
  // IN Entry Specifics
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor'
  },
  vendorName: {
    type: String,
    trim: true
  },
  vendorCode: {
    type: String,
    trim: true
  },
  poId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder'
  },
  poNumber: {
    type: String,
    trim: true
  },
  gateEntryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GateEntry'
  },
  billNumber: {
    type: String,
    trim: true
  },
  // OUT Entry Specifics
  destinationDepartment: {
    type: String,
    trim: true
  },
  machineNumber: {
    type: String,
    trim: true
  },
  issuedToPerson: {
    type: String,
    trim: true
  },
  issueSlipNumber: {
    type: String,
    trim: true
  },
  // Running Balance Calculation
  balanceAfter: {
    type: Number,
    required: true,
    default: 0
  },
  remarks: {
    type: String,
    trim: true
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  performedByName: {
    type: String,
    trim: true
  },
  transactionDate: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

PurchaseStoreLedgerSchema.index({ entryType: 1 });
PurchaseStoreLedgerSchema.index({ materialName: 1 });
PurchaseStoreLedgerSchema.index({ poNumber: 1 });
PurchaseStoreLedgerSchema.index({ createdAt: -1 });

const tenantPlugin = require('../utils/tenantPlugin');
PurchaseStoreLedgerSchema.plugin(tenantPlugin);

module.exports = mongoose.model('PurchaseStoreLedger', PurchaseStoreLedgerSchema);
