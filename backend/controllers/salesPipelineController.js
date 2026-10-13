const SalesPipeline = require('../models/SalesPipeline');
const Dispatch = require('../models/Dispatch');
const { createNotification } = require('./notificationController');
const { getSeriesSpecFromModel } = require('../utils/dragChainPricing');

// Helper to auto-create or sync Store Assembly / Dispatch job when Sales Order is created or approved
const syncSalesOrderToStoreAssembly = async (soRecord, reqUser) => {
  if (!soRecord || soRecord.stage !== 'sales_order') return null;

  try {
    const tenantFilter = soRecord.organizationId ? { organizationId: soRecord.organizationId } : {};
    
    // Check if Dispatch already exists for this SO
    let dispatch = null;
    if (soRecord.dispatchId) {
      dispatch = await Dispatch.findById(soRecord.dispatchId);
    }
    if (!dispatch && soRecord.salesOrderNumber) {
      dispatch = await Dispatch.findOne({ ...tenantFilter, salesOrderRef: soRecord.salesOrderNumber });
    }

    // Build items array from DragChainConfig or items
    let items = [];
    if (Array.isArray(soRecord.items) && soRecord.items.length > 0) {
      items = soRecord.items.map(item => ({
        modelNumber: item.modelNumber || item.dragChainConfig?.modelNumber || 'Standard Drag Chain',
        description: item.description || (item.dragChainConfig ? `Length: ${item.dragChainConfig.length || '1000mm'}, Links: ${item.dragChainConfig.totalCalculatedLinks || item.dragChainConfig.numberOfLinks || 'N/A'}, Bracket: ${item.dragChainConfig.mountingBracketType || 'Standard'}` : ''),
        quantity: item.quantity || item.dragChainConfig?.quantity || 1,
        unit: item.unit || 'meters'
      }));
    } else if (soRecord.dragChainConfig && soRecord.dragChainConfig.modelNumber) {
      const cfg = soRecord.dragChainConfig;
      items = [{
        modelNumber: cfg.modelNumber,
        description: `Inner Width: ${cfg.width || 'N/A'}, Radius: ${cfg.radius || 'N/A'}, Length: ${cfg.length || '1000mm'}, Links: ${cfg.totalCalculatedLinks || cfg.numberOfLinks || 'N/A'}, Bracket: ${cfg.mountingBracketType || 'Standard'}, Accessories: ${cfg.accessories || 'None'}`,
        quantity: cfg.quantity || 1,
        unit: 'meters'
      }];
    } else {
      items = [{
        modelNumber: 'Standard Drag Chain Order',
        description: `Order for ${soRecord.customerName}`,
        quantity: 1,
        unit: 'meters'
      }];
    }

    const dispatchData = {
      salesOrderRef: soRecord.salesOrderNumber || `SO-${new Date().getFullYear()}-0001`,
      customerName: soRecord.customerName,
      customerContact: soRecord.customerContact,
      customerEmail: soRecord.customerEmail,
      notifyCustomerEmail: true,
      customerAddress: soRecord.shippingAddress || soRecord.customerAddress || '',
      billingAddress: soRecord.billingAddress || soRecord.customerAddress || '',
      shippingAddress: soRecord.shippingAddress || soRecord.customerAddress || '',
      isSameAsBilling: soRecord.isSameAsBilling !== false,
      customerGST: soRecord.customerGST || '',
      items,
      organizationId: soRecord.organizationId,
      handledBy: reqUser?._id || soRecord.assignedTo || soRecord.leadOwner
    };

    if (dispatch) {
      // Update existing
      Object.assign(dispatch, dispatchData);
      await dispatch.save();
    } else {
      // Create new in 'assemble' stage
      dispatchData.status = 'assemble';
      dispatch = await Dispatch.create(dispatchData);
    }

    // Link back to SO
    if (soRecord._id && (!soRecord.dispatchId || String(soRecord.dispatchId) !== String(dispatch._id))) {
      await SalesPipeline.findByIdAndUpdate(soRecord._id, { dispatchId: dispatch._id });
    }

    return dispatch;
  } catch (err) {
    console.error('Error syncing Sales Order to Store Assembly:', err);
    return null;
  }
};

