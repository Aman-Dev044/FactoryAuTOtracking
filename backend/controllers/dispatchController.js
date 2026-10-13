const Dispatch = require('../models/Dispatch');
const User = require('../models/User');
const SalesPipeline = require('../models/SalesPipeline');
const Order = require('../models/Order');
const { createNotification } = require('./notificationController');
const { sendEmail, emailTemplates } = require('../utils/sendEmail');

// Helper to trigger dispatch email safely without breaking API response
const triggerDispatchEmail = async (dispatch, orgId) => {
  if (!dispatch || !dispatch.customerEmail) return;
  try {
    const emailData = emailTemplates.dispatchNotification(dispatch);
    await sendEmail({
      to: dispatch.customerEmail,
      subject: emailData.subject,
      html: emailData.html,
      orgId
    });
    console.log(`[Dispatch Email] Successfully sent notification to ${dispatch.customerEmail}`);
  } catch (err) {
    console.error(`[Dispatch Email Error] Failed to send email to ${dispatch.customerEmail}:`, err.message);
  }
};

// @desc    Get all dispatch orders
// @route   GET /api/dispatch
exports.getDispatches = async (req, res, next) => {
  try {
    const { status, page, limit = 10, search = '' } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { dispatchNo: new RegExp(search, 'i') },
        { customerName: new RegExp(search, 'i') },
        { customerEmail: new RegExp(search, 'i') },
        { vehicleNumber: new RegExp(search, 'i') },
        { invoiceNo: new RegExp(search, 'i') },
        { invoiceNumber: new RegExp(search, 'i') },
        { lrNumber: new RegExp(search, 'i') },
        { salesOrderRef: new RegExp(search, 'i') }
      ];
    }

    if (page) {
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 10;
      const total = await Dispatch.countDocuments(filter);
      const dispatches = await Dispatch.find(filter)
        .populate('handledBy', 'name')
        .populate('assembledBy', 'name')
        .populate('packedBy', 'name')
        .populate('dispatchedBy', 'name')
        .populate('gateApprovedBy', 'name')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum);

      return res.json({
        success: true,
        count: dispatches.length,
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum) || 1,
        data: dispatches
      });
    }

    const dispatches = await Dispatch.find(filter)
      .populate('handledBy', 'name')
      .populate('assembledBy', 'name')
      .populate('packedBy', 'name')
      .populate('dispatchedBy', 'name')
      .populate('gateApprovedBy', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: dispatches });
  } catch (err) { next(err); }
};

// @desc    Get dispatch stats
// @route   GET /api/dispatch/stats
exports.getDispatchStats = async (req, res, next) => {
  try {
    const [assemble, hold, packing, dispatched, today] = await Promise.all([
      Dispatch.countDocuments({ status: 'assemble' }),
      Dispatch.countDocuments({ status: 'hold' }),
      Dispatch.countDocuments({ status: 'packing' }),
      Dispatch.countDocuments({ status: 'dispatched' }),
      Dispatch.countDocuments({
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      })
    ]);
    res.json({ success: true, data: { assemble, hold, packing, dispatched, today } });
  } catch (err) { next(err); }
};

// @desc    Create dispatch order
// @route   POST /api/dispatch
exports.createDispatch = async (req, res, next) => {
  try {
    const dispatch = await Dispatch.create({
      ...req.body,
      handledBy: req.user._id,
      assembledBy: req.body.status === 'assemble' ? req.user._id : undefined,
      assembledAt: req.body.status === 'assemble' ? new Date() : undefined
    });

    // Send email notification if email is provided
    if (dispatch.customerEmail && req.body.notifyCustomerEmail !== false) {
      triggerDispatchEmail(dispatch, req.user?.organizationId);
    }

    res.status(201).json({ success: true, data: dispatch });
  } catch (err) { next(err); }
};

