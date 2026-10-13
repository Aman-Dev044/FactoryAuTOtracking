const Vendor = require('../models/Vendor');
const VendorQuotation = require('../models/VendorQuotation');
const PurchaseOrder = require('../models/PurchaseOrder');
const GateEntry = require('../models/GateEntry');
const Material = require('../models/Material');
const PurchaseStoreLedger = require('../models/PurchaseStoreLedger');
const Organization = require('../models/Organization');
const { generatePurchaseOrderPDF } = require('../utils/pdfGenerator');
const PDFDocument = require('pdfkit');
const tenantContext = require('../middleware/tenantContext');

// Helper: Auto-generate Vendor Code (e.g. VEN-0001)
async function generateNextVendorCode(req) {
  const count = await Vendor.countDocuments();
  return `VEN-${String(count + 1).padStart(4, '0')}`;
}

// Helper: Auto-generate PO Number (e.g. PO-2026-0001)
async function generateNextPONumber(req) {
  const year = new Date().getFullYear();
  const count = await PurchaseOrder.countDocuments({
    poNumber: new RegExp(`^PO-${year}-`, 'i')
  });
  return `PO-${year}-${String(count + 1).padStart(4, '0')}`;
}

// Helper: Auto-generate Quotation Number (e.g. VQ-2026-0001)
async function generateNextQuotationNumber(req) {
  const year = new Date().getFullYear();
  const count = await VendorQuotation.countDocuments({
    quotationNumber: new RegExp(`^VQ-${year}-`, 'i')
  });
  return `VQ-${year}-${String(count + 1).padStart(4, '0')}`;
}

// ==========================================
// 1. VENDOR CONTROLLERS
// ==========================================

// @desc    Get all vendors
// @route   GET /api/finance/vendors
exports.getVendors = async (req, res, next) => {
  try {
    const { search, status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { vendorName: new RegExp(search, 'i') },
        { vendorCode: new RegExp(search, 'i') },
        { contactPerson: new RegExp(search, 'i') },
        { gstNumber: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') }
      ];
    }
    const vendors = await Vendor.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: vendors });
  } catch (error) { next(error); }
};

// @desc    Add a vendor with auto vendor code
// @route   POST /api/finance/vendors
exports.addVendor = async (req, res, next) => {
  try {
    const payload = { ...req.body };
    if (!payload.vendorCode || payload.vendorCode.trim() === '') {
      payload.vendorCode = await generateNextVendorCode(req);
    }
    const vendor = await Vendor.create(payload);
    res.status(201).json({ success: true, data: vendor, message: `Vendor ${vendor.vendorName} (${vendor.vendorCode}) created successfully` });
  } catch (error) { next(error); }
};

// @desc    Update vendor
// @route   PUT /api/finance/vendors/:id
exports.updateVendor = async (req, res, next) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    res.status(200).json({ success: true, data: vendor, message: 'Vendor details updated' });
  } catch (error) { next(error); }
};

// @desc    Delete vendor
// @route   DELETE /api/finance/vendors/:id
exports.deleteVendor = async (req, res, next) => {
  try {
    const vendor = await Vendor.findByIdAndDelete(req.params.id);
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    res.status(200).json({ success: true, message: 'Vendor deleted' });
  } catch (error) { next(error); }
};

// ==========================================
// 2. VENDOR QUOTATIONS CONTROLLERS
// ==========================================

// @desc    Get all vendor quotations
// @route   GET /api/finance/quotations
exports.getQuotations = async (req, res, next) => {
  try {
    const { status, vendorId, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (vendorId) filter.vendorId = vendorId;
    if (search) {
      filter.$or = [
        { quotationNumber: new RegExp(search, 'i') },
        { vendorName: new RegExp(search, 'i') },
        { vendorCode: new RegExp(search, 'i') }
      ];
    }
    const quotes = await VendorQuotation.find(filter)
      .populate('vendorId', 'vendorName vendorCode contactPerson phone email gstNumber')
      .populate('poId', 'poNumber status grandTotal')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: quotes });
  } catch (error) { next(error); }
};