// Helper to auto-generate next sequential Sales Order Number (SO-YYYY-XXXX)
const generateNextSalesOrderNumber = async (req) => {
  const currentYear = new Date().getFullYear();
  const prefix = `SO-${currentYear}-`;

  // Respect multi-tenant isolation
  const tenantFilter = req.user?.organizationId ? { organizationId: req.user.organizationId } : {};

  // Find latest SO in current year
  const latestOrder = await SalesPipeline.findOne({
    ...tenantFilter,
    salesOrderNumber: new RegExp(`^SO-${currentYear}-\\d+`, 'i')
  }).sort({ createdAt: -1 });

  let nextSeq = 1;
  if (latestOrder && latestOrder.salesOrderNumber) {
    const match = latestOrder.salesOrderNumber.match(/SO-\d{4}-(\d+)/i);
    if (match && match[1]) {
      nextSeq = parseInt(match[1], 10) + 1;
    }
  } else {
    const count = await SalesPipeline.countDocuments({
      ...tenantFilter,
      stage: 'sales_order'
    });
    nextSeq = count + 1;
  }

  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
};

// Helper to calculate pricing, pitch & links consistently
const calculateItemAndFinancials = (payload) => {
  const cfg = payload.dragChainConfig || (payload.items && payload.items[0]?.dragChainConfig) || {};
  const modelNumber = cfg.modelNumber || payload.modelNumber || '';
  const spec = getSeriesSpecFromModel(modelNumber);

  // 1. Pitch & Link Calculation
  const pitch = Number(cfg.pitch) || spec.pitch || 45.5;
  cfg.pitch = pitch;

  // Calculate length per set in mm from length string
  let setLengthMm = 1000;
  if (cfg.length) {
    const cleanLen = String(cfg.length).trim().toLowerCase();
    const num = parseFloat(cleanLen.replace(/[^0-9.]/g, ''));
    if (!isNaN(num) && num > 0) {
      if ((cleanLen.includes('m') && !cleanLen.includes('mm')) || (num < 20 && !cleanLen.includes('mm'))) {
        setLengthMm = Math.round(num * 1000);
      } else {
        setLengthMm = Math.round(num);
      }
    }
  }

  // Set quantity represents how many number of sets required by customer
  const setQty = (cfg.quantity !== undefined && cfg.quantity !== null && Number(cfg.quantity) > 0) ? Number(cfg.quantity) : 1;
  cfg.quantity = setQty;

  const totalLengthMm = setLengthMm * setQty;
  const totalMeters = Math.round((totalLengthMm / 1000) * 100) / 100;
  cfg.totalMeters = totalMeters;

  const linksPerSet = Math.ceil(setLengthMm / pitch);
  const calculatedLinks = Math.ceil(totalLengthMm / pitch);
  cfg.linksPerSet = linksPerSet;
  cfg.totalCalculatedLinks = calculatedLinks;
  cfg.numberOfLinks = String(calculatedLinks);

  // 2. Price calculation (Editable rate per meter & sales discount)
  const ratePerMeter = Number(cfg.ratePerMeter) > 0 
    ? Number(cfg.ratePerMeter) 
    : (Number(payload.ratePerMeter) > 0 ? Number(payload.ratePerMeter) : (spec.ratePerMeter || 1200));
  cfg.ratePerMeter = ratePerMeter;
  payload.ratePerMeter = ratePerMeter;

  const grossAmount = Math.round((totalMeters * ratePerMeter) * 100) / 100;
  cfg.grossAmount = grossAmount;
  payload.grossAmount = grossAmount;

  const discountPercent = Math.min(100, Math.max(0, Number(cfg.discountPercent ?? payload.discountPercent ?? 0)));
  cfg.discountPercent = discountPercent;
  payload.discountPercent = discountPercent;

  const discountAmount = Math.round((grossAmount * (discountPercent / 100)) * 100) / 100;
  cfg.discountAmount = discountAmount;
  payload.discountAmount = discountAmount;

  const taxableAmount = Math.max(0, Math.round((grossAmount - discountAmount) * 100) / 100);
  payload.totalAmount = taxableAmount;

  const isNonGst = payload.orderDocumentType === 'standard_bill' || payload.orderDocumentType === 'non_gst_bill';
  const gstRate = isNonGst ? 0 : (Number(payload.taxRate ?? 18) / 100);
  const gstAmount = isNonGst ? 0 : Math.round((taxableAmount * gstRate) * 100) / 100;
  payload.gstAmount = gstAmount;
  payload.grandTotal = Math.round((taxableAmount + gstAmount + Number(payload.shippingCharges || 0)) * 100) / 100;

  // Sync back into payload items
  payload.dragChainConfig = cfg;
  if (payload.items && payload.items.length > 0) {
    payload.items[0].dragChainConfig = cfg;
    payload.items[0].unitPrice = ratePerMeter;
    payload.items[0].totalPrice = payload.grandTotal;
  }
};

