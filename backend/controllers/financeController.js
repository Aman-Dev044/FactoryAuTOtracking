const axios = require('axios');
const FormData = require('form-data');
const Vendor = require('../models/Vendor');
const PurchaseOrder = require('../models/PurchaseOrder');
const Invoice = require('../models/Invoice');
const Organization = require('../models/Organization');
const SalesInvoice = require('../models/SalesInvoice');
const { generatePurchaseOrderPDF, generateSalesInvoicePDF } = require('../utils/pdfGenerator');
const PDFDocument = require('pdfkit');
const tenantContext = require('../middleware/tenantContext');

// @desc    Get all vendors
exports.getVendors = async (req, res, next) => {
  try {
    const vendors = await Vendor.find();
    res.status(200).json({ success: true, data: vendors });
  } catch (error) { next(error); }
};

// @desc    Add a vendor
exports.addVendor = async (req, res, next) => {
  try {
    const vendor = await Vendor.create(req.body);
    res.status(201).json({ success: true, data: vendor });
  } catch (error) { next(error); }
};

// @desc    Get POs
exports.getPOs = async (req, res, next) => {
  try {
    const pos = await PurchaseOrder.find().populate('vendorId', 'vendorName');
    res.status(200).json({ success: true, data: pos });
  } catch (error) { next(error); }
};

// @desc    Create PO
exports.createPO = async (req, res, next) => {
  try {
    const { vendorId, materialType, quantityKg, ratePerKg } = req.body;
    const totalAmount = quantityKg * ratePerKg;

    // Generate PO Number
    const count = await PurchaseOrder.countDocuments();
    const poNumber = `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${(count + 1).toString().padStart(3, '0')}`;

    const po = await PurchaseOrder.create({
      poNumber,
      vendorId,
      materialType,
      quantityKg,
      ratePerKg,
      totalAmount
    });

    po.pdfUrl = `/api/finance/pos/${po._id}/pdf`;
    await po.save();

    res.status(201).json({ success: true, data: po });
  } catch (error) { next(error); }
};

// @desc    Scan Invoice via Python AI OCR
// @route   POST /api/finance/scan-invoice
exports.scanInvoice = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an image/pdf file' });
    }

    // const pythonApiUrl = process.env.PYTHON_API_URL || 'http://127.0.0.1:8000';
    // const pythonApiUrl = process.env.PYTHON_API_URL || 'http://localhost:8989';
    const pythonApiUrl = process.env.PYTHON_API_URL || 'http://127.0.0.1:8989';

    const form = new FormData();
    form.append('file', req.file.buffer, req.file.originalname);

    const response = await axios.post(`${pythonApiUrl}/ocr/scan-invoice`, form, {
      headers: { ...form.getHeaders() }
    });

    const aiData = response.data;

    const invoice = await Invoice.create({
      invoiceNumber: aiData.invoice_number,
      vendorName: aiData.vendor_name,
      totalAmount: aiData.total_amount,
      taxAmount: aiData.tax_amount,
      rawOcrText: aiData.raw_text
    });

    res.status(200).json({ success: true, data: invoice, aiExtracted: aiData });
  } catch (error) {
    const errorDetail = error.response?.data?.detail || error.message;
    console.error('OCR Error:', errorDetail);
    res.status(500).json({
      success: false,
      message: `AI OCR failed: ${errorDetail}`
    });
  }
};

exports.getInvoices = async (req, res, next) => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: invoices });
  } catch (error) { next(error); }
};

