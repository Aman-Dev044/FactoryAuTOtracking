const axios = require('axios');
const Order = require('../models/Order');
const WipBatch = require('../models/WipBatch');
const ProductionPlan = require('../models/ProductionPlan');
const User = require('../models/User');
const SupportTicket = require('../models/SupportTicket');
const GateEntry = require('../models/GateEntry');
const QualityLog = require('../models/QualityLog');
const ShortageBuySale = require('../models/ShortageBuySale');
const BuildJob = require('../models/BuildJob');

// @desc    Call Python AI to predict shots needed
// @route   POST /api/ai/predict-shots
// @access  Private (supervisor, admin, super_admin)
exports.predictShots = async (req, res, next) => {
  try {
    const { modelNumber, shortageMeters } = req.body;

    // Call Python FastAPI service (usually running on port 8000 locally or internal docker network)
    // const pythonApiUrl = process.env.PYTHON_API_URL || 'http://127.0.0.1:8000';
    // const pythonApiUrl = process.env.PYTHON_API_URL || 'http://localhost:8989';
    const pythonApiUrl = process.env.PYTHON_API_URL || 'http://127.0.0.1:8989';

    const response = await axios.post(`${pythonApiUrl}/predict/shots`, {
      model_number: modelNumber,
      shortage_meters: shortageMeters
    }, { timeout: 5000 });

    res.status(200).json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('AI Service Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to connect to AI Brain Service' });
  }
};

// @desc    Call Python AI Chatbot
// @route   POST /api/ai/chat
// @access  Private
exports.chatWithAI = async (req, res, next) => {
  const { message } = req.body;
  try {

    // Check if message asks for user status with an email
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/i;
    const match = message.match(emailRegex);

    if (match) {
      const email = match[0].toLowerCase().trim();
      const userRecord = await User.findOne({ email });

      if (userRecord) {
        let reply = `👋 **Hello ${userRecord.name}!** I have successfully located your account details and checked the live ERP database. Here is your profile status summary:\n\n`;
        reply += `📌 **Role:** ${userRecord.role.replace('_', ' ').toUpperCase()}\n`;
        reply += `🏢 **Department:** ${userRecord.department || 'Operations'}\n\n`;
        reply += `📊 **Current Pending Tasks & Stats:**\n`;

        if (userRecord.role === 'gate_guard') {
          const totalGate = await GateEntry.countDocuments();
          const verifiedGate = await GateEntry.countDocuments({ status: { $in: ['verified', 'grn_created'] } });
          const pendingGate = await GateEntry.countDocuments({ status: 'pending' });
          reply += `- **Total Inward Shipments Logged:** **${totalGate}** entries\n`;
          reply += `- **Verified Shipments:** **${verifiedGate}** logs have been verified.\n`;
          reply += `- **Pending Verification (Not Verified):** **${pendingGate}** logs are awaiting review & approval.\n`;

        } else if (userRecord.role === 'supervisor') {
          const activeBuilds = await BuildJob.countDocuments({ status: { $in: ['pending', 'processing'] } });
          const pendingGate = await GateEntry.countDocuments({ status: 'pending' });
          reply += `- **Active Production Runs:** You have **${activeBuilds}** build jobs currently in the pipeline.\n`;
          reply += `- **Pending Gate Entries:** There are **${pendingGate}** incoming material gate entries waiting for your review and approval.\n`;

        } else if (userRecord.role === 'quality_checker') {
          const pendingQc = await QualityLog.countDocuments({ status: 'pending_verification' });
          const totalQc = await QualityLog.countDocuments();
          reply += `- **Pending QC Verifications:** You have **${pendingQc}** scanned supplier invoices waiting for Store Manager/Sales verification.\n`;
          reply += `- **Total Invoices Logged:** A total of **${totalQc}** quality audits have been logged by you.\n`;

        } else if (userRecord.role === 'store_manager') {
          const pendingVerify = await QualityLog.countDocuments({ status: 'pending_verification' });
          const pendingAssembly = await BuildJob.countDocuments({ status: 'completed' });
          const activeShortages = await ShortageBuySale.countDocuments({ type: 'shortage', status: { $in: ['pending', 'assigned'] } });
          reply += `- **QC Invoices to Verify:** There are **${pendingVerify}** invoices waiting for your verification.\n`;
          reply += `- **Pending Assemblies (WIP):** **${pendingAssembly}** production runs are completed and awaiting godown sorting & handshake.\n`;
          reply += `- **Active Inventory Shortages:** **${activeShortages}** items are flagged as shortage and need sourcing.\n`;

        } else if (userRecord.role === 'sales') {
          const pendingVerify = await QualityLog.countDocuments({ status: 'pending_verification' });
          const activeOrders = await BuildJob.countDocuments({ status: { $in: ['pending', 'processing', 'shortage_reported'] } });
          const pendingShortages = await ShortageBuySale.countDocuments({ type: 'shortage', status: 'pending' });
          reply += `- **QC Invoices to Verify:** There are **${pendingVerify}** quality log invoices awaiting your verification to release payments.\n`;
          reply += `- **Active Sourcing Orders:** You have **${activeOrders}** build orders currently in the factory queue.\n`;
          reply += `- **Procurements Needed:** **${pendingShortages}** items reported in shortage are waiting for a Purchase Order (PO).\n`;

        } else if (['admin', 'super_admin'].includes(userRecord.role)) {
          const pendingGate = await GateEntry.countDocuments({ status: 'pending' });
          const activeBuilds = await BuildJob.countDocuments({ status: { $in: ['pending', 'processing'] } });
          const pendingQc = await QualityLog.countDocuments({ status: 'pending_verification' });
          const pendingTickets = await SupportTicket.countDocuments({ status: 'pending' });
          reply += `Here is a platform-wide overview of all pending items:\n`;
          reply += `- **Inward Gate Logs Pending Approval:** **${pendingGate}** entries\n`;
          reply += `- **Active Production Build Jobs:** **${activeBuilds}** runs\n`;
          reply += `- **QC Invoices Awaiting Verification:** **${pendingQc}** records\n`;
          reply += `- **Unresolved Support Tickets:** **${pendingTickets}** tickets\n`;
        } else {
          reply += `No pending operational tasks registered in the database for your role.`;
        }

        return res.status(200).json({
          success: true,
          reply
        });
      }
    }

    // Default: Forward to Python AI service
    const pythonApiUrl = process.env.PYTHON_API_URL || 'http://127.0.0.1:8989';
    const response = await axios.post(`${pythonApiUrl}/chat/`, { message }, { timeout: 5000 });

    res.status(200).json({
      success: true,
      reply: response.data.reply
    });
  } catch (error) {
    console.error('AI Chat Service error, using local fallback:', error.message);

    // Graceful local fallback if Python AI service is down or times out
    const msg = (message || '').toLowerCase();
    let fallbackReply;
    if (msg.includes("stock") || msg.includes("inventory")) {
      fallbackReply = "We currently have over 5,000 meters of open-series chains in stock. Please check the portal for exact Model quantities.";
    } else if (msg.includes("order") || msg.includes("status")) {
      fallbackReply = "To check your order status, please navigate to the Orders tab. Most orders dispatch within 48 hours!";
    } else {
      fallbackReply = "Hello! I am the TrackBells Assistant. I'm currently running in local fallback mode because the primary AI service is offline. How can I help you today?";
    }

    res.status(200).json({
      success: true,
      reply: fallbackReply
    });
  }
};