// @desc    Get next sequential Sales Order number preview
// @route   GET /api/sales-pipeline/next-so-number
exports.getNextSalesOrderNumber = async (req, res, next) => {
  try {
    const nextSONumber = await generateNextSalesOrderNumber(req);
    res.json({ success: true, nextSONumber });
  } catch (err) { next(err); }
};

// Helper to hide confidential sales courier & logistics details from dispatch / store / production roles
const sanitizeSalesRecord = (record, role) => {
  if (!record) return record;
  if (['super_admin', 'admin', 'sales'].includes(role)) {
    return record;
  }
  const obj = record.toObject ? record.toObject() : { ...record };
  delete obj.courierPartner;
  delete obj.trackingNumber;
  delete obj.shippingDate;
  delete obj.estimatedDeliveryDate;
  delete obj.shippingCharges;
  delete obj.freightTerms;
  delete obj.logisticRemarks;
  return obj;
};

// @desc    Get all pipeline records
// @route   GET /api/sales-pipeline
exports.getPipeline = async (req, res, next) => {
  try {
    const { stage, status, paymentStatus, approvalStatus, orderDocumentType, page, limit = 10, search = '' } = req.query;
    const filter = {};
    if (stage) filter.stage = stage;
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (approvalStatus) filter.approvalStatus = approvalStatus;
    if (orderDocumentType) filter.orderDocumentType = orderDocumentType;
    if (search) {
      filter.$or = [
        { leadNumber: new RegExp(search, 'i') },
        { customerName: new RegExp(search, 'i') },
        { companyName: new RegExp(search, 'i') },
        { productName: new RegExp(search, 'i') },
        { salesOrderNumber: new RegExp(search, 'i') },
        { invoiceNumber: new RegExp(search, 'i') },
        { challanNumber: new RegExp(search, 'i') },
        { quotationNumber: new RegExp(search, 'i') },
        { piNumber: new RegExp(search, 'i') },
        { leadOwnerName: new RegExp(search, 'i') }
      ];
    }

    if (page) {
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 10;
      const total = await SalesPipeline.countDocuments(filter);
      const records = await SalesPipeline.find(filter)
        .populate('assignedTo', 'name email role')
        .populate('approvedBy', 'name email role')
        .populate('leadOwner', 'name email role')
        .populate('dispatchId', 'status lrNumber courier trackingNumber gateStatus totalBoxes totalWeight')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum);

      return res.json({
        success: true,
        count: records.length,
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum) || 1,
        data: records.map(r => sanitizeSalesRecord(r, req.user?.role))
      });
    }

    const records = await SalesPipeline.find(filter)
      .populate('assignedTo', 'name email role')
      .populate('approvedBy', 'name email role')
      .populate('leadOwner', 'name email role')
      .populate('dispatchId', 'status lrNumber courier trackingNumber gateStatus totalBoxes totalWeight')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: records.map(r => sanitizeSalesRecord(r, req.user?.role)) });
  } catch (err) { next(err); }
};

// @desc    Get pipeline stats for funnel & approvals
// @route   GET /api/sales-pipeline/stats
exports.getPipelineStats = async (req, res, next) => {
  try {
    const [leads, quotations, pis, pos, orders, overdue, pendingApproval, approvedOrders] = await Promise.all([
      SalesPipeline.countDocuments({ stage: 'lead' }),
      SalesPipeline.countDocuments({ stage: 'quotation' }),
      SalesPipeline.countDocuments({ stage: 'pi' }),
      SalesPipeline.countDocuments({ stage: 'customer_po' }),
      SalesPipeline.countDocuments({ stage: 'sales_order' }),
      SalesPipeline.countDocuments({ paymentStatus: 'overdue' }),
      SalesPipeline.countDocuments({ stage: 'sales_order', approvalStatus: 'pending' }),
      SalesPipeline.countDocuments({ stage: 'sales_order', approvalStatus: 'approved' })
    ]);
    res.json({
      success: true,
      data: { leads, quotations, pis, pos, orders, overdue, pendingApproval, approvedOrders }
    });
  } catch (err) { next(err); }
};

