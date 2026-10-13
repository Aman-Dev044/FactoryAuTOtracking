const mongoose = require('mongoose');

// Drag Chain Configuration sub-schema (PDF requirement)
// Fields as per: MODEL - WIDTH - BENDING RADIUS - TYPE - NO.OF LINKS - LENGTH - MOUNTING BRACKET TYPE - ACCESSORIES
const DragChainConfigSchema = new mongoose.Schema({
  modelNumber: { type: String, trim: true },   // Model No. from DB catalog
  width: { type: String, trim: true },          // Inner Width (e.g. 150)
  radius: { type: String, trim: true },         // Bending Radius (e.g. R125)
  chainType: { type: String, enum: ['OP', 'CP', 'SEMI', ''], trim: true, default: 'OP' }, // OP / CP / SEMI
  numberOfLinks: { type: String, trim: true },  // Number of Links per meter (e.g. 22)
  pitch: { type: Number, default: 45.5 },       // Pitch in mm for Link <> Pitch calculation (e.g. 45.5, 55.5)
  totalCalculatedLinks: { type: Number },       // Auto-calculated total links based on length & pitch
  length: { type: String, trim: true },         // Length in mm/m (e.g. 1000 MM)
  mountingBracketType: { type: String, trim: true }, // B-BOX, L-ANGULAR, LSR(P), LSR(M), SRP-25, SRP-35, SRP-50
  accessories: { type: String, trim: true },    // HS (Horizontal Separator) / VS (Vertical Separator)
  quantity: { type: Number, default: 1 },
  ratePerMeter: { type: Number, default: 0 },   // Fixed price per meter from price sheet
  discountPercent: { type: Number, default: 0 },// Sales discount percentage (0-100%)
  discountAmount: { type: Number, default: 0 }, // Auto-calculated discount
  grossAmount: { type: Number, default: 0 },    // Gross before discount
  // legacy fields kept for backward compat
  series: { type: String, trim: true },
  height: { type: String, trim: true },
  openClosed: { type: String, trim: true },
  separator: { type: String, trim: true },
  separatorQty: { type: Number, default: 0 },
  bracketType: { type: String, trim: true }
}, { _id: false });