// @desc    Create Vendor Quotation
// @route   POST /api/finance/quotations
exports.createQuotation = async (req, res, next) => {
  try {
    const payload = { ...req.body, createdByUser: req.user._id };

    // Auto-generate quotation reference number if not provided
    if (!payload.quotationNumber || payload.quotationNumber.trim() === '') {
      payload.quotationNumber = await generateNextQuotationNumber(req);
    }

    // Populate vendor info
    if (payload.vendorId) {
      const vendor = await Vendor.findById(payload.vendorId);
      if (vendor) {
        payload.vendorName = vendor.vendorName;
        payload.vendorCode = vendor.vendorCode;
      }
    }

    // Calculate item totals
    let subTotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;

    const items = (payload.items || []).map(item => {
      const qty = Number(item.quantity) || 1;
      const rate = Number(item.unitRate || item.rate) || 0;
      const discPercent = Number(item.discountPercent) || 0;
      const taxRate = Number(item.taxRate) || 18;

      const gross = qty * rate;
      const disc = gross * (discPercent / 100);
      const taxable = gross - disc;
      const tax = taxable * (taxRate / 100);
      const total = taxable + tax;

      subTotal += taxable;
      totalDiscount += disc;
      totalTax += tax;

      return {
        materialType: item.materialType || 'Nylon Granules',
        description: item.description || `${item.materialType || 'Raw Material'} supply`,
        quantity: qty,
        unit: item.unit || 'kg',
        unitRate: rate,
        discountPercent: discPercent,
        taxRate: taxRate,
        totalAmount: Math.round(total * 100) / 100
      };
    });

    payload.items = items;
    payload.subTotal = Math.round(subTotal * 100) / 100;
    payload.discountAmount = Math.round(totalDiscount * 100) / 100;
    payload.taxAmount = Math.round(totalTax * 100) / 100;
    payload.grandTotal = Math.round((subTotal + totalTax) * 100) / 100;

    const quote = await VendorQuotation.create(payload);
    res.status(201).json({ success: true, data: quote, message: `Quotation ${quote.quotationNumber} saved` });
  } catch (error) { next(error); }
};

// @desc    Convert Approved Quotation to Purchase Order (1-Click PO Generate)
// @route   POST /api/finance/quotations/:id/convert-to-po
exports.convertQuotationToPO = async (req, res, next) => {
  try {
    const quote = await VendorQuotation.findById(req.params.id).populate('vendorId');
    if (!quote) return res.status(404).json({ success: false, message: 'Quotation not found' });

    const poNumber = await generateNextPONumber(req);
    const vendor = quote.vendorId || {};

    const poItems = (quote.items || []).map(q => ({
      materialType: q.materialType,
      description: q.description,
      quantity: q.quantity,
      unit: q.unit || 'kg',
      rate: q.unitRate,
      discountPercent: q.discountPercent || 0,
      amount: q.totalAmount,
      gstRate: q.taxRate || 18,
      receivedQuantity: 0
    }));

    const po = await PurchaseOrder.create({
      poNumber,
      vendorId: quote.vendorId?._id || quote.vendorId,
      vendorName: quote.vendorName || vendor.vendorName,
      vendorCode: quote.vendorCode || vendor.vendorCode,
      vendorAddress: vendor.address || '',
      vendorGst: vendor.gstNumber || '',
      quotationId: quote._id,
      quotationNumber: quote.quotationNumber,
      orderDate: new Date(),
      expectedDeliveryDate: req.body.expectedDeliveryDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      items: poItems,
      subTotal: quote.subTotal,
      discountAmount: quote.discountAmount,
      gstAmount: quote.taxAmount,
      grandTotal: quote.grandTotal,
      paymentTerms: quote.paymentTerms || '30 Days Net',
      deliveryTerms: req.body.deliveryTerms || 'Door Delivery Factory Gate',
      status: 'issued',
      pdfUrl: `/api/finance/pos/temp/pdf`,
      notes: req.body.notes || `Generated against Quotation ${quote.quotationNumber}`,
      createdBy: req.user._id,
      createdByName: req.user.name || 'Purchase Manager'
    });

    po.pdfUrl = `/api/finance/pos/${po._id}/pdf`;
    await po.save();

    // Mark quotation as converted
    quote.status = 'converted_to_po';
    quote.poId = po._id;
    quote.poNumber = po.poNumber;
    await quote.save();

    res.status(201).json({
      success: true,
      data: po,
      message: `🎉 PO Generated Successfully: ${po.poNumber} from Quotation ${quote.quotationNumber}`
    });
  } catch (error) { next(error); }
};

