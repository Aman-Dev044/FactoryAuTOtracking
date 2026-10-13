const mongoose = require('mongoose');

const SalesInvoiceItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  rate: { type: Number, required: true, min: 0 },
  taxRate: { type: Number, default: 18 },
  amount: { type: Number, required: true }
});

const SalesInvoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true },
  clientName: { type: String, required: true },
  clientAddress: { type: String },
  clientGST: { type: String },
  invoiceDate: { type: Date, default: Date.now },
  dueDate: { type: Date },
  items: [SalesInvoiceItemSchema],
  subtotal: { type: Number, required: true },
  discountAmount: { type: Number, default: 0 },
  taxAmount: { type: Number, required: true },
  grandTotal: { type: Number, required: true },
  isNonGST: { type: Boolean, default: false },
  documentType: {
    type: String,
    enum: ['tax_invoice', 'non_gst_bill', 'delivery_challan'],
    default: 'tax_invoice'
  },
  challanNumber: { type: String },
  vehicleNumber: { type: String },
  transporter: { type: String },
  dispatchDate: { type: Date },
  challanReason: { type: String, default: 'Supply of Goods' },
  notes: { type: String }
}, { timestamps: true });

const tenantPlugin = require('../utils/tenantPlugin');
SalesInvoiceSchema.plugin(tenantPlugin);

module.exports = mongoose.model('SalesInvoice', SalesInvoiceSchema);