// @desc    Update dispatch (status, LR, POD, tracking, gateStatus, photos/videos, billing)
// @route   PUT /api/dispatch/:id
exports.updateDispatch = async (req, res, next) => {
  try {
    const updates = { ...req.body };

    // Security check: Gate guard can only update gateStatus & gateRemarks
    if (req.user.role === 'gate_guard') {
      delete updates.status;
      delete updates.customerName;
      delete updates.customerContact;
      delete updates.customerEmail;
      delete updates.customerAddress;
      delete updates.salesOrderRef;
      delete updates.items;
      delete updates.lrNumber;
      delete updates.courier;
      delete updates.trackingNumber;
      delete updates.podUrl;
      delete updates.assemblyMediaUrl;
      delete updates.packingMediaUrl;
      delete updates.dispatchMediaUrl;
      delete updates.billingInvoiceUrl;
    }

    // Auto-stamp timestamps and users on status transitions
    if (updates.status === 'assemble' && !updates.assembledAt) {
      updates.assembledAt = new Date();
      updates.assembledBy = req.user._id;
    }
    if (updates.status === 'packing' && !updates.packedAt) {
      updates.packedAt = new Date();
      updates.packedBy = req.user._id;
    }
    if (updates.status === 'dispatched') {
      if (!updates.dispatchedAt) updates.dispatchedAt = new Date();
      updates.dispatchedBy = req.user._id;
    }
    if (updates.podUrl && !updates.podReceivedAt) updates.podReceivedAt = new Date();

    // Auto-stamp Gate Guard Approval
    if (updates.gateStatus && ['approved', 'declined'].includes(updates.gateStatus)) {
      updates.gateApprovedAt = new Date();
      updates.gateApprovedBy = req.user._id;
    }

    const dispatch = await Dispatch.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    )
      .populate('handledBy', 'name')
      .populate('assembledBy', 'name')
      .populate('packedBy', 'name')
      .populate('dispatchedBy', 'name')
      .populate('gateApprovedBy', 'name');

    if (!dispatch) return res.status(404).json({ success: false, message: 'Dispatch order not found' });

    // Sync status with linked SalesPipeline and Order
    if (dispatch.salesOrderRef) {
      try {
        if (updates.status === 'dispatched') {
          await SalesPipeline.updateMany(
            { salesOrderNumber: dispatch.salesOrderRef },
            { $set: { status: 'won', paymentStatus: dispatch.billingInvoiceUrl ? 'paid' : undefined } }
          );
          await Order.updateMany(
            { orderNumber: dispatch.salesOrderRef },
            { $set: { status: 'dispatched' } }
          );
        }

        // Notify Sales on stage transitions
        if (updates.status === 'packing') {
          await createNotification(req, {
            title: '📦 Order Moved to Box Packing',
            message: `Order "${dispatch.salesOrderRef}" for "${dispatch.customerName}" has completed Store Assembly and is now in Box Packing.`,
            type: 'dispatch_packing',
            targetRoles: ['sales', 'admin', 'store_manager', 'dispatch'],
            metadata: { dispatchId: dispatch._id, salesOrderRef: dispatch.salesOrderRef }
          });
        } else if (updates.status === 'dispatched') {
          await createNotification(req, {
            title: '🚚 Order Dispatched to Logistics',
            message: `Order "${dispatch.salesOrderRef}" for "${dispatch.customerName}" has been Dispatched via ${dispatch.courier || 'Transport'} (LR/Tracking: ${dispatch.lrNumber || dispatch.trackingNumber || 'Assigned'}).`,
            type: 'dispatch_completed',
            targetRoles: ['sales', 'admin', 'store_manager', 'gate_guard'],
            metadata: { dispatchId: dispatch._id, salesOrderRef: dispatch.salesOrderRef }
          });
        }
      } catch (syncErr) {
        console.error('Error syncing dispatch status to Sales/Order:', syncErr);
      }
    }

    // Send email notification on update if customer email is provided
    if (dispatch.customerEmail && req.body.notifyCustomerEmail !== false) {
      triggerDispatchEmail(dispatch, req.user?.organizationId);
    }

    res.json({ success: true, data: dispatch });
  } catch (err) { next(err); }
};

// @desc    Manually send dispatch email notification to customer
// @route   POST /api/dispatch/:id/send-email
exports.sendDispatchEmail = async (req, res, next) => {
  try {
    const dispatch = await Dispatch.findById(req.params.id)
      .populate('handledBy', 'name')
      .populate('assembledBy', 'name')
      .populate('packedBy', 'name')
      .populate('dispatchedBy', 'name');

    if (!dispatch) return res.status(404).json({ success: false, message: 'Dispatch order not found' });

    const targetEmail = req.body.email || dispatch.customerEmail;
    if (!targetEmail) {
      return res.status(400).json({ success: false, message: 'Customer email address is required' });
    }

    const dispatchWithEmail = { ...dispatch.toObject(), customerEmail: targetEmail };
    const emailData = emailTemplates.dispatchNotification(dispatchWithEmail);

    await sendEmail({
      to: targetEmail,
      subject: emailData.subject,
      html: emailData.html,
      orgId: req.user?.organizationId
    });

    // Save email back to dispatch if newly provided
    if (!dispatch.customerEmail || dispatch.customerEmail !== targetEmail) {
      dispatch.customerEmail = targetEmail;
      await dispatch.save();
    }

    res.json({ success: true, message: `Email notification sent successfully to ${targetEmail}` });
  } catch (err) { next(err); }
};

// @desc    Delete dispatch order
// @route   DELETE /api/dispatch/:id
exports.deleteDispatch = async (req, res, next) => {
  try {
    const dispatch = await Dispatch.findByIdAndDelete(req.params.id);
    if (!dispatch) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Dispatch order deleted' });
  } catch (err) { next(err); }
};