// @desc    Update Quotation
// @route   PUT /api/finance/quotations/:id
exports.updateQuotation = async (req, res, next) => {
  try {
    const quote = await VendorQuotation.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!quote) return res.status(404).json({ success: false, message: 'Quotation not found' });
    res.status(200).json({ success: true, data: quote, message: 'Quotation updated' });
  } catch (error) { next(error); }
};

// @desc    Delete Quotation
// @route   DELETE /api/finance/quotations/:id
exports.deleteQuotation = async (req, res, next) => {
  try {
    const quote = await VendorQuotation.findByIdAndDelete(req.params.id);
    if (!quote) return res.status(404).json({ success: false, message: 'Quotation not found' });
    res.status(200).json({ success: true, message: 'Quotation deleted' });
  } catch (error) { next(error); }
};

// ==========================================
// 3. PURCHASE ORDER (PO) CONTROLLERS
// ==========================================

// @desc    Get all Purchase Orders
// @route   GET /api/finance/pos
exports.getPOs = async (req, res, next) => {
  try {
    const { status, vendorId, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (vendorId) filter.vendorId = vendorId;
    if (search) {
      filter.$or = [
        { poNumber: new RegExp(search, 'i') },
        { vendorName: new RegExp(search, 'i') },
        { vendorCode: new RegExp(search, 'i') },
        { quotationNumber: new RegExp(search, 'i') }
      ];
    }
    const pos = await PurchaseOrder.find(filter)
      .populate('vendorId', 'vendorName vendorCode contactPerson phone email gstNumber address')
      .populate('quotationId', 'quotationNumber')
      .populate('inwardGateEntries.gateEntryId', 'billNumber billDate quantity vehicleNumber driverName status')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: pos });
  } catch (error) { next(error); }
};

// @desc    Direct Create Multi-Item Purchase Order (PO)
// @route   POST /api/finance/pos
exports.createPO = async (req, res, next) => {
  try {
    const payload = { ...req.body, createdBy: req.user._id, createdByName: req.user.name || 'Purchase User' };

    // Auto-generate PO number if missing
    if (!payload.poNumber || payload.poNumber.trim() === '') {
      payload.poNumber = await generateNextPONumber(req);
    }

    // Populate Vendor details
    if (payload.vendorId) {
      const vendor = await Vendor.findById(payload.vendorId);
      if (vendor) {
        payload.vendorName = vendor.vendorName;
        payload.vendorCode = vendor.vendorCode;
        payload.vendorAddress = vendor.address;
        payload.vendorGst = vendor.gstNumber;
      }
    }

    // Process & calculate items
    let subTotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;

    let items = payload.items;
    if (!items || items.length === 0) {
      // Single item fallback
      const qty = Number(payload.quantityKg || payload.quantity) || 1;
      const rate = Number(payload.ratePerKg || payload.rate) || 0;
      const amount = qty * rate;
      items = [{
        materialType: payload.materialType || 'Nylon Granules',
        description: payload.description || `${payload.materialType || 'Material'} supply`,
        quantity: qty,
        unit: payload.unit || 'kg',
        rate: rate,
        discountPercent: 0,
        amount: amount,
        gstRate: 18,
        receivedQuantity: 0
      }];
      subTotal = amount;
      totalTax = amount * 0.18;
    } else {
      items = items.map(item => {
        const qty = Number(item.quantity) || 1;
        const rate = Number(item.rate) || 0;
        const discPercent = Number(item.discountPercent) || 0;
        const taxRate = Number(item.gstRate ?? item.taxRate ?? 18);

        const gross = qty * rate;
        const disc = gross * (discPercent / 100);
        const taxable = gross - disc;
        const tax = taxable * (taxRate / 100);
        const total = taxable + tax;

        subTotal += taxable;
        totalDiscount += disc;
        totalTax += tax;

        return {
          materialType: item.materialType || 'Raw Material',
          description: item.description || item.materialType || 'Nylon Material',
          quantity: qty,
          unit: item.unit || 'kg',
          rate: rate,
          discountPercent: discPercent,
          amount: Math.round(total * 100) / 100,
          gstRate: taxRate,
          receivedQuantity: 0
        };
      });
    }

    payload.items = items;
    payload.subTotal = Math.round(subTotal * 100) / 100;
    payload.discountAmount = Math.round(totalDiscount * 100) / 100;
    payload.gstAmount = Math.round(totalTax * 100) / 100;
    payload.grandTotal = Math.round((subTotal + totalTax) * 100) / 100;
    payload.status = payload.status || 'issued';

    const po = await PurchaseOrder.create(payload);
    po.pdfUrl = `/api/finance/pos/${po._id}/pdf`;
    await po.save();

    res.status(201).json({
      success: true,
      data: po,
      message: `✅ Purchase Order ${po.poNumber} created successfully`
    });
  } catch (error) { next(error); }
};