// Helper to detect human-readable field differences for Audit Logging
function detectFieldChanges(existing, updates) {
  const changes = [];
  const oldCfg = existing.dragChainConfig || (existing.items?.[0]?.dragChainConfig) || {};
  const newCfg = updates.dragChainConfig || (updates.items?.[0]?.dragChainConfig) || {};

  // 1. Stage change
  if (updates.stage && updates.stage !== existing.stage) {
    changes.push(`Stage: "${existing.stage}" → "${updates.stage}"`);
  }

  // 2. Customer details
  if (updates.customerName && updates.customerName !== existing.customerName) {
    changes.push(`Customer Name: "${existing.customerName}" → "${updates.customerName}"`);
  }
  if (updates.customerContact && updates.customerContact !== existing.customerContact) {
    changes.push(`Contact: "${existing.customerContact || 'None'}" → "${updates.customerContact}"`);
  }
  if (updates.customerEmail && updates.customerEmail !== existing.customerEmail) {
    changes.push(`Email: "${existing.customerEmail || 'None'}" → "${updates.customerEmail}"`);
  }

  // 3. Drag Chain Specifications & Model
  const oldModel = oldCfg.modelNumber || existing.modelNumber;
  const newModel = newCfg.modelNumber || updates.modelNumber;
  if (newModel && newModel !== oldModel) {
    changes.push(`Model: "${oldModel || 'None'}" → "${newModel}"`);
  }

  const oldPitch = oldCfg.pitch;
  const newPitch = newCfg.pitch;
  if (newPitch && Number(newPitch) !== Number(oldPitch)) {
    changes.push(`Pitch: ${oldPitch || 0}mm → ${newPitch}mm`);
  }

  const oldLinks = oldCfg.totalCalculatedLinks || oldCfg.numberOfLinks;
  const newLinks = newCfg.totalCalculatedLinks || newCfg.numberOfLinks;
  if (newLinks && String(newLinks) !== String(oldLinks)) {
    changes.push(`Links: ${oldLinks || 0} → ${newLinks}`);
  }

  const oldQty = oldCfg.quantity || existing.quantity;
  const newQty = newCfg.quantity || updates.quantity;
  if (newQty && Number(newQty) !== Number(oldQty)) {
    changes.push(`Quantity: ${oldQty || 0}m → ${newQty}m`);
  }

  const oldLen = oldCfg.length;
  const newLen = newCfg.length;
  if (newLen && newLen !== oldLen) {
    changes.push(`Length: "${oldLen || 'None'}" → "${newLen}"`);
  }

  // 4. Pricing & Discounts
  const oldRate = existing.ratePerMeter || oldCfg.ratePerMeter;
  const newRate = updates.ratePerMeter || newCfg.ratePerMeter;
  if (newRate && Number(newRate) !== Number(oldRate)) {
    changes.push(`Base Rate/m: ₹${oldRate || 0} → ₹${newRate}`);
  }

  const oldDisc = existing.discountPercent ?? oldCfg.discountPercent ?? 0;
  const newDisc = updates.discountPercent ?? newCfg.discountPercent;
  if (newDisc !== undefined && Number(newDisc) !== Number(oldDisc)) {
    changes.push(`Discount: ${oldDisc}% → ${newDisc}%`);
  }

  const oldGrand = existing.grandTotal || existing.totalAmount || 0;
  const newGrand = updates.grandTotal || updates.totalAmount;
  if (newGrand && Number(newGrand) !== Number(oldGrand)) {
    changes.push(`Grand Total: ₹${Number(oldGrand).toLocaleString()} → ₹${Number(newGrand).toLocaleString()}`);
  }

  // 5. Payment & Credit terms
  if (updates.creditDays && Number(updates.creditDays) !== Number(existing.creditDays)) {
    changes.push(`Credit Days: ${existing.creditDays || 0} → ${updates.creditDays}`);
  }
  if (updates.paymentStatus && updates.paymentStatus !== existing.paymentStatus) {
    changes.push(`Payment Status: "${existing.paymentStatus}" → "${updates.paymentStatus}"`);
  }

  // 6. Logistics
  if (updates.courierPartner && updates.courierPartner !== existing.courierPartner) {
    changes.push(`Courier: "${existing.courierPartner || 'None'}" → "${updates.courierPartner}"`);
  }
  if (updates.trackingNumber && updates.trackingNumber !== existing.trackingNumber) {
    changes.push(`Tracking #: "${existing.trackingNumber || 'None'}" → "${updates.trackingNumber}"`);
  }

  // 7. Salesforce Lead Details
  if (updates.leadOwnerName && updates.leadOwnerName !== existing.leadOwnerName) {
    changes.push(`Lead Owner: "${existing.leadOwnerName || 'None'}" → "${updates.leadOwnerName}"`);
  }
  if (updates.leadStatus && updates.leadStatus !== existing.leadStatus) {
    changes.push(`Lead Status: "${existing.leadStatus || 'new'}" → "${updates.leadStatus}"`);
  }
  if (updates.opportunityType && updates.opportunityType !== existing.opportunityType) {
    changes.push(`Opportunity Type: "${existing.opportunityType || 'new_business'}" → "${updates.opportunityType}"`);
  }
  if (updates.rating && updates.rating !== existing.rating) {
    changes.push(`Rating: "${existing.rating || 'warm'}" → "${updates.rating}"`);
  }
  if (updates.lifecycleStage && updates.lifecycleStage !== existing.lifecycleStage) {
    changes.push(`Lifecycle Stage: "${existing.lifecycleStage || 'lead'}" → "${updates.lifecycleStage}"`);
  }
  if (updates.nextSteps && updates.nextSteps !== existing.nextSteps) {
    changes.push(`Next Steps: "${existing.nextSteps || 'None'}" → "${updates.nextSteps}"`);
  }

  return changes;
}

