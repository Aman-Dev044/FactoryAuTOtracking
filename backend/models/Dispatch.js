const mongoose = require('mongoose');

const DispatchSchema = new mongoose.Schema({
  // Reference to Sales Order / PI
  salesOrderRef: { type: String, trim: true },
  customerName: { type: String, required: true, trim: true },
  customerContact: { type: String, trim: true },
  customerEmail: { type: String, trim: true, lowercase: true },
  notifyCustomerEmail: { type: Boolean, default: true },
  customerAddress: { type: String, trim: true },
  billingAddress: { type: String, trim: true },
  shippingAddress: { type: String, trim: true },
  isSameAsBilling: { type: Boolean, default: true },
  customerGST: { type: String, trim: true },

  // Items being dispatched
  items: [{
    modelNumber: { type: String, trim: true },
    description: { type: String, trim: true },
    quantity: { type: Number, default: 1 },
    unit: { type: String, default: 'pcs' }
  }],

  // Dispatch status pipeline
  status: {
    type: String,
    enum: ['assemble', 'hold', 'packing', 'dispatched'],
    default: 'assemble'
  },

  // 1. Assembly Stage Details & Proof
  assemblyMediaUrl: { type: String, trim: true },      // Photo / Video of assembled product
  assemblyNotes: { type: String, trim: true },
  assembledAt: { type: Date },
  assembledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // 2. Packing Stage Details & Proof
  packingDetails: { type: String, trim: true },
  packingMediaUrl: { type: String, trim: true },       // Photo / Video of packed boxes / wrapping
  packingNotes: { type: String, trim: true },
  totalBoxes: { type: Number, default: 0 },
  totalWeight: { type: String, trim: true },
  packedAt: { type: Date },
  packedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // 3. Dispatch & Logistics Details & Proof
  dispatchMediaUrl: { type: String, trim: true },      // Photo / Video of loading / vehicle dispatch
  courier: { type: String, trim: true },              // e.g. DTDC, BlueDart, SafeExpress
  trackingNumber: { type: String, trim: true },       // AWB No.
  lrNumber: { type: String, trim: true },            // Lorry Receipt Number
  lrCopyUrl: { type: String, trim: true },           // Uploaded LR copy PDF / Image

  // 4. Billing & Invoice Attachments
  billingInvoiceUrl: { type: String, trim: true },   // Uploaded Tax Invoice / Bill PDF / Image
  invoiceNumber: { type: String, trim: true },
  invoiceAmount: { type: Number, default: 0 },
  invoiceDate: { type: Date },

  // POD — Proof of Delivery
  podUrl: { type: String, trim: true },
  podReceivedAt: { type: Date },

  // Hold reason
  holdReason: { type: String, trim: true },

  // Timestamps for pipeline stages
  dispatchedAt: { type: Date },

  // Who did what
  handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dispatchedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Media gallery for all attached proofs
  mediaGallery: [{
    step: { type: String, enum: ['assembly', 'packing', 'dispatch', 'billing', 'lr', 'pod', 'other'], default: 'other' },
    url: { type: String, required: true },
    fileType: { type: String, default: 'image' }, // 'image', 'video', 'pdf', 'document'
    name: { type: String, trim: true },
    uploadedAt: { type: Date, default: Date.now }
  }],

  // Gate Guard Outbound Verification
  gateStatus: {
    type: String,
    enum: ['pending', 'approved', 'declined'],
    default: 'pending'
  },
  gateApprovedAt: { type: Date },
  gateApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  gateRemarks: { type: String, trim: true },

  remarks: { type: String, trim: true }
}, { timestamps: true });


DispatchSchema.index({ status: 1 });
DispatchSchema.index({ customerName: 1 });
DispatchSchema.index({ createdAt: -1 });

const tenantPlugin = require('../utils/tenantPlugin');
DispatchSchema.plugin(tenantPlugin);

module.exports = mongoose.model('Dispatch', DispatchSchema);