// @desc    Lookup active POs for Gate Entry auto-filling
// @route   GET /api/finance/pos/lookup-active
exports.getPOLookupForGateEntry = async (req, res, next) => {
  try {
    const pos = await PurchaseOrder.find({
      status: { $in: ['issued', 'partially_received', 'draft'] }
    })
      .select('poNumber vendorId vendorName vendorCode vendorGst items grandTotal subTotal status totalReceivedQty expectedDeliveryDate')
      .populate('vendorId', 'vendorName vendorCode phone contactPerson')
      .sort({ createdAt: -1 });

    const formatted = pos.map(p => {
      const totalOrderedQty = (p.items || []).reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
      const remainingQty = Math.max(0, totalOrderedQty - (p.totalReceivedQty || 0));
      const materialSummary = (p.items || []).map(it => `${it.materialType} (${it.quantity} ${it.unit || 'kg'})`).join(', ');

      return {
        _id: p._id,
        poNumber: p.poNumber,
        vendorId: p.vendorId?._id || p.vendorId,
        vendorName: p.vendorName || p.vendorId?.vendorName || 'Supplier',
        vendorCode: p.vendorCode || p.vendorId?.vendorCode || '',
        vendorPhone: p.vendorId?.phone || '',
        materialSummary: materialSummary || 'Nylon Granules',
        materials: p.items || [],
        totalOrderedQty,
        totalReceivedQty: p.totalReceivedQty || 0,
        remainingQty,
        grandTotal: p.grandTotal,
        status: p.status
      };
    });

    res.status(200).json({ success: true, data: formatted });
  } catch (error) { next(error); }
};

// @desc    Update Purchase Order
// @route   PUT /api/finance/pos/:id
exports.updatePO = async (req, res, next) => {
  try {
    const po = await PurchaseOrder.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!po) return res.status(404).json({ success: false, message: 'Purchase Order not found' });
    res.status(200).json({ success: true, data: po, message: 'Purchase Order updated' });
  } catch (error) { next(error); }
};

// @desc    Delete Purchase Order
// @route   DELETE /api/finance/pos/:id
exports.deletePO = async (req, res, next) => {
  try {
    const po = await PurchaseOrder.findByIdAndDelete(req.params.id);
    if (!po) return res.status(404).json({ success: false, message: 'Purchase Order not found' });
    res.status(200).json({ success: true, message: 'Purchase Order deleted' });
  } catch (error) { next(error); }
};