// @desc    Create a pipeline record
// @route   POST /api/sales-pipeline
exports.createPipelineRecord = async (req, res, next) => {
  try {
    const payload = { ...req.body, assignedTo: req.body.assignedTo || req.user._id };

    // Auto-calculate pitch, links, fixed price, discount, and totals
    calculateItemAndFinancials(payload);

    // Auto-set credit due date if creditDays provided
    if (payload.creditDays && !payload.creditDueDate) {
      const due = new Date();
      due.setDate(due.getDate() + Number(payload.creditDays));
      payload.creditDueDate = due;
    }

    // Auto-generate Sales Order number if creating in sales_order stage and not provided
    if (payload.stage === 'sales_order') {
      if (!payload.salesOrderNumber || payload.salesOrderNumber.includes('rand') || payload.salesOrderNumber.trim() === '') {
        payload.salesOrderNumber = await generateNextSalesOrderNumber(req);
      }
      payload.approvalStatus = 'pending';
    }

    // Initial audit log entry
    payload.auditLogs = [{
      changedAt: new Date(),
      changedBy: req.user._id,
      changedByName: req.user.name || 'Sales User',
      changedByRole: req.user.role || 'sales',
      action: 'created',
      changesSummary: [
        `Record created in "${payload.stage}" stage`,
        `Initial Amount: ₹${(payload.grandTotal || payload.totalAmount || 0).toLocaleString()}`,
        payload.dragChainConfig?.modelNumber ? `Model: ${payload.dragChainConfig.modelNumber} (${payload.dragChainConfig.quantity || 1}m)` : ''
      ].filter(Boolean),
      note: payload.remarks || 'Initial entry'
    }];

    const record = await SalesPipeline.create(payload);

    // If created as Sales Order, auto-sync to Store Assembly queue and notify
    if (payload.stage === 'sales_order') {
      await syncSalesOrderToStoreAssembly(record, req.user);
      try {
        await createNotification(req, {
          title: '🚨 Sales Order Awaiting Admin Approval',
          message: `Sales Order "${record.salesOrderNumber || ''}" for "${record.customerName}" (₹${record.grandTotal?.toLocaleString() || 0}) submitted by ${req.user.name || 'Sales Team'} requires Admin approval.`,
          type: 'sales_order_approval_requested',
          targetRoles: ['admin', 'super_admin'],
          metadata: { salesOrderId: record._id, customerName: record.customerName, grandTotal: record.grandTotal }
        });
      } catch (notifErr) {
        console.error('Failed to dispatch notification for Sales Order approval:', notifErr);
      }
    }

    const populated = await SalesPipeline.findById(record._id)
      .populate('assignedTo', 'name email role')
      .populate('leadOwner', 'name email role');

    res.status(201).json({ success: true, data: populated });
  } catch (err) { next(err); }
};

