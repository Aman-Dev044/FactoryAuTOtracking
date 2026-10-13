const WipBatch = require('../models/WipBatch');
const AssemblyBatch = require('../models/AssemblyBatch');
const RackBin = require('../models/RackBin');
const ChainInventory = require('../models/ChainInventory');

// ==========================================
// ASSEMBLY & QC
// ==========================================

// @desc    Get WIP Batches ready for assembly
// @route   GET /api/store/ready-wip
// @access  Private (store_manager, admin, super_admin)
exports.getReadyWipBatches = async (req, res, next) => {
  try {
    // Find all WIP batches that have passed boiling stage
    const batches = await WipBatch.find({ currentStage: 'ready_for_assembly', status: 'completed' })
      .populate('planId', 'modelNumber')
      .sort({ updatedAt: -1 });

    res.status(200).json({ success: true, data: batches });
  } catch (error) {
    next(error);
  }
};

// @desc    Assemble WIP Batch into Chains (Assembly QC)
// @route   POST /api/store/assemble
// @access  Private
exports.assembleWipBatch = async (req, res, next) => {
  try {
    const { wipBatchId, inputQuantity, outputMeters, rejectedQuantity, assembledComponents } = req.body;

    const wipBatch = await WipBatch.findById(wipBatchId).populate('planId');
    if (!wipBatch) return res.status(404).json({ success: false, message: 'WIP Batch not found' });
    if (wipBatch.currentStage !== 'ready_for_assembly') {
      return res.status(400).json({ success: false, message: 'Batch is not ready for assembly' });
    }

    // Create Assembly Batch
    const assembly = await AssemblyBatch.create({
      wipBatchId,
      modelNumber: wipBatch.planId.modelNumber,
      inputQuantity,
      outputMeters,
      rejectedQuantity,
      assembledComponents,
      assembledBy: req.user._id
    });

    // Mark WIP batch as fully consumed (archived state)
    // We could either delete it or just change the stage. Let's add a special flag or change stage.
    wipBatch.currentStage = 'assembled'; // custom hidden stage to remove from 'ready' list
    await wipBatch.save();

    res.status(201).json({ success: true, message: 'Assembly completed and QC passed', data: assembly });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all completed assemblies waiting for storage
// @route   GET /api/store/assemblies
// @access  Private
exports.getAssemblies = async (req, res, next) => {
  try {
    const assemblies = await AssemblyBatch.find({ status: 'assembled' })
      .populate('assembledBy', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: assemblies });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// RACK & BIN MANAGEMENT
// ==========================================

// @desc    Create a Rack/Bin
// @route   POST /api/store/racks
// @access  Private
exports.createRackBin = async (req, res, next) => {
  try {
    const { rackName, binName, capacity } = req.body;

    const exists = await RackBin.findOne({ rackName: rackName.toUpperCase(), binName: binName.toUpperCase() });
    if (exists) return res.status(400).json({ success: false, message: 'Rack and Bin combination already exists' });

    const rackBin = await RackBin.create({ rackName, binName, capacity });
    res.status(201).json({ success: true, message: 'Rack/Bin created successfully', data: rackBin });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all Racks/Bins
// @route   GET /api/store/racks
// @access  Private
exports.getRackBins = async (req, res, next) => {
  try {
    const racks = await RackBin.find().sort({ rackName: 1, binName: 1 });
    res.status(200).json({ success: true, data: racks });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// CHAIN INVENTORY & STORAGE
// ==========================================

// @desc    Store Assembly into Rack/Bin
// @route   POST /api/store/store-chain
// @access  Private
exports.storeChain = async (req, res, next) => {
  try {
    const { assemblyId, rackBinId } = req.body;

    const assembly = await AssemblyBatch.findById(assemblyId);
    if (!assembly || assembly.status !== 'assembled') {
      return res.status(400).json({ success: false, message: 'Valid assembly batch not found' });
    }

    const rackBin = await RackBin.findById(rackBinId);
    if (!rackBin) return res.status(404).json({ success: false, message: 'Rack/Bin not found' });

    if (rackBin.currentUtilization + assembly.outputMeters > rackBin.capacity) {
      return res.status(400).json({ success: false, message: 'Bin capacity exceeded' });
    }

    // Update or Create ChainInventory record
    let inventory = await ChainInventory.findOne({ modelNumber: assembly.modelNumber, rackBinId });
    if (inventory) {
      inventory.quantityMeters += assembly.outputMeters;
      inventory.lastUpdated = Date.now();
      await inventory.save();
    } else {
      inventory = await ChainInventory.create({
        modelNumber: assembly.modelNumber,
        rackBinId,
        quantityMeters: assembly.outputMeters
      });
    }

    // Update RackBin utilization
    rackBin.currentUtilization += assembly.outputMeters;
    await rackBin.save();

    // Update Assembly status
    assembly.status = 'stored';
    assembly.rackBinId = rackBinId;
    await assembly.save();

    res.status(200).json({ success: true, message: 'Chains stored successfully in inventory' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Chain Inventory
// @route   GET /api/store/inventory
// @access  Private
exports.getChainInventory = async (req, res, next) => {
  try {
    const inventory = await ChainInventory.find()
      .populate('rackBinId', 'rackName binName')
      .sort({ modelNumber: 1 });

    res.status(200).json({ success: true, data: inventory });
  } catch (error) {
    next(error);
  }
};

// @desc    Save Scanned Inventory
// @route   POST /api/store/inventory/scan
// @access  Private
exports.saveScannedInventory = async (req, res, next) => {
  try {
    const { items } = req.body;
    
    // Find or create a generic 'Mobile Scanner' RackBin
    let draftBin = await RackBin.findOne({ rackName: 'Mobile Scanner', binName: 'Live Draft' });
    if (!draftBin) {
      draftBin = await RackBin.create({ rackName: 'Mobile Scanner', binName: 'Live Draft', capacity: 999999, currentUtilization: 0 });
    }

    // Add items to inventory
    for (let item of items) {
      let inventory = await ChainInventory.findOne({ modelNumber: item.name, rackBinId: draftBin._id });
      if (inventory) {
        inventory.quantityMeters += item.qty;
        inventory.lastUpdated = Date.now();
        await inventory.save();
      } else {
        await ChainInventory.create({
          modelNumber: item.name,
          rackBinId: draftBin._id,
          quantityMeters: item.qty
        });
      }
    }
    
    res.status(200).json({ success: true, message: 'Scanned items saved permanently' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Store Stats
// @route   GET /api/store/stats
// @access  Private
exports.getStoreStats = async (req, res, next) => {
  try {
    const [readyWips, pendingAssemblies, inventoryData, totalBins] = await Promise.all([
      WipBatch.countDocuments({ currentStage: 'ready_for_assembly', status: 'completed' }),
      AssemblyBatch.countDocuments({ status: 'assembled' }),
      ChainInventory.aggregate([{ $group: { _id: null, totalMeters: { $sum: '$quantityMeters' } } }]),
      RackBin.countDocuments()
    ]);

    res.status(200).json({
      success: true,
      data: {
        readyWips,
        pendingAssemblies,
        totalMetersInStock: inventoryData[0]?.totalMeters || 0,
        totalBins
      }
    });
  } catch (error) {
    next(error);
  }
};