// @desc    Download Purchase Order PDF
// @route   GET /api/finance/pos/:id/pdf
exports.getPOPDF = async (req, res, next) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id).populate('vendorId');
    if (!po) return res.status(404).json({ success: false, message: 'Purchase Order not found' });

    const orgId = tenantContext.getStore() || req.user?.organizationId;
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
          brandSubtitle: 'Factory Automation & Procurement',
          logo: '/logo.png',
          themeColor: '#1e3a8a',
          footerText: 'Powered by TrackBells ERP'
        }
      };
    }

    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename=PurchaseOrder_${po.poNumber}.pdf`);

    doc.pipe(res);
    generatePurchaseOrderPDF(doc, po, org);
    doc.end();
  } catch (error) { next(error); }
};

// ==========================================
// 4. PURCHASE STORE & IN/OUT LEDGER CONTROLLERS
// ==========================================

// @desc    Get current inventory in Purchase Store
// @route   GET /api/finance/purchase-store/inventory
exports.getPurchaseStoreInventory = async (req, res, next) => {
  try {
    const { search, category } = req.query;
    const filter = { isActive: true };
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { type: new RegExp(search, 'i') },
        { storeLocation: new RegExp(search, 'i') },
        { rackNumber: new RegExp(search, 'i') }
      ];
    }

    const inventory = await Material.find(filter).sort({ name: 1 });
    res.status(200).json({ success: true, data: inventory });
  } catch (error) { next(error); }
};

// @desc    Place Inward Stock Entry into Purchase Store (with IN Ledger record)
// @route   POST /api/finance/purchase-store/inward
exports.placeInwardEntry = async (req, res, next) => {
  try {
    const {
      materialName,
      materialType = 'nylon',
      quantity,
      unit = 'kg',
      storeLocation = 'Purchase Store - Main Bay',
      rackBin = 'Rack A-1',
      referenceType = 'DIRECT_PURCHASE_INWARD',
      referenceNumber,
      vendorId,
      vendorName,
      vendorCode,
      poId,
      poNumber,
      gateEntryId,
      billNumber,
      remarks
    } = req.body;

    const inQty = Number(quantity);
    if (!materialName || !inQty || inQty <= 0) {
      return res.status(400).json({ success: false, message: 'Please provide valid Material Name and Quantity > 0' });
    }

    // 1. Find or create Material record in Purchase Store
    let material = await Material.findOne({
      name: new RegExp(`^${materialName.trim()}$`, 'i')
    });

    if (!material) {
      material = new Material({
        name: materialName.trim(),
        type: materialType.toLowerCase().includes('nylon') ? 'nylon' : 'other',
        unit: unit || 'kg',
        currentStock: 0,
        totalInward: 0,
        totalIssued: 0,
        minimumStock: 10,
        storeLocation: storeLocation || 'Purchase Store - Main Bay',
        rackNumber: rackBin || ''
      });
    }

    // 2. Increment stock
    material.currentStock = (material.currentStock || 0) + inQty;
    material.totalInward = (material.totalInward || 0) + inQty;
    material.storeLocation = storeLocation || material.storeLocation;
    material.rackNumber = rackBin || material.rackNumber;
    material.lastPOReference = poNumber || material.lastPOReference;
    material.lastUpdated = new Date();
    await material.save();

    // 3. If linked to PO, update PO received quantities
    if (poId || poNumber) {
      try {
        const poQuery = poId ? { _id: poId } : { poNumber: poNumber.trim() };
        const po = await PurchaseOrder.findOne(poQuery);
        if (po) {
          po.totalReceivedQty = (po.totalReceivedQty || 0) + inQty;
          const totalOrdered = (po.items || []).reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
          if (po.totalReceivedQty >= totalOrdered && totalOrdered > 0) {
            po.status = 'received';
          } else {
            po.status = 'partially_received';
          }
          await po.save();
        }
      } catch (poSyncErr) {
        console.warn('PO Inward Sync error:', poSyncErr.message);
      }
    }

    // 4. Create permanent IN Ledger entry with calculated balanceAfter
    const ledgerEntry = await PurchaseStoreLedger.create({
      entryType: 'IN',
      materialId: material._id,
      materialName: material.name,
      materialType: material.type,
      quantity: inQty,
      unit: material.unit || unit,
      storeLocation: material.storeLocation,
      rackBin: material.rackNumber,
      referenceType: referenceType || (poNumber ? 'PO_INWARD' : 'DIRECT_PURCHASE_INWARD'),
      referenceNumber: referenceNumber || poNumber || billNumber || `IN-${Date.now().toString().slice(-6)}`,
      vendorId: vendorId || null,
      vendorName: vendorName || '',
      vendorCode: vendorCode || '',
      poId: poId || null,
      poNumber: poNumber || '',
      gateEntryId: gateEntryId || null,
      billNumber: billNumber || '',
      balanceAfter: material.currentStock,
      remarks: remarks || `Inward received into Purchase Store (${storeLocation})`,
      performedBy: req.user._id,
      performedByName: req.user.name || 'Purchase Incharge',
      transactionDate: new Date()
    });

    res.status(201).json({
      success: true,
      data: {
        material,
        ledgerEntry
      },
      message: `📥 Successfully inwarded ${inQty} ${material.unit} of ${material.name} into ${storeLocation}. Current Stock: ${material.currentStock} ${material.unit}`
    });
  } catch (error) { next(error); }
};

// @desc    Place Outward / Issue Stock Entry from Purchase Store (with OUT Ledger record)
// @route   POST /api/finance/purchase-store/outward
exports.placeOutwardEntry = async (req, res, next) => {
  try {
    const {
      materialId,
      materialName,
      quantity,
      destinationDepartment = 'Molding & Production Line',
      machineNumber,
      issuedToPerson,
      issueSlipNumber,
      remarks
    } = req.body;

    const outQty = Number(quantity);
    if ((!materialId && !materialName) || !outQty || outQty <= 0) {
      return res.status(400).json({ success: false, message: 'Please specify Material and Quantity > 0' });
    }

    const materialQuery = materialId ? { _id: materialId } : { name: new RegExp(`^${materialName.trim()}$`, 'i') };
    const material = await Material.findOne(materialQuery);

    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found in Purchase Store' });
    }

    if (material.currentStock < outQty) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock! Requested: ${outQty} ${material.unit}, Available: ${material.currentStock} ${material.unit}`
      });
    }

    // 1. Deduct stock
    material.currentStock = material.currentStock - outQty;
    material.totalIssued = (material.totalIssued || 0) + outQty;
    material.lastUpdated = new Date();
    await material.save();

    // 2. Create permanent OUT Ledger entry
    const ledgerEntry = await PurchaseStoreLedger.create({
      entryType: 'OUT',
      materialId: material._id,
      materialName: material.name,
      materialType: material.type,
      quantity: outQty,
      unit: material.unit,
      storeLocation: material.storeLocation || 'Purchase Store',
      rackBin: material.rackNumber,
      referenceType: 'PRODUCTION_ISSUE',
      referenceNumber: issueSlipNumber || `ISSUE-${Date.now().toString().slice(-6)}`,
      destinationDepartment: destinationDepartment || 'Production Line',
      machineNumber: machineNumber || '',
      issuedToPerson: issuedToPerson || '',
      issueSlipNumber: issueSlipNumber || '',
      balanceAfter: material.currentStock,
      remarks: remarks || `Issued to ${destinationDepartment} ${machineNumber ? `(Machine ${machineNumber})` : ''}`,
      performedBy: req.user._id,
      performedByName: req.user.name || 'Purchase Incharge',
      transactionDate: new Date()
    });

    res.status(200).json({
      success: true,
      data: {
        material,
        ledgerEntry
      },
      message: `📤 Successfully issued ${outQty} ${material.unit} of ${material.name} to ${destinationDepartment}. Balance Remaining: ${material.currentStock} ${material.unit}`
    });
  } catch (error) { next(error); }
};

// @desc    Get complete IN/OUT Transaction Ledger for Purchase Store
// @route   GET /api/finance/purchase-store/ledger
exports.getStoreLedger = async (req, res, next) => {
  try {
    const { entryType, materialName, search } = req.query;
    const filter = {};
    if (entryType) filter.entryType = entryType;
    if (materialName) filter.materialName = new RegExp(materialName, 'i');
    if (search) {
      filter.$or = [
        { materialName: new RegExp(search, 'i') },
        { referenceNumber: new RegExp(search, 'i') },
        { poNumber: new RegExp(search, 'i') },
        { vendorName: new RegExp(search, 'i') },
        { destinationDepartment: new RegExp(search, 'i') },
        { performedByName: new RegExp(search, 'i') }
      ];
    }

    const ledger = await PurchaseStoreLedger.find(filter)
      .populate('performedBy', 'name role')
      .sort({ transactionDate: -1, createdAt: -1 });

    res.status(200).json({ success: true, data: ledger });
  } catch (error) { next(error); }
};