const SalesPipelineSchema = new mongoose.Schema({
  // Stage in pipeline
  stage: {
    type: String,
    enum: ['lead', 'quotation', 'pi', 'customer_po', 'sales_order'],
    default: 'lead'
  },

  // Salesforce Lead Module Specific Fields
  leadOwner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  leadOwnerName: { type: String, trim: true, default: '' },
  leadSource: { type: String, trim: true, default: 'Direct Inquiry' }, // e.g. Website, Cold Call, Referral, Trade Show, WhatsApp, Inbound
  leadStatus: {
    type: String,
    enum: ['new', 'contacted', 'working', 'qualified', 'unqualified', 'nurturing', ''],
    default: 'new'
  },
  opportunityType: {
    type: String,
    enum: ['new_business', 'existing_business', 'replacement', 'oem_partner', 'expansion', 'other', ''],
    default: 'new_business'
  },
  rating: {
    type: String,
    enum: ['hot', 'warm', 'cold', ''],
    default: 'warm'
  },
  nextSteps: { type: String, trim: true, default: '' },
  nextFollowUpDate: { type: Date },
  rejectionCategory: {
    type: String,
    enum: ['competitor_price', 'spec_mismatch', 'project_cancelled', 'budget_constraint', 'no_response', 'quality_issue', 'other', ''],
    default: ''
  },
  lifecycleStage: {
    type: String,
    enum: ['lead', 'mql', 'sql', 'opportunity', 'customer', ''],
    default: 'lead'
  },

  // Customer details
  customerName: { type: String, required: true, trim: true },
  salesPersonName: { type: String, trim: true, default: '' },
  customerContact: { type: String, trim: true },
  customerEmail: { type: String, trim: true },
  customerAddress: { type: String, trim: true },
  billingAddress: { type: String, trim: true },
  shippingAddress: { type: String, trim: true },
  isSameAsBilling: { type: Boolean, default: true },
  customerGST: { type: String, trim: true },

  // Reference numbers
  quotationNumber: { type: String, trim: true },
  piNumber: { type: String, trim: true },         // Proforma Invoice number
  customerPoNumber: { type: String, trim: true }, // Customer PO number
  salesOrderNumber: { type: String, trim: true },

  // Order Document Type (Tax Invoice vs Standard Bill (Non-GST) vs Delivery Challan vs Quotation vs PI)
  orderDocumentType: {
    type: String,
    enum: ['tax_invoice', 'standard_bill', 'non_gst_bill', 'challan', 'quotation', 'pi'],
    default: 'tax_invoice'
  },
  quotationDate: { type: Date },

  // Tax Invoice specific fields
  invoiceNumber: { type: String, trim: true },
  invoiceDate: { type: Date },
  hsnCode: { type: String, trim: true, default: '8483' },
  taxRate: { type: Number, default: 18 },
  isInterState: { type: Boolean, default: false },
  paymentTerms: { type: String, trim: true, default: '30 Days Net' },

  // Delivery Challan specific fields
  challanNumber: { type: String, trim: true },
  challanDate: { type: Date },
  challanType: {
    type: String,
    enum: ['supply_on_approval', 'job_work', 'sample_testing', 'against_sales_order', 'returnable', 'non_returnable', 'other'],
    default: 'against_sales_order'
  },
  transportMode: { type: String, trim: true, default: 'Road' },
  vehicleNumber: { type: String, trim: true },
  eWayBillNumber: { type: String, trim: true },
  lrNumber: { type: String, trim: true },
  receiverName: { type: String, trim: true },
  dispatchNotes: { type: String, trim: true },

  // Sales Person Logistics & Courier Details (Sales Private — Hidden from Dispatch Department)
  courierPartner: { type: String, trim: true },         // e.g. DTDC, BlueDart, Delhivery, SafeExpress, TCI, Trackon, etc.
  trackingNumber: { type: String, trim: true },         // AWB / Docket / Tracking No.
  shippingDate: { type: Date },                         // Courier Booking / Shipping Date
  estimatedDeliveryDate: { type: Date },                // Expected delivery date
  shippingCharges: { type: Number, default: 0 },        // Logistics / Freight charge
  freightTerms: {
    type: String,
    enum: [
      'paid_by_sender', 'paid_by_us',
      'to_pay_customer', 'to_pay',
      'included_in_invoice', 'billed_to_customer',
      'customer_account', 'free_shipping',
      'fob', 'cif',
      ''
    ],
    default: ''
  },
  logisticRemarks: { type: String, trim: true },        // Confidential courier/logistic notes by sales person

  // Items / Products
  items: [{
    modelNumber: { type: String, trim: true },
    description: { type: String, trim: true },
    quantity: { type: Number, default: 1 },
    unit: { type: String, default: 'pcs' },
    unitPrice: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 },
    dragChainConfig: DragChainConfigSchema
  }],

  // Financial
  ratePerMeter: { type: Number, default: 0 },
  discountPercent: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  grossAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 }, // Taxable Amount (Gross - Discount)
  gstAmount: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  currency: { type: String, default: 'INR' },

  // Credit tracking (PDF: credit date reflected in red)
  creditDays: { type: Number, default: 30 },
  creditDueDate: { type: Date },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'overdue'],
    default: 'pending'
  },
  paidAmount: { type: Number, default: 0 },

  // Document uploads
  piFileUrl: { type: String, trim: true },
  customerPoFileUrl: { type: String, trim: true },

  // Follow-ups & visits
  followUps: [{
    date: { type: Date, default: Date.now },
    note: { type: String, trim: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],

  // Visit / Complaint tracking
  visitType: { type: String, enum: ['visit', 'call', 'email', 'complaint', ''], default: '' },
  visitNote: { type: String, trim: true },

  // Dispatch linkage (when sales_order dispatched)
  dispatchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Dispatch' },
  status: {
    type: String,
    enum: ['active', 'won', 'lost', 'on_hold'],
    default: 'active'
  },

  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  remarks: { type: String, trim: true },

  // Admin Approval workflow for Sales Orders
  approvalStatus: {
    type: String,
    enum: ['none', 'pending', 'approved', 'rejected'],
    default: 'none'
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvalDate: { type: Date },
  rejectionReason: { type: String, trim: true },

  // Audit Logs & Change History Tracking (Supports editing in any state including Approved)
  auditLogs: [{
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedByName: { type: String, trim: true },
    changedByRole: { type: String, trim: true },
    action: {
      type: String,
      enum: ['created', 'updated', 'approved', 'rejected', 'stage_changed', 'reopened'],
      default: 'updated'
    },
    changesSummary: [{ type: String }],
    note: { type: String, trim: true }
  }]
}, { timestamps: true });

SalesPipelineSchema.index({ stage: 1 });
SalesPipelineSchema.index({ customerName: 1 });
SalesPipelineSchema.index({ paymentStatus: 1 });
SalesPipelineSchema.index({ creditDueDate: 1 });
SalesPipelineSchema.index({ createdAt: -1 });

const tenantPlugin = require('../utils/tenantPlugin');
SalesPipelineSchema.plugin(tenantPlugin);

module.exports = mongoose.model('SalesPipeline', SalesPipelineSchema);
