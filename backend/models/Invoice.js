const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true },
  vendorName: { type: String, required: true },
  totalAmount: { type: Number, required: true },
  taxAmount: { type: Number, required: true },
  rawOcrText: { type: String },
  status: { type: String, enum: ['Scanned', 'Verified'], default: 'Scanned' }
}, { timestamps: true });

const tenantPlugin = require('../utils/tenantPlugin');
InvoiceSchema.plugin(tenantPlugin);

module.exports = mongoose.model('Invoice', InvoiceSchema);