// @desc    Get aggregated factory reports for Analytics
// @route   GET /api/ai/reports
// @access  Private (admin, super_admin)
exports.getReports = async (req, res, next) => {
  try {
    // 1. QC Pass vs Reject Ratio (from WipBatch shotDetails)
    const qcData = await WipBatch.aggregate([
      { $match: { 'shotDetails.processedQty': { $exists: true } } },
      {
        $group: {
          _id: null,
          passed: { $sum: '$shotDetails.processedQty' },
          rejected: { $sum: '$shotDetails.rejectedQty' }
        }
      }
    ]);
    const qcPassReject = qcData.length > 0 ? qcData[0] : { passed: 0, rejected: 0 };

    // 2. Production Output over time (Last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const outputData = await WipBatch.aggregate([
      {
        $match: {
          currentStage: 'ready_for_assembly',
          updatedAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } },
          meters: { $sum: '$materialIssued' } // Simplified as proxy for output
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // 3. Top Models Ordered
    const topModels = await Order.aggregate([
      { $group: { _id: '$modelNumber', totalOrdered: { $sum: '$orderQuantity' } } },
      { $sort: { totalOrdered: -1 } },
      { $limit: 5 }
    ]);

    res.status(200).json({
      success: true,
      data: {
        qc: [
          { name: 'Passed', value: qcPassReject.passed },
          { name: 'Rejected', value: qcPassReject.rejected }
        ],
        output: outputData.map(d => ({ date: d._id, output: d.meters })),
        topModels: topModels.map(m => ({ model: m._id, quantity: m.totalOrdered }))
      }
    });
  } catch (error) {
    next(error);
  }
};