// @desc    Update pipeline record (advance stage, update payment etc.) — supports editing in any state including Approved
// @route   PUT /api/sales-pipeline/:id
exports.updatePipelineRecord = async (req, res, next) => {
  try {
    const updates = { ...req.body };

    // Auto-calculate pitch, links, fixed price, discount, and totals if dragChainConfig or pricing passed
    if (updates.dragChainConfig || updates.items || updates.discountPercent !== undefined) {
      calculateItemAndFinancials(updates);
    }

    // Auto-recalculate credit due date if creditDays changed
    if (updates.creditDays && !updates.creditDueDate) {
      const due = new Date();
      due.setDate(due.getDate() + Number(updates.creditDays));
      updates.creditDueDate = due;
    }

    // Check existing record
    const existing = await SalesPipeline.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Record not found' });

    // Track detailed field differences for Audit Logging
    const changesSummary = detectFieldChanges(existing, updates);
    const auditNote = updates.auditNote || updates.changeReason || updates.remarks || '';

    // If moving to sales_order stage from another stage
    if (updates.stage === 'sales_order') {
      if (!existing.salesOrderNumber && (!updates.salesOrderNumber || updates.salesOrderNumber.trim() === '')) {
        updates.salesOrderNumber = await generateNextSalesOrderNumber(req);
      }

      if (existing.stage !== 'sales_order') {
        updates.approvalStatus = 'pending';
        updates.approvedBy = null;
        updates.approvalDate = null;
        updates.rejectionReason = '';

        try {
          await createNotification(req, {
            title: '🚨 Sales Order Awaiting Admin Approval',
            message: `Deal for "${existing.customerName}" has been converted to Sales Order (${updates.salesOrderNumber || existing.salesOrderNumber || ''}) by ${req.user.name || 'Sales Team'} and requires Admin approval.`,
            type: 'sales_order_approval_requested',
            targetRoles: ['admin', 'super_admin'],
            metadata: { salesOrderId: existing._id, customerName: existing.customerName, grandTotal: updates.grandTotal || existing.grandTotal }
          });
        } catch (notifErr) {
          console.error('Failed to dispatch notification for Sales Order approval:', notifErr);
        }
      }
    }

    // Append Audit Log entry
    if (changesSummary.length > 0 || auditNote) {
      const auditEntry = {
        changedAt: new Date(),
        changedBy: req.user._id,
        changedByName: req.user.name || 'Authorized User',
        changedByRole: req.user.role || 'sales',
        action: updates.stage && updates.stage !== existing.stage ? 'stage_changed' : 'updated',
        changesSummary: changesSummary.length > 0 ? changesSummary : ['Record details modified'],
        note: auditNote ? (existing.approvalStatus === 'approved' ? `[Edited post-approval] ${auditNote}` : auditNote) : (existing.approvalStatus === 'approved' ? 'Edited after Admin Approval' : '')
      };

      if (!updates.$push) updates.$push = {};
      updates.$push.auditLogs = auditEntry;
    }

    const record = await SalesPipeline.findByIdAndUpdate(
      req.params.id, updates, { new: true, runValidators: true }
    );

    // Sync updates to Store Assembly / Dispatch queue if in sales_order stage
    if (record.stage === 'sales_order') {
      await syncSalesOrderToStoreAssembly(record, req.user);
    }

    const populatedRecord = await SalesPipeline.findById(record._id)
      .populate('assignedTo', 'name email role')
      .populate('approvedBy', 'name email role')
      .populate('leadOwner', 'name email role')
      .populate('dispatchId', 'status lrNumber courier trackingNumber gateStatus totalBoxes totalWeight')
      .populate('auditLogs.changedBy', 'name email role');

    res.json({ success: true, data: populatedRecord });
  } catch (err) { next(err); }
};

