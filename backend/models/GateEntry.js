const mongoose = require('mongoose');
const tenantPlugin = require('../utils/tenantPlugin');

const GateEntrySchema = new mongoose.Schema({
  // Bill Information
  billNumber: {
    type: String,
    trim: true
  },
  billDate: {
    type: Date,
    default: Date.now
  },

  // Purchase Order Linkage (PO-based Gate Entry Approval)
  poId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder'
  },
  poNumber: {
    type: String,
    trim: true
  },
  poOrderedQuantity: {
    type: Number,
    default: 0
  },
  isPoCompliant: {
    type: Boolean,
    default: true
  },
  poVarianceRemarks: {
    type: String,
    trim: true
  },

  // Vendor / Supplier
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor'
  },
  vendorCode: {
    type: String,
    trim: true
  },
  vendorName: {
    type: String,
    trim: true
  },
  vendorContact: {
    type: String,
    trim: true
  },

  // Material Details
  materialType: {
    type: String,
    trim: true,
    default: 'nylon'
  },
  materialDescription: {
    type: String,
    trim: true
  },
  quantity: {
    type: Number
  },
  unit: {
    type: String,
    default: 'kg'
  },

  // Vehicle & Driver Information
  vehicleNumber: {
    type: String,
    trim: true
  },
  driverName: {
    type: String,
    trim: true
  },
  driverPhone: {
    type: String,
    trim: true
  },
  invoiceUrl: {
    type: String,
    default: ''
  },
  // Photos & Documents for Outward Finished Goods
  materialPhotoUrl: {
    type: String,
    default: ''
  },
  thirdBillPhotoUrl: {
    type: String,
    default: ''
  },
  // Accounts notification
  accountsEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  accountsEmailSentAt: {
    type: Date
  },
  dispatchRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dispatch'
  },
  // Entry Type & Timings
  entryType: {
    type: String,
    enum: ['inward', 'outward'],
    default: 'inward'
  },
  entryTiming: {
    type: String,
    trim: true,
    default: ''
  },
  exitTiming: {
    type: String,
    trim: true,
    default: ''
  },

  status: {
    type: String,
    enum: ['pending', 'verified', 'grn_created'],
    default: 'pending'
  },
  
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  
  grnNumber: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  
  remarks: {
    type: String,
    trim: true,
    default: ''
  },
  
  loggedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  strict: false
});

GateEntrySchema.pre('save', async function() {
  if (this.isModified('status') && this.status === 'grn_created' && !this.grnNumber) {
    const count = await mongoose.model('GateEntry').countDocuments({ grnNumber: { $exists: true, $ne: null } });
    this.grnNumber = `GRN-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
  }
});

// Indexes
// GateEntrySchema.index({ billNumber: 1 });
GateEntrySchema.index({ status: 1 });
GateEntrySchema.index({ createdAt: -1 });
GateEntrySchema.index({ vendorName: 1 });

// Apply tenant plugin
GateEntrySchema.plugin(tenantPlugin);

module.exports = mongoose.model('GateEntry', GateEntrySchema);
