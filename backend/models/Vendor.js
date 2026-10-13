const mongoose = require('mongoose');

const VendorSchema = new mongoose.Schema({
  vendorCode: {
    type: String,
    trim: true
  },
  vendorName: {
    type: String,
    required: [true, 'Please provide vendor name'],
    trim: true
  },
  contactPerson: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  address: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  state: {
    type: String,
    trim: true
  },
  pincode: {
    type: String,
    trim: true
  },
  gstNumber: {
    type: String,
    trim: true,
    uppercase: true
  },
  panNumber: {
    type: String,
    trim: true,
    uppercase: true
  },
  materialSupplied: {
    type: String,
    default: 'Nylon Granules'
  },
  paymentTerms: {
    type: String,
    default: '30 Days Net'
  },
  rating: {
    type: Number,
    default: 5,
    min: 1,
    max: 5
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'blacklisted'],
    default: 'active'
  },
  bankDetails: {
    bankName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    ifscCode: { type: String, trim: true, uppercase: true },
    branch: { type: String, trim: true }
  },
  notes: {
    type: String,
    trim: true
  }
}, { timestamps: true });

VendorSchema.index({ vendorCode: 1 });
VendorSchema.index({ vendorName: 1 });
VendorSchema.index({ gstNumber: 1 });

const tenantPlugin = require('../utils/tenantPlugin');
VendorSchema.plugin(tenantPlugin);

module.exports = mongoose.model('Vendor', VendorSchema);