// @desc    Download Purchase Order PDF
// @route   GET /api/finance/pos/:id/pdf
// @access  Private
exports.getPOPDF = async (req, res, next) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id).populate('vendorId');
    if (!po) return res.status(404).json({ success: false, message: 'Purchase Order not found' });

    const orgId = tenantContext.getStore() || req.user.organizationId;
    let org = null;
    if (orgId) {
      org = await Organization.findById(orgId);
    }

    if (!org) {
      org = {
        name: 'TrackBells ERP',
        address: 'Factory Operations Center',
        settings: {
          brandName: 'TrackBells ERP',
          brandSubtitle: 'Factory Automation',
          logo: '/logo.png',
          themeColor: '#1e3a8a',
          footerText: 'Powered by Cyberbells ITES services pvt ltd'
        }
      };
    }

    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename=PurchaseOrder_${po.poNumber}.pdf`);

    doc.pipe(res);
    generatePurchaseOrderPDF(doc, po, org);
    doc.end();
  } catch (error) {
    next(error);
  }
};

// @desc    Create a sales invoice
// @route   POST /api/finance/sales-invoices
// @access  Private
exports.createSalesInvoice = async (req, res, next) => {
  try {
    const {
      invoiceNumber,
      clientName,
      clientAddress,
      clientGST,
      invoiceDate,
      dueDate,
      items,
      subtotal,
      discountAmount,
      taxAmount,
      grandTotal,
      isNonGST,
      documentType,
      challanNumber,
      vehicleNumber,
      transporter,
      dispatchDate,
      challanReason,
      notes
    } = req.body;
    
    const docType = documentType || (isNonGST ? 'non_gst_bill' : 'tax_invoice');

    // Auto-generate invoice/challan number if not provided
    let finalInvoiceNumber = invoiceNumber || challanNumber;
    if (!finalInvoiceNumber) {
      const count = await SalesInvoice.countDocuments();
      const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
      const prefix = docType === 'delivery_challan' ? 'DC' : 'INV';
      finalInvoiceNumber = `${prefix}-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;
    }

    const invoice = await SalesInvoice.create({
      invoiceNumber: finalInvoiceNumber,
      challanNumber: docType === 'delivery_challan' ? (challanNumber || finalInvoiceNumber) : undefined,
      documentType: docType,
      vehicleNumber,
      transporter,
      dispatchDate: dispatchDate || invoiceDate || new Date(),
      challanReason: challanReason || 'Supply of Goods',
      clientName,
      clientAddress,
      clientGST,
      invoiceDate: invoiceDate || new Date(),
      dueDate,
      items,
      subtotal,
      discountAmount: Number(discountAmount) || 0,
      taxAmount: (docType === 'delivery_challan' || isNonGST) ? 0 : taxAmount,
      grandTotal,
      isNonGST: Boolean(isNonGST) || docType === 'non_gst_bill' || docType === 'delivery_challan',
      notes
    });



    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all sales invoices
// @route   GET /api/finance/sales-invoices
// @access  Private
exports.getSalesInvoices = async (req, res, next) => {
  try {
    const invoices = await SalesInvoice.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: invoices });
  } catch (error) {
    next(error);
  }
};

// @desc    Download Sales Invoice PDF
// @route   GET /api/finance/sales-invoices/:id/pdf
// @access  Private
exports.getSalesInvoicePDF = async (req, res, next) => {
  try {
    const invoice = await SalesInvoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Sales Invoice not found' });
    }

    const orgId = tenantContext.getStore() || req.user.organizationId;
    let org = null;
    if (orgId) {
      org = await Organization.findById(orgId);
    }

    if (!org) {
      org = {
        name: 'TrackBells ERP',
        address: 'Factory Operations Center',
        settings: {
          brandName: 'TrackBells ERP',
          brandSubtitle: 'Factory Automation',
          logo: '/logo.png',
          themeColor: '#1e3a8a',
          footerText: 'Powered by Cyberbells ITES services pvt ltd'
        }
      };
    }

    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename=Invoice_${invoice.invoiceNumber}.pdf`);

    doc.pipe(res);
    generateSalesInvoicePDF(doc, invoice, org);
    doc.end();
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a sales invoice
// @route   DELETE /api/finance/sales-invoices/:id
// @access  Private
exports.deleteSalesInvoice = async (req, res, next) => {
  try {
    const invoice = await SalesInvoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Sales Invoice not found' });
    }
    await invoice.deleteOne();
    res.status(200).json({ success: true, message: 'Sales Invoice deleted successfully' });
  } catch (error) {
    next(error);
  }
};
