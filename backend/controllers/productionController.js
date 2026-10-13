const ProductionPlan = require('../models/ProductionPlan');
const WipBatch = require('../models/WipBatch');
const Material = require('../models/Material');

// @desc    Create a production plan
// @route   POST /api/production/plans
// @access  Private (supervisor, admin, super_admin)
exports.createPlan = async (req, res, next) => {
  try {
    const { modelNumber, orderReference, plannedShots } = req.body;

    const plan = await ProductionPlan.create({
      modelNumber,
      orderReference,
      plannedShots,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Production plan created successfully',
      data: plan
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all production plans
// @route   GET /api/production/plans
// @access  Private
exports.getPlans = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (search) filter.modelNumber = { $regex: search, $options: 'i' };

    const plans = await ProductionPlan.find(filter)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: plans
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Issue material and create WIP Batch
// @route   POST /api/production/wip
// @access  Private (supervisor, admin, super_admin)
exports.createWipBatch = async (req, res, next) => {
  try {
    const { planId, materialIssued } = req.body;

    const plan = await ProductionPlan.findById(planId);
    if (!plan) return res.status(404).json({ success: false, message: 'Production plan not found' });

    // Deduct material from inventory (assuming Nylon for Drag Chains)
    const material = await Material.findOne({ type: 'nylon' });
    if (!material) {
      return res.status(400).json({ success: false, message: 'Nylon material not found in inventory' });
    }

    if (material.currentStock < materialIssued) {
      return res.status(400).json({ 
        success: false, 
        message: `Insufficient stock. Current Nylon stock is ${material.currentStock} kg.` 
      });
    }

    // Deduct stock
    material.currentStock -= materialIssued;
    material.totalIssued += materialIssued;
    material.lastUpdated = new Date();
    await material.save();

    // Create batch
    const batch = await WipBatch.create({
      planId,
      materialIssued,
      issuedBy: req.user._id
    });

    // Update plan status if it was 'planned'
    if (plan.status === 'planned') {
      plan.status = 'in_progress';
      await plan.save();
    }

    res.status(201).json({
      success: true,
      message: 'Material issued and WIP batch created',
      data: batch
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get WIP Batches
// @route   GET /api/production/wip
// @access  Private
exports.getWipBatches = async (req, res, next) => {
  try {
    const { currentStage, status } = req.query;
    const filter = {};

    if (currentStage) filter.currentStage = currentStage;
    if (status) filter.status = status;

    const batches = await WipBatch.find(filter)
      .populate('planId', 'modelNumber plannedShots completedShots')
      .populate('issuedBy', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: batches
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update WIP Stage (QC and move to next stage)
// @route   PUT /api/production/wip/:id/stage
// @access  Private (production, supervisor, admin, super_admin)
exports.updateWipStage = async (req, res, next) => {
  try {
    const { processedQty, rejectedQty, qcStatus, remarks } = req.body;
    const batch = await WipBatch.findById(req.params.id).populate('planId');

    if (!batch) return res.status(404).json({ success: false, message: 'WIP Batch not found' });
    if (batch.status === 'completed') return res.status(400).json({ success: false, message: 'Batch already completed' });
    if (batch.status === 'qc_failed') return res.status(400).json({ success: false, message: 'Batch failed QC and is locked' });

    const stageData = {
      processedQty,
      rejectedQty,
      qcStatus,
      operator: req.user._id,
      timestamp: new Date(),
      remarks
    };

    if (qcStatus === 'failed') {
      batch.status = 'qc_failed';
    }

    // State machine logic
    if (batch.currentStage === 'shot_production') {
      batch.shotDetails = stageData;
      if (qcStatus !== 'failed') batch.currentStage = 'inhaling';
      
      // Update plan's completed shots based on shot production output
      const plan = await ProductionPlan.findById(batch.planId._id);
      plan.completedShots += Number(processedQty);
      if (plan.completedShots >= plan.plannedShots) plan.status = 'completed';
      await plan.save();

    } else if (batch.currentStage === 'inhaling') {
      batch.inhalingDetails = stageData;
      if (qcStatus !== 'failed') batch.currentStage = 'boiling';

    } else if (batch.currentStage === 'boiling') {
      batch.boilingDetails = stageData;
      if (qcStatus !== 'failed') {
        batch.currentStage = 'ready_for_assembly';
        batch.status = 'completed';
      }
    }

    await batch.save();

    res.status(200).json({
      success: true,
      message: `Stage updated to ${batch.currentStage}`,
      data: batch
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Production Stats
// @route   GET /api/production/stats
// @access  Private
exports.getProductionStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0,0,0,0);

    const [activePlans, activeBatches, todayMaterialIssued, batchesByStage] = await Promise.all([
      ProductionPlan.countDocuments({ status: 'in_progress' }),
      WipBatch.countDocuments({ status: 'active' }),
      WipBatch.aggregate([
        { $match: { createdAt: { $gte: today } } },
        { $group: { _id: null, total: { $sum: '$materialIssued' } } }
      ]),
      WipBatch.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$currentStage', count: { $sum: 1 } } }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        activePlans,
        activeBatches,
        todayMaterialIssued: todayMaterialIssued[0]?.total || 0,
        batchesByStage
      }
    });
  } catch (error) {
    next(error);
  }
};