// @desc    Approve Sales Order (Admin / Super Admin only)
// @route   PUT /api/sales-pipeline/:id/approve
exports.approveSalesOrder = async (req, res, next) => {
  try {
    const record = await SalesPipeline.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Sales Order not found' });

    record.approvalStatus = 'approved';
    record.approvedBy = req.user._id;
    record.approvalDate = new Date();
    record.rejectionReason = '';

    // Append approval to Audit Logs
    record.auditLogs.push({
      changedAt: new Date(),
      changedBy: req.user._id,
      changedByName: req.user.name || 'Admin User',
      changedByRole: req.user.role || 'admin',
      action: 'approved',
      changesSummary: [`Sales Order Approved by Admin (${req.user.name})`],
      note: 'Admin verified and approved for store assembly & dispatch'
    });

    await record.save();

    // Auto-create/sync job in Store Assembly queue
    await syncSalesOrderToStoreAssembly(record, req.user);

    const populated = await SalesPipeline.findById(record._id)
      .populate('assignedTo', 'name email role')
      .populate('approvedBy', 'name email role')
      .populate('dispatchId', 'status lrNumber courier trackingNumber gateStatus totalBoxes totalWeight');

    // Notify Sales, Supervisor, Store Manager & Dispatch that Sales Order is approved and ready for Assembly
    try {
      await createNotification(req, {
        title: '✅ Sales Order Approved ➜ In Store Assembly Queue',
        message: `Sales Order "${populated.salesOrderNumber || ''}" for "${populated.customerName}" (₹${populated.grandTotal?.toLocaleString() || 0}) approved by ${req.user.name}. It is now in the (Store) Assembly queue.`,
        type: 'sales_order_approved',
        targetRoles: ['sales', 'supervisor', 'store_manager', 'dispatch', 'admin'],
        metadata: { salesOrderId: populated._id, customerName: populated.customerName, approvedBy: req.user.name }
      });
    } catch (notifErr) {
      console.error('Failed to send approval notification:', notifErr);
    }

    res.json({ success: true, data: populated, message: 'Sales Order successfully approved and dispatched to Store Assembly' });
  } catch (err) { next(err); }
};

// @desc    Reject Sales Order (Admin / Super Admin only)
// @route   PUT /api/sales-pipeline/:id/reject
exports.rejectSalesOrder = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const record = await SalesPipeline.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Sales Order not found' });

    record.approvalStatus = 'rejected';
    record.approvedBy = req.user._id;
    record.approvalDate = new Date();
    record.rejectionReason = reason || 'Rejected by Admin. Please check pricing / terms.';

    // Append rejection to Audit Logs
    record.auditLogs.push({
      changedAt: new Date(),
      changedBy: req.user._id,
      changedByName: req.user.name || 'Admin User',
      changedByRole: req.user.role || 'admin',
      action: 'rejected',
      changesSummary: [`Sales Order Rejected by Admin (${req.user.name})`],
      note: record.rejectionReason
    });

    await record.save();

    const populated = await SalesPipeline.findById(record._id)
      .populate('assignedTo', 'name email role')
      .populate('approvedBy', 'name email role');

    // Notify Sales team about rejection
    try {
      await createNotification(req, {
        title: '❌ Sales Order Rejected by Admin',
        message: `Sales Order for "${populated.customerName}" was rejected by ${req.user.name}. Reason: ${record.rejectionReason}`,
        type: 'sales_order_rejected',
        targetRoles: ['sales'],
        metadata: { salesOrderId: populated._id, customerName: populated.customerName, reason: record.rejectionReason }
      });
    } catch (notifErr) {
      console.error('Failed to send rejection notification:', notifErr);
    }

    res.json({ success: true, data: populated, message: 'Sales Order rejected' });
  } catch (err) { next(err); }
};

// @desc    Get audit logs for a sales pipeline record
// @route   GET /api/sales-pipeline/:id/audit-logs
exports.getAuditLogs = async (req, res, next) => {
  try {
    const record = await SalesPipeline.findById(req.params.id)
      .select('customerName salesOrderNumber quotationNumber stage approvalStatus auditLogs')
      .populate('auditLogs.changedBy', 'name email role');
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });

    res.json({
      success: true,
      data: {
        recordId: record._id,
        customerName: record.customerName,
        salesOrderNumber: record.salesOrderNumber,
        stage: record.stage,
        approvalStatus: record.approvalStatus,
        auditLogs: (record.auditLogs || []).sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt))
      }
    });
  } catch (err) { next(err); }
};

// @desc    Add follow-up note
// @route   POST /api/sales-pipeline/:id/followup
exports.addFollowUp = async (req, res, next) => {
  try {
    const { note } = req.body;
    const record = await SalesPipeline.findByIdAndUpdate(
      req.params.id,
      { $push: { followUps: { note, by: req.user._id, date: new Date() } } },
      { new: true }
    );
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, data: record });
  } catch (err) { next(err); }
};

// @desc    Delete pipeline record
// @route   DELETE /api/sales-pipeline/:id
exports.deletePipelineRecord = async (req, res, next) => {
  try {
    await SalesPipeline.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Record deleted' });
  } catch (err) { next(err); }
};
