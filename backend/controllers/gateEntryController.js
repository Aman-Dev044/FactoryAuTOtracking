const GateEntry = require('../models/GateEntry');
const Material = require('../models/Material');
const Dispatch = require('../models/Dispatch');
const PurchaseOrder = require('../models/PurchaseOrder');
const Vendor = require('../models/Vendor');
const { sendEmail, emailTemplates } = require('../utils/sendEmail');
const { parseEBillText, parseWithAI } = require('../utils/ebillParser');
const { extractTextFromFile, extractTextFromImageBuffer } = require('../utils/documentExtractor');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

// Helper to trigger Accounts email safely
const triggerAccountsOutwardEmail = async (entry, targetEmail, orgId) => {
  if (!targetEmail) return;
  try {
    const emailData = emailTemplates.outwardGateNotificationToAccounts(entry);
    await sendEmail({
      to: targetEmail,
      subject: emailData.subject,
      html: emailData.html,
      orgId
    });
    console.log(`[Gate Outward Email] Notification successfully sent to Accounts Team (${targetEmail})`);
    return true;
  } catch (err) {
    console.error(`[Gate Outward Email Error] Failed to notify accounts (${targetEmail}):`, err.message);
    return false;
  }
};

// @desc    Create gate entry
// @route   POST /api/gate-entry
// @access  Private (guard, supervisor, admin, super_admin)
exports.createGateEntry = async (req, res, next) => {
  try {
    const entryType = req.body.entryType || 'inward';
    const entryData = {
      ...req.body,
      entryType,
      loggedBy: req.user._id
    };

    // If PO number or ID provided, auto-link and populate
    if (entryData.poNumber || entryData.poId) {
      try {
        const poQuery = entryData.poId ? { _id: entryData.poId } : { poNumber: entryData.poNumber.trim() };
        const linkedPO = await PurchaseOrder.findOne(poQuery).populate('vendorId');
        if (linkedPO) {
          entryData.poId = linkedPO._id;
          entryData.poNumber = linkedPO.poNumber;
          entryData.vendorName = entryData.vendorName || linkedPO.vendorName || linkedPO.vendorId?.vendorName;
          entryData.vendorCode = entryData.vendorCode || linkedPO.vendorCode || linkedPO.vendorId?.vendorCode;
          entryData.vendorContact = entryData.vendorContact || linkedPO.vendorId?.phone;

          const totalOrdered = (linkedPO.items || []).reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
          entryData.poOrderedQuantity = totalOrdered;

          const inQty = Number(entryData.quantity) || 0;
          entryData.isPoCompliant = inQty <= (totalOrdered - (linkedPO.totalReceivedQty || 0));
        }
      } catch (poErr) {
        console.warn('PO Lookup for Gate Entry note:', poErr.message);
      }
    }

    // Handle single or multiple file uploads
    if (req.files) {
      if (req.files.invoice && req.files.invoice[0]) {
        entryData.invoiceUrl = `/api/uploads/${req.files.invoice[0].filename}`;
      } else if (req.files.invoiceFile && req.files.invoiceFile[0]) {
        entryData.invoiceUrl = `/api/uploads/${req.files.invoiceFile[0].filename}`;
      }
      if (req.files.materialPhoto && req.files.materialPhoto[0]) {
        entryData.materialPhotoUrl = `/api/uploads/${req.files.materialPhoto[0].filename}`;
      }
      if (req.files.thirdBillPhoto && req.files.thirdBillPhoto[0]) {
        entryData.thirdBillPhotoUrl = `/api/uploads/${req.files.thirdBillPhoto[0].filename}`;
      }
    } else if (req.file) {
      entryData.invoiceUrl = `/api/uploads/${req.file.filename}`;
    }

    const entry = await GateEntry.create(entryData);

    // If Outward Entry for Finished Goods
    if (entryType === 'outward') {
      // 1. Send Email to Accounts Team if email provided
      if (entry.accountsEmail) {
        const sent = await triggerAccountsOutwardEmail(entry, entry.accountsEmail, req.user?.organizationId);
        if (sent) {
          entry.accountsEmailSentAt = new Date();
          await entry.save();
        }
      }

      // 2. Sync with Dispatch Order if matching bill/invoice/SO ref or dispatchRef
      try {
        const dispatchFilter = entry.dispatchRef
          ? { _id: entry.dispatchRef }
          : {
              $or: [
                { salesOrderRef: entry.billNumber },
                { invoiceNumber: entry.billNumber },
                { invoiceNo: entry.billNumber },
                { dispatchNo: entry.billNumber }
              ]
            };

        const matchingDispatch = await Dispatch.findOne(dispatchFilter);
        if (matchingDispatch) {
          matchingDispatch.gateStatus = 'approved';
          matchingDispatch.gateApprovedAt = new Date();
          matchingDispatch.gateApprovedBy = req.user._id;
          if (entry.vehicleNumber) matchingDispatch.vehicleNumber = entry.vehicleNumber;
          if (entry.driverName) matchingDispatch.driverName = entry.driverName;
          matchingDispatch.gateRemarks = `Outward passed at Gate (Driver: ${entry.driverName || 'N/A'}, Phone: ${entry.driverPhone || 'N/A'}, Vehicle: ${entry.vehicleNumber || 'N/A'})`;
          await matchingDispatch.save();
          entry.dispatchRef = matchingDispatch._id;
          await entry.save();
        }
      } catch (dispErr) {
        console.error('[Gate Outward] Dispatch auto-sync note:', dispErr.message);
      }

      // 3. Trigger In-App Notification
      const { createNotification } = require('./notificationController');
      await createNotification(req, {
        title: 'Finished Goods Outward Gate Pass Logged',
        message: `Outward entry #${entry.billNumber || ''} (${entry.materialType || 'Finished Goods'} - ${entry.quantity || ''} ${entry.unit || ''}) cleared gate in vehicle ${entry.vehicleNumber || ''}.`,
        type: 'gate_entry_created',
        targetRoles: ['storeManager', 'sales', 'dispatch', 'admin', 'super_admin'],
        metadata: { gateEntryId: entry._id, entryType: 'outward' }
      });
    } else {
      // Inward Entry Notification
      const { createNotification } = require('./notificationController');
      await createNotification(req, {
        title: 'New Inward Gate Entry Logged',
        message: `A new inward entry (${entry.materialType || 'material'} - ${entry.quantity || ''} ${entry.unit || ''}) has been logged.`,
        type: 'gate_entry_created',
        targetRoles: ['storeManager', 'qualityChecker'],
        metadata: { gateEntryId: entry._id, entryType: 'inward' }
      });
    }

    res.status(201).json({
      success: true,
      message: `${entryType === 'outward' ? 'Outward' : 'Inward'} gate entry created successfully`,
      data: entry
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all gate entries with pagination, search, filter
// @route   GET /api/gate-entry
// @access  Private
exports.getGateEntries = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status,
      materialType,
      entryType,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = {};

    if (entryType) {
      if (entryType === 'inward') {
        filter.$or = [
          { entryType: 'inward' },
          { entryType: { $exists: false } },
          { entryType: null }
        ];
      } else {
        filter.entryType = entryType;
      }
    }

    if (search) {
      const searchFilter = [
        { billNumber: { $regex: search, $options: 'i' } },
        { vendorName: { $regex: search, $options: 'i' } },
        { grnNumber: { $regex: search, $options: 'i' } },
        { vehicleNumber: { $regex: search, $options: 'i' } }
      ];
      if (filter.$or) {
        filter.$and = [
          { $or: filter.$or },
          { $or: searchFilter }
        ];
        delete filter.$or;
      } else {
        filter.$or = searchFilter;
      }
    }

    if (status) filter.status = status;
    if (materialType) filter.materialType = materialType;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
    }

    const total = await GateEntry.countDocuments(filter);
    const entries = await GateEntry.find(filter)
      .populate('loggedBy', 'name role')
      .populate('verifiedBy', 'name role')
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      data: entries,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single gate entry
// @route   GET /api/gate-entry/:id
// @access  Private
exports.getGateEntry = async (req, res, next) => {
  try {
    const entry = await GateEntry.findById(req.params.id)
      .populate('loggedBy', 'name role email')
      .populate('verifiedBy', 'name role email');

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Gate entry not found' });
    }

    res.status(200).json({ success: true, data: entry });
  } catch (error) {
    next(error);
  }
};

// @desc    Update gate entry
// @route   PUT /api/gate-entry/:id
// @access  Private
exports.updateGateEntry = async (req, res, next) => {
  try {
    let entry = await GateEntry.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Gate entry not found' });
    }

    // Don't allow editing GRN-created entries (only remarks)
    if (entry.status === 'grn_created' && req.body.status !== 'grn_created') {
      return res.status(400).json({ success: false, message: 'Cannot modify entry after GRN is created' });
    }

    entry = await GateEntry.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('loggedBy', 'name role').populate('verifiedBy', 'name role');

    res.status(200).json({
      success: true,
      message: 'Gate entry updated successfully',
      data: entry
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete gate entry
// @route   DELETE /api/gate-entry/:id
// @access  Private (admin, super_admin)
exports.deleteGateEntry = async (req, res, next) => {
  try {
    const entry = await GateEntry.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Gate entry not found' });
    }

    if (entry.status === 'grn_created') {
      return res.status(400).json({ success: false, message: 'Cannot delete entry with GRN' });
    }

    await GateEntry.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: 'Gate entry deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify gate entry (supervisor verifies guard's entry)
// @route   PUT /api/gate-entry/:id/verify
// @access  Private (supervisor, admin, super_admin)
exports.verifyGateEntry = async (req, res, next) => {
  try {
    const entry = await GateEntry.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Gate entry not found' });
    }

    if (entry.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Entry is already processed' });
    }

    entry.status = 'verified';
    entry.verifiedBy = req.user._id;
    if (req.body && req.body.remarks) {
      entry.remarks = req.body.remarks;
    }
    await entry.save();

    // Sync with linked Purchase Order if exists
    if (entry.poId || entry.poNumber) {
      try {
        const poQuery = entry.poId ? { _id: entry.poId } : { poNumber: entry.poNumber.trim() };
        const po = await PurchaseOrder.findOne(poQuery);
        if (po) {
          const exists = (po.inwardGateEntries || []).some(g => String(g.gateEntryId) === String(entry._id));
          if (!exists) {
            po.inwardGateEntries.push({
              gateEntryId: entry._id,
              gateEntryNumber: entry.billNumber || `GE-${entry._id.toString().slice(-4)}`,
              billNumber: entry.billNumber,
              receivedDate: new Date(),
              receivedQty: entry.quantity || 0,
              vehicleNumber: entry.vehicleNumber,
              verifiedBy: req.user.name || 'Gate Supervisor'
            });
          }
          po.totalReceivedQty = (po.inwardGateEntries || []).reduce((acc, g) => acc + (Number(g.receivedQty) || 0), 0);
          const totalOrdered = (po.items || []).reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
          if (po.totalReceivedQty >= totalOrdered && totalOrdered > 0) {
            po.status = 'received';
          } else if (po.totalReceivedQty > 0) {
            po.status = 'partially_received';
          }
          await po.save();
        }
      } catch (poSyncErr) {
        console.error('PO Sync on Gate Verification error:', poSyncErr.message);
      }
    }

    const updated = await GateEntry.findById(entry._id)
      .populate('loggedBy', 'name role')
      .populate('verifiedBy', 'name role');

    res.status(200).json({
      success: true,
      message: 'Gate entry verified successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create GRN from verified gate entry
// @route   PUT /api/gate-entry/:id/create-grn
// @access  Private (store_manager, supervisor, admin, super_admin)
exports.createGRN = async (req, res, next) => {
  try {
    const entry = await GateEntry.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Gate entry not found' });
    }

    if (entry.status === 'grn_created') {
      return res.status(400).json({ success: false, message: 'GRN already created for this entry' });
    }

    const { receivedQuantity, qualityStatus, remarks } = req.body || {};

    // Update gate entry to GRN created
    entry.status = 'grn_created';
    entry.receivedQuantity = receivedQuantity || entry.quantity;
    entry.qualityStatus = qualityStatus || 'approved';
    entry.remarks = remarks || '';
    entry.verifiedBy = entry.verifiedBy || req.user._id;
    await entry.save();

    // Update or create material inventory
    if (entry.qualityStatus !== 'rejected') {
      let material = await Material.findOne({
        name: entry.materialType,
        type: entry.materialType
      });

      if (!material) {
        material = new Material({
          name: entry.materialType.charAt(0).toUpperCase() + entry.materialType.slice(1),
          type: entry.materialType,
          unit: entry.unit,
          currentStock: 0,
          totalInward: 0,
          totalIssued: 0
        });
      }

      const addQty = entry.receivedQuantity || entry.quantity;
      material.currentStock += addQty;
      material.totalInward += addQty;
      material.lastGateEntry = entry._id;
      material.lastUpdated = new Date();
      await material.save();
    }

    const updated = await GateEntry.findById(entry._id)
      .populate('loggedBy', 'name role')
      .populate('verifiedBy', 'name role');

    res.status(200).json({
      success: true,
      message: `GRN ${updated.grnNumber} created successfully. Inventory updated.`,
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get gate entry stats
// @route   GET /api/gate-entry/stats
// @access  Private
exports.getGateEntryStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalEntries, pendingEntries, todayEntries, grnCreated] = await Promise.all([
      GateEntry.countDocuments(),
      GateEntry.countDocuments({ status: 'pending' }),
      GateEntry.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } }),
      GateEntry.countDocuments({ status: 'grn_created' })
    ]);

    // Total material received today
    const todayMaterial = await GateEntry.aggregate([
      { $match: { createdAt: { $gte: today, $lt: tomorrow } } },
      { $group: { _id: null, total: { $sum: '$quantity' } } }
    ]);

    // Material by type
    const materialByType = await GateEntry.aggregate([
      { $match: { status: 'grn_created' } },
      { $group: { _id: '$materialType', total: { $sum: '$receivedQuantity' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalEntries,
        pendingEntries,
        todayEntries,
        grnCreated,
        todayMaterialQty: todayMaterial[0]?.total || 0,
        materialByType
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Manually notify accounts team with material & 3rd bill photos
// @route   POST /api/gate-entry/:id/notify-accounts
// @access  Private (guard, supervisor, admin, super_admin)
exports.notifyAccounts = async (req, res, next) => {
  try {
    const entry = await GateEntry.findById(req.params.id)
      .populate('loggedBy', 'name role email');

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Gate entry not found' });
    }

    const targetEmail = req.body.email || entry.accountsEmail;
    if (!targetEmail) {
      return res.status(400).json({ success: false, message: 'Accounts team email address is required' });
    }

    const sent = await triggerAccountsOutwardEmail(entry, targetEmail, req.user?.organizationId);
    if (!sent) {
      return res.status(500).json({ success: false, message: 'Failed to send email to accounts team' });
    }

    entry.accountsEmail = targetEmail;
    entry.accountsEmailSentAt = new Date();
    await entry.save();

    res.status(200).json({
      success: true,
      message: `Outward dispatch details & photos sent to Accounts Team (${targetEmail}) successfully!`,
      data: entry
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Scan E-Way Bill / Inward Invoice via Webcam or File Upload and return prefilled fields
// @route   POST /api/gate-entry/scan-ebill
// @access  Private (gate_guard, supervisor, admin, etc.)
exports.scanEBill = async (req, res, next) => {
  try {
    let invoiceUrl = '';
    let rawText = '';
    let originalFilename = '';
    let fileBuffer = null;

    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // 1. Handle uploaded file from multer (DOCX, PDF, Images, Excel, etc.)
    if (req.file) {
      invoiceUrl = `/api/uploads/${req.file.filename}`;
      originalFilename = req.file.originalname;
      const filePath = req.file.path;

      try {
        fileBuffer = fs.readFileSync(filePath);
        // Extract raw text directly in Node.js from DOCX, PDF, Images (via OCR), XLSX, CSV
        rawText = await extractTextFromFile(filePath, originalFilename, fileBuffer);
      } catch (extractErr) {
        console.warn('Local file text extraction warning:', extractErr.message);
      }

      // If local text is empty and python service is configured, try python microservice
      if (!rawText) {
        try {
          const pythonApiUrl = process.env.PYTHON_API_URL || 'http://127.0.0.1:7475';
          const form = new FormData();
          form.append('file', fs.createReadStream(filePath), originalFilename);
          const aiRes = await axios.post(`${pythonApiUrl}/ocr/scan-invoice`, form, {
            headers: { ...form.getHeaders() },
            timeout: 4000
          });
          if (aiRes.data && aiRes.data.raw_text) {
            rawText = aiRes.data.raw_text;
          }
        } catch (aiErr) {
          // silent fallback
        }
      }
    } 
    // 2. Handle Base64 image from Webcam snapshot
    else if (req.body.imageBase64 || req.body.image) {
      const base64Data = (req.body.imageBase64 || req.body.image).replace(/^data:image\/\w+;base64,/, '');
      fileBuffer = Buffer.from(base64Data, 'base64');
      const filename = `ebill-webcam-${Date.now()}.jpg`;
      const filePath = path.join(uploadsDir, filename);
      fs.writeFileSync(filePath, fileBuffer);
      invoiceUrl = `/api/uploads/${filename}`;
      originalFilename = filename;

      // Extract text from image buffer via Tesseract OCR
      try {
        rawText = await extractTextFromImageBuffer(fileBuffer);
      } catch (ocrErr) {
        console.warn('Webcam OCR warning:', ocrErr.message);
      }
    }
    // 3. Handle Sample Demo Bill requests
    else if (req.body.sampleType) {
      const sample = req.body.sampleType;
      invoiceUrl = '/api/uploads/sample-ebill-eway.pdf';
      if (sample === 'nylon') {
        rawText = `GOVERNMENT OF INDIA - GST E-WAY BILL SYSTEM
E-Way Bill No: 241289456712 | Generated Date: ${new Date().toISOString().split('T')[0]}
1. GSTIN of Supplier: 27AABCA1234F1Z5 | Supplier Name: Apex Polymers & Synthetic Resins Pvt Ltd
2. Place of Dispatch: MIDC Bhosari, Pune, Maharashtra
3. GSTIN of Recipient: 27AABCT9988K1Z2 | Recipient: TrackBells Factory Automation Ltd
4. Place of Delivery: Plot 44, Industrial Area, Pune
5. Document No: INV-2026-8941 | Date: ${new Date().toISOString().split('T')[0]} | Value: Rs. 1,45,000.00
6. HSN Code: 390810 | Reason for Transportation: Supply
7. Item Details: PA66 Virgin Grade Nylon Polymer Granules (Natural) | Qty: 500.00 KG | Rate: 290.00
PART-B (Vehicle Details):
Mode: Road | Vehicle No: MH-12-AB-8842 | Transporter: Speed Logistics Transporter | Driver Name: Rajesh Kumar | Phone: 9823012345`;
      } else if (sample === 'pigment') {
        rawText = `TAX INVOICE / DELIVERY CHALLAN
Invoice No: SUP-PIG-2026-042 | Date: ${new Date().toISOString().split('T')[0]}
Supplier: Supreme Masterbatch & Colorant Chem Pvt Ltd | GSTIN: 07AABCS9876P1Z1 | Phone: 9811223344
Buyer: TrackBells Factory Automation Unit 1
PO Ref: PO-2026-0042
Description of Goods: High Concentrate Jet Black Masterbatch Pigment (Grade MB-09)
Quantity: 150.00 KG | Unit: KG | Unit Price: 420.00 | Total Taxable: Rs. 63,000.00 | CGST+SGST: Rs. 11,340.00
Vehicle Number: DL-01-EA-5566 | Driver: Suresh Verma`;
      } else if (sample === 'packaging') {
        rawText = `E-WAY BILL / INWARD BILL
E-Way Bill No: 331908761234 | Date: ${new Date().toISOString().split('T')[0]}
From: PackWell Heavy Cartons & Packaging Industries | Phone: 9876543210
To: TrackBells Factory
Vehicle Reg: HR-26-DQ-9901 | Driver: Devendra Singh
Items: 5-Ply Heavy Duty Corrugated Packing Boxes (Size: 450x300x250 mm)
Qty: 250.00 Boxes | Unit: boxes | Total Amount: Rs. 22,500.00`;
      } else {
        rawText = `TAX INVOICE - HARDWARE & FASTENERS
Invoice No: HARD-2026-109 | Date: ${new Date().toISOString().split('T')[0]}
Supplier: Metro Industrial Fasteners & Hardware | Contact: +91 9890123456
Goods: SS 304 Hex Screws M6x20 & Drag Chain Link Pins | Qty: 2000.00 PCS | Unit: pcs
Vehicle: MH-14-GH-4321 | Driver: Amit Sharma`;
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'No document, image, PDF file, or webcam snapshot provided'
      });
    }

    // 4. Try AI Vision / LLM Parser first if available
    let parsedData = null;
    try {
      parsedData = await parseWithAI(rawText, fileBuffer, originalFilename);
    } catch (aiParseErr) {
      console.warn('AI Parser error, falling back to NLP heuristics:', aiParseErr.message);
    }

    // 5. If AI parser not available, use enhanced logistics NLP parser
    if (!parsedData || !parsedData.billNumber) {
      parsedData = parseEBillText(rawText, originalFilename);
    }

    parsedData.invoiceUrl = invoiceUrl;

    // 6. Cross-check and auto-match against active Purchase Orders in MongoDB
    let matchedPO = null;
    try {
      const foundPOs = await PurchaseOrder.find({
        status: { $in: ['approved', 'issued', 'sent', 'partially_received', 'draft'] }
      }).populate('vendorId').sort({ createdAt: -1 }).limit(15);

      if (foundPOs && foundPOs.length > 0) {
        // If exact PO match by number
        if (parsedData.poNumber) {
          const exactPo = foundPOs.find(p => p.poNumber && p.poNumber.toLowerCase().includes(parsedData.poNumber.toLowerCase()));
          if (exactPo) matchedPO = exactPo;
        }

        // Check vendor name match if no exact PO match yet
        if (!matchedPO && parsedData.vendorName) {
          const vendorMatch = foundPOs.find(p => {
            const pName = (p.vendorName || p.vendorId?.vendorName || '').toLowerCase();
            const eName = (parsedData.vendorName || '').toLowerCase();
            return pName && (eName.includes(pName.slice(0, 5)) || pName.includes(eName.slice(0, 5)));
          });
          if (vendorMatch) matchedPO = vendorMatch;
        }
      }

      if (matchedPO) {
        parsedData.poId = matchedPO._id;
        parsedData.poNumber = matchedPO.poNumber;
        const totalOrdered = (matchedPO.items || []).reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
        parsedData.poOrderedQuantity = totalOrdered || matchedPO.totalOrderedQty || 0;
        if (!parsedData.vendorName || parsedData.vendorName.includes('Apex Polymers')) {
          parsedData.vendorName = matchedPO.vendorName || matchedPO.vendorId?.vendorName || parsedData.vendorName;
        }
        if (!parsedData.vendorContact) {
          parsedData.vendorContact = matchedPO.vendorId?.phone || matchedPO.vendorContact || '';
        }
      }
    } catch (poErr) {
      console.warn('PO Auto-match note:', poErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Document / E-Bill scanned and parsed successfully!',
      data: parsedData,
      matchedPO: matchedPO ? {
        _id: matchedPO._id,
        poNumber: matchedPO.poNumber,
        vendorName: matchedPO.vendorName || matchedPO.vendorId?.vendorName,
        totalOrderedQty: parsedData.poOrderedQuantity
      } : null,
      invoiceUrl
    });
  } catch (error) {
    console.error('Scan E-Bill Error:', error);
    next(error);
  }
};

