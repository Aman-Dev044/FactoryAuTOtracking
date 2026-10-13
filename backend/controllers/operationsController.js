const InventoryItem = require('../models/InventoryItem');
const Machine = require('../models/Machine');
const MachineCategory = require('../models/MachineCategory');
const BuildJob = require('../models/BuildJob');
const QualityLog = require('../models/QualityLog');
const ShortageBuySale = require('../models/ShortageBuySale');
const ProductTemplate = require('../models/ProductTemplate');
const Notification = require('../models/Notification');

// Helper to broadcast socket events
const broadcastToOrg = (req, eventName, payload) => {
  try {
    const io = req.app.get('io');
    const orgId = req.user.organizationId;
    if (io && orgId) {
      io.to(`org_${orgId}`).emit(eventName, payload);
      console.log(`Realtime Broadcast: ${eventName} sent to org_${orgId}`);
    }
  } catch (err) {
    console.error('Socket broadcast failed:', err);
  }
};

// Helper to create internal notification
const createInternalNotification = async (title, message, type, orgId) => {
  try {
    await Notification.create({ title, message, type, organizationId: orgId });
  } catch (err) {
    console.error('Notification creation failed:', err);
  }
};

// ==========================================
// UNIFIED INVENTORY
// ==========================================

exports.getInventory = async (req, res, next) => {
  try {
    const { page, limit = 10, search = '' } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { modelNumber: new RegExp(search, 'i') },
        { type: new RegExp(search, 'i') },
        { warehouseLocation: new RegExp(search, 'i') }
      ];
    }

    if (page) {
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 10;
      const total = await InventoryItem.countDocuments(query);
      const items = await InventoryItem.find(query)
        .sort({ updatedAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum);

      return res.status(200).json({
        success: true,
        count: items.length,
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum) || 1,
        data: items
      });
    }

    const items = await InventoryItem.find(query).sort({ updatedAt: -1 });
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

exports.createInventoryItem = async (req, res, next) => {
  try {
    const item = await InventoryItem.create(req.body);
    broadcastToOrg(req, 'inventory_updated', { action: 'create', item });
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};


exports.updateInventoryItem = async (req, res, next) => {
  try {
    const oldItem = await InventoryItem.findById(req.params.id);
    if (!oldItem) return res.status(404).json({ success: false, message: 'Item not found' });

    // Validate that approved quantity does not exceed original quantity and is an integer
    if (req.body.qualityStatus === 'verified' && typeof req.body.quantity === 'number') {
      if (req.body.quantity > oldItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `Approved quantity (${req.body.quantity}) cannot exceed the original quantity (${oldItem.quantity})`
        });
      }
      if (!Number.isInteger(req.body.quantity)) {
        return res.status(400).json({
          success: false,
          message: 'Approved quantity must be an integer (no decimals)'
        });
      }
    }

    const item = await InventoryItem.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

    // Automatically create a shortage if qualityStatus is verified and quantity is reduced
    if (req.body.qualityStatus === 'verified' && typeof req.body.quantity === 'number' && req.body.quantity < oldItem.quantity) {
      const shortageQty = oldItem.quantity - req.body.quantity;
      if (shortageQty > 0) {
        const shortage = await ShortageBuySale.create({
          type: 'shortage',
          itemName: item.name,
          quantity: shortageQty,
          unit: req.body.unit || item.unit,
          assignedTo: 'unassigned',
          status: 'pending',
          remarks: `Auto-created shortage from QC Audit Verification discrepancy. Inspected: ${oldItem.quantity}, Approved: ${req.body.quantity}. Remarks: ${req.body.qcRemarks || ''}`,
          organizationId: req.user.organizationId
        });

        await createInternalNotification(
          'QC Shortage Logged',
          `Shortage of ${shortageQty} ${req.body.unit || item.unit} created for item: ${item.name} due to QC discrepancy.`,
          'system',
          req.user.organizationId
        );

        broadcastToOrg(req, 'communication_updated', { action: 'create', item: shortage });
      }
    }

    broadcastToOrg(req, 'inventory_updated', { action: 'update', item });
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

exports.deleteInventoryItem = async (req, res, next) => {
  try {
    const item = await InventoryItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    broadcastToOrg(req, 'inventory_updated', { action: 'delete', itemId: req.params.id });
    res.status(200).json({ success: true, message: 'Item deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// MACHINES
// ==========================================

exports.getMachineCategories = async (req, res, next) => {
  try {
    let categories = await MachineCategory.find().sort({ categoryName: 1 });

    if (categories.length === 0) {
      const defaultCategories = [
        {
          categoryName: "Conveyor Belt Production",
          machineNames: [
            "Belt Extruder Machine",
            "Conveyor Vulcanizer",
            "Belt Cutting & Slitting Machine",
            "Belt Fabric Core Loom"
          ],
          organizationId: req.user.organizationId
        },
        {
          categoryName: "Chain & Assembly Lines",
          machineNames: [
            "Drag Chain Link Assembler",
            "Automated Assembly Station",
            "Robotic Welder & Riveter"
          ],
          organizationId: req.user.organizationId
        },
        {
          categoryName: "Molding & Casting",
          machineNames: [
            "Link Molding Injection Machine",
            "Die Casting Mold Station",
            "High-Pressure Press Machine"
          ],
          organizationId: req.user.organizationId
        },
        {
          categoryName: "Quality Testing & Calibration",
          machineNames: [
            "Tensile Strength Tester",
            "Laser Diameter & Thickness Gauge",
            "Defect X-Ray Scanner"
          ],
          organizationId: req.user.organizationId
        },
        {
          categoryName: "Packaging & Sorter Operations",
          machineNames: [
            "Automatic Shrink Wrapper",
            "Industrial Box Packager",
            "Pneumatic Sorter & Rejecter"
          ],
          organizationId: req.user.organizationId
        },
        {
          categoryName: "General Plant Utilities",
          machineNames: [
            "Heavy Duty Air Compressor",
            "Chiller & Cooling Unit",
            "Backup Generator System"
          ],
          organizationId: req.user.organizationId
        }
      ];
      categories = await MachineCategory.insertMany(defaultCategories);
    }

    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

exports.getMachines = async (req, res, next) => {
  try {
    const machines = await Machine.find().sort({ name: 1 });

    const activeJobs = await BuildJob.find({
      status: { $in: ['processing', 'delayed', 'pending', 'shortage_reported'] }
    });

    const activeMachineIds = new Set();
    const activeMachineNames = new Set();

    activeJobs.forEach(job => {
      if (job.machineId) activeMachineIds.add(job.machineId.toString());
      if (job.machineName) activeMachineNames.add(job.machineName.trim().toLowerCase());
    });

    const updatedMachines = await Promise.all(machines.map(async (m) => {
      const isWorking = activeMachineIds.has(m._id.toString()) || activeMachineNames.has(m.name.trim().toLowerCase());
      
      if (!['damaged', 'broken', 'destroyed'].includes(m.status)) {
        const expectedStatus = isWorking ? 'working' : 'available';
        if (m.status !== expectedStatus) {
          m.status = expectedStatus;
          await Machine.findByIdAndUpdate(m._id, { status: expectedStatus });
        }
      }
      return m;
    }));

    res.status(200).json({ success: true, data: updatedMachines });
  } catch (error) {
    next(error);
  }
};

exports.createMachine = async (req, res, next) => {
  try {
    const machine = await Machine.create(req.body);
    broadcastToOrg(req, 'machine_updated', { action: 'create', machine });
    res.status(201).json({ success: true, data: machine });
  } catch (error) {
    next(error);
  }
};

exports.updateMachine = async (req, res, next) => {
  try {
    const isAdmin = ['super_admin', 'admin'].includes(req.user?.role);
    let updateData = req.body;

    // If not admin, production managers / supervisors can ONLY change machine status
    if (!isAdmin) {
      if (req.body.status) {
        updateData = { status: req.body.status };
      } else {
        return res.status(403).json({ success: false, message: 'Only admin can edit machine specifications. Supervisors and Production Managers can only update machine status.' });
      }
    }

    const machine = await Machine.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!machine) return res.status(404).json({ success: false, message: 'Machine not found' });
    broadcastToOrg(req, 'machine_updated', { action: 'update', machine });
    res.status(200).json({ success: true, data: machine });
  } catch (error) {
    next(error);
  }
};

exports.deleteMachine = async (req, res, next) => {
  try {
    const machine = await Machine.findByIdAndDelete(req.params.id);
    if (!machine) return res.status(404).json({ success: false, message: 'Machine not found' });
    broadcastToOrg(req, 'machine_updated', { action: 'delete', machineId: req.params.id });
    res.status(200).json({ success: true, message: 'Machine deleted' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// BUILD JOBS
// ==========================================

// Helper function to group Build Jobs by Model Number on Backend
const groupBuildJobsByModelBackend = (jobsList) => {
  const map = new Map();
  jobsList.forEach(job => {
    const jobObj = typeof job.toObject === 'function' ? job.toObject() : job;
    const modelKey = (jobObj.modelNumber && jobObj.modelNumber.trim()) 
      ? jobObj.modelNumber.trim().toUpperCase()
      : (jobObj.productName ? jobObj.productName.trim().toUpperCase() : jobObj._id ? jobObj._id.toString() : String(Math.random()));

    if (!map.has(modelKey)) {
      map.set(modelKey, {
        key: modelKey,
        jobs: [],
        totalQty: 0,
        primaryJob: jobObj,
        sizes: new Set(),
        orderedByNames: new Set()
      });
    }

    const group = map.get(modelKey);
    group.jobs.push(jobObj);
    group.totalQty += Number(jobObj.orderQuantity) || 0;
    if (jobObj.productSize) group.sizes.add(jobObj.productSize);
    if (jobObj.orderedBy?.name) group.orderedByNames.add(jobObj.orderedBy.name);

    const statusPriority = { processing: 4, delayed: 4, shortage_reported: 3, pending: 2, completed: 1, received: 1, declined: 0 };
    if ((statusPriority[jobObj.status] || 0) > (statusPriority[group.primaryJob?.status] || 0)) {
      group.primaryJob = jobObj;
    }
  });

  return Array.from(map.values()).map(group => ({
    ...group.primaryJob,
    orderQuantity: group.totalQty,
    productSize: Array.from(group.sizes).join(', ') || group.primaryJob?.productSize || 'N/A',
    orderedByName: Array.from(group.orderedByNames).join(', ') || group.primaryJob?.orderedBy?.name || 'N/A',
    groupedCount: group.jobs.length
  }));
};

exports.getBuildJobs = async (req, res, next) => {
  try {
    await BuildJob.updateMany(
      {
        status: 'processing',
        estimatedDate: { $lt: new Date() }
      },
      {
        status: 'delayed'
      }
    );

    // Dynamically restore future estimatedDate jobs back to processing if they were marked delayed
    await BuildJob.updateMany(
      {
        status: 'delayed',
        estimatedDate: { $gt: new Date() }
      },
      {
        status: 'processing'
      }
    );

    const { page, limit = 10, search = '', grouped } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { jobId: new RegExp(search, 'i') },
        { productName: new RegExp(search, 'i') },
        { modelNumber: new RegExp(search, 'i') }
      ];
    }

    if (page) {
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 10;
      const total = await BuildJob.countDocuments(query);
      const jobs = await BuildJob.find(query)
        .populate('orderedBy', 'name role')
        .populate('machineId')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum);

      const groupedJobs = groupBuildJobsByModelBackend(jobs);

      return res.status(200).json({
        success: true,
        count: jobs.length,
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum) || 1,
        data: grouped === 'true' ? groupedJobs : jobs,
        groupedData: groupedJobs
      });
    }

    const jobs = await BuildJob.find(query)
      .populate('orderedBy', 'name role')
      .populate('machineId')
      .sort({ createdAt: -1 });

    const groupedJobs = groupBuildJobsByModelBackend(jobs);

    if (grouped === 'true') {
      return res.status(200).json({ success: true, count: groupedJobs.length, data: groupedJobs });
    }

    res.status(200).json({ success: true, data: jobs, groupedData: groupedJobs });
  } catch (error) {
    next(error);
  }
};

exports.createBuildJob = async (req, res, next) => {
  try {
    const jobData = {
      ...req.body,
      orderedBy: req.user._id,
      salesPersonName: req.body.salesPersonName || req.user.name,
      orderedRole: req.user.role === 'sales' ? 'sales' : 'store_manager',
      status: req.body.status || 'pending'
    };

    let matchedItem = null;
    if (jobData.inventoryItemId) {
      matchedItem = await InventoryItem.findById(jobData.inventoryItemId);
    }
    if (!matchedItem && jobData.modelNumber) {
      matchedItem = await InventoryItem.findOne({ modelNumber: jobData.modelNumber });
    }
    if (!matchedItem && jobData.productName) {
      matchedItem = await InventoryItem.findOne({ name: jobData.productName });
    }
    if (!jobData.modelNumber && jobData.productName) {
      const extractedModel = jobData.productName.match(/STAR[A-Za-z0-9.]+/)?.[0];
      if (extractedModel) {
        jobData.modelNumber = extractedModel;
        if (!matchedItem) {
          matchedItem = await InventoryItem.findOne({ modelNumber: extractedModel });
        }
      }
    }

    if (!matchedItem && jobData.productName) {
      matchedItem = await InventoryItem.create({
        name: jobData.productName,
        modelNumber: jobData.modelNumber || '',
        type: jobData.itemType || 'finished_good',
        quantity: 0,
        minStock: 100,
        unit: jobData.unit || 'pcs',
        location: 'Unassigned',
        size: jobData.productSize || '',
        radius: jobData.radius || 'N/A',
        designType: jobData.designType || 'OP',
        vs: jobData.vs || 'N/A',
        hs: jobData.hs || 'N/A',
        sr: jobData.sr || 'N/A',
        series: jobData.series || 'N/A',
        description: `Auto-created from build job order`
      });
      broadcastToOrg(req, 'inventory_updated', { action: 'create', item: matchedItem });
    }

    if (matchedItem) {
      jobData.inventoryItemId = matchedItem._id;
      jobData.modelNumber = matchedItem.modelNumber || jobData.modelNumber || '';
      const maintainedQty = Number(matchedItem.minStock || matchedItem.maintainedQuantity || 100);
      const availableQty = Number(matchedItem.quantity || 0);
      const orderQty = Number(jobData.orderQuantity || 0);

      // Shortage calculation directly from Available Stock, Maintained Qty, and Order Quantity:
      const totalDemandWithMinStock = maintainedQty + orderQty;
      const autoShortage = availableQty < totalDemandWithMinStock ? (totalDemandWithMinStock - availableQty) : 0;

      if (autoShortage > 0 && !jobData.shortageLogId) {
        const shortageLog = await ShortageBuySale.create({
          type: 'shortage',
          itemName: matchedItem.name,
          quantity: autoShortage,
          unit: jobData.unit || matchedItem.unit || 'pcs',
          itemType: matchedItem.type || 'finished_good',
          modelNumber: matchedItem.modelNumber || jobData.modelNumber || '',
          size: matchedItem.size || jobData.productSize || '',
          radius: matchedItem.radius || jobData.radius || 'N/A',
          designType: matchedItem.designType || jobData.designType || 'OP',
          vs: matchedItem.vs || jobData.vs || 'N/A',
          hs: matchedItem.hs || jobData.hs || 'N/A',
          sr: matchedItem.sr || jobData.sr || 'N/A',
          assignedTo: 'supervisor',
          status: 'assigned',
          inventoryItemId: matchedItem._id,
          remarks: `Auto shortage generated (Maintained: ${maintainedQty}, Available: ${availableQty}, Order: ${orderQty}, Shortage: ${autoShortage})`
        });
        jobData.shortageLogId = shortageLog._id;
        jobData.status = 'shortage_reported';
      }
    }

    // Check if an active Build Job already exists for this model number
    let existingActiveJob = null;
    if (jobData.modelNumber) {
      existingActiveJob = await BuildJob.findOne({
        modelNumber: jobData.modelNumber,
        status: { $in: ['pending', 'processing', 'shortage_reported', 'assigned', 'delayed'] }
      });
    }

    let job;
    if (existingActiveJob) {
      existingActiveJob.orderQuantity += Number(jobData.orderQuantity || 0);
      if (jobData.salesPersonName) existingActiveJob.salesPersonName = jobData.salesPersonName;
      if (jobData.chainLength) existingActiveJob.chainLength = jobData.chainLength;
      if (jobData.shortageLogId) existingActiveJob.shortageLogId = jobData.shortageLogId;
      if (jobData.status) existingActiveJob.status = jobData.status;
      if (jobData.machineId) existingActiveJob.machineId = jobData.machineId;
      if (jobData.productSize && !existingActiveJob.productSize?.includes(jobData.productSize)) {
        existingActiveJob.productSize = `${existingActiveJob.productSize}, ${jobData.productSize}`;
      }
      job = await existingActiveJob.save();
    } else {
      job = await BuildJob.create(jobData);
    }

    if (req.body.machineId) {
      await Machine.findByIdAndUpdate(req.body.machineId, { status: 'working' });
      broadcastToOrg(req, 'machine_updated', { action: 'update' });
    }

    // Create system notification for supervisor with salesperson details
    const salesperson = job.salesPersonName || req.user.name;
    await createInternalNotification(
      'New Build Order Placed',
      `Product: ${job.productName} (Qty: ${job.orderQuantity}) ordered by Sales Person: ${salesperson}`,
      'order_created',
      req.user.organizationId
    );

    broadcastToOrg(req, 'build_updated', { action: 'create', job });
    broadcastToOrg(req, 'shortage_updated', { action: 'create' });
    broadcastToOrg(req, 'inventory_updated', { action: 'update' });
    broadcastToOrg(req, 'communication_updated', { action: 'create' });
    res.status(201).json({ success: true, data: job });
  } catch (error) {
    next(error);
  }
};

exports.updateBuildJob = async (req, res, next) => {
  try {
    const existingJob = await BuildJob.findById(req.params.id);
    if (!existingJob) return res.status(404).json({ success: false, message: 'Build Job not found' });

    // Handle machine allocation transitions
    if (req.body.status) {
      const newStatus = req.body.status;
      const newMachineId = req.body.machineId;
      const oldMachineId = existingJob.machineId;

      const isNewRunning = ['processing', 'delayed'].includes(newStatus);

      if (isNewRunning) {
        if (newMachineId) {
          if (oldMachineId && oldMachineId.toString() !== newMachineId.toString()) {
            await Machine.findByIdAndUpdate(oldMachineId, { status: 'available' });
          }
          await Machine.findByIdAndUpdate(newMachineId, { status: 'working' });
        } else if (oldMachineId) {
          await Machine.findByIdAndUpdate(oldMachineId, { status: 'working' });
        }
      } else {
        const machineToRelease = newMachineId || oldMachineId;
        if (machineToRelease) {
          await Machine.findByIdAndUpdate(machineToRelease, { status: 'available' });
        }
        if (newStatus === 'completed') {
          req.body.completedAt = Date.now();
        }
      }
    } else if (req.body.machineId) {
      const currentStatus = existingJob.status;
      const isRunning = ['processing', 'delayed'].includes(currentStatus);
      const oldMachineId = existingJob.machineId;
      const newMachineId = req.body.machineId;

      if (oldMachineId && oldMachineId.toString() !== newMachineId.toString()) {
        await Machine.findByIdAndUpdate(oldMachineId, { status: 'available' });
      }

      if (isRunning) {
        await Machine.findByIdAndUpdate(newMachineId, { status: 'working' });
      } else {
        await Machine.findByIdAndUpdate(newMachineId, { status: 'working' });
      }
    }

    const job = await BuildJob.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('orderedBy', 'name role')
      .populate('machineId');

    if (req.body.status === 'shortage_reported') {
      await createInternalNotification(
        'Material Shortage Flagged',
        `Supervisor flagged shortage for Product: ${job.productName}`,
        'system',
        req.user.organizationId
      );
    }

    if (req.body.status === 'completed') {
      await createInternalNotification(
        'Product Built & Dispatched',
        `Supervisor completed build of Product: ${job.productName} and sent to Godown.`,
        'system',
        req.user.organizationId
      );
      // Emit specialized handshake socket event to Store Manager
      broadcastToOrg(req, 'product_sent_to_store', {
        jobId: job._id,
        productName: job.productName,
        productSize: job.productSize || 'Standard',
        quantity: job.orderQuantity
      });

      // Auto update inventory for completed shortage tasks (Strict ID matching)
      if (job.shortageLogId || job.inventoryItemId) {
        let shortage = null;
        if (job.shortageLogId) {
          shortage = await ShortageBuySale.findById(job.shortageLogId);
          if (shortage) {
            shortage.status = 'completed';
            await shortage.save();
          }
        }

        const targetInvId = job.inventoryItemId || shortage?.inventoryItemId;
        let invItem = null;
        if (targetInvId) {
          invItem = await InventoryItem.findById(targetInvId);
        }
        if (!invItem && (job.modelNumber || shortage?.modelNumber)) {
          const mNum = job.modelNumber || shortage?.modelNumber;
          invItem = await InventoryItem.findOne({ modelNumber: mNum });
        }
        if (!invItem && job.productName) {
          invItem = await InventoryItem.findOne({ name: job.productName });
        }

        if (invItem) {
          invItem.productionStatus = 'none';
          invItem.quantity += Number(job.orderQuantity || 0);
          await invItem.save();
          broadcastToOrg(req, 'inventory_updated', { action: 'update', item: invItem });
        }
        broadcastToOrg(req, 'communication_updated', { action: 'update' });
      }
    }

    broadcastToOrg(req, 'build_updated', { action: 'update', job });
    broadcastToOrg(req, 'machine_updated', { action: 'update' });
    res.status(200).json({ success: true, data: job });
  } catch (error) {
    next(error);
  }
};

exports.sendToStore = async (req, res, next) => {
  try {
    const job = await BuildJob.findById(req.params.id).populate('orderedBy', 'name role').populate('machineId');
    if (!job) return res.status(404).json({ success: false, message: 'Build Job not found' });

    job.status = 'completed';
    job.completedAt = Date.now();
    await job.save();

    const machineIdToRelease = job.machineId?._id || job.machineId;
    if (machineIdToRelease) {
      const Machine = require('../models/Machine');
      await Machine.findByIdAndUpdate(machineIdToRelease, { status: 'available' });
    }

    await createInternalNotification(
      'Product Built & Dispatched',
      `Supervisor completed build of Product: ${job.productName} and sent to Godown.`,
      'system',
      req.user.organizationId
    );

    // Emit specialized handshake socket event to Store Manager
    broadcastToOrg(req, 'product_sent_to_store', {
      jobId: job._id,
      productName: job.productName,
      productSize: job.productSize || 'Standard',
      quantity: job.orderQuantity
    });

    // Auto update inventory & complete shortage task upon Send to Store
    const ShortageBuySale = require('../models/ShortageBuySale');
    const InventoryItem = require('../models/InventoryItem');

    let shortage = null;
    if (job.shortageLogId) {
      shortage = await ShortageBuySale.findById(job.shortageLogId);
      if (shortage) {
        shortage.status = 'completed';
        await shortage.save();
      }
    }

    const targetInvId = job.inventoryItemId || shortage?.inventoryItemId;
    let invItem = null;
    if (targetInvId) {
      invItem = await InventoryItem.findById(targetInvId);
    }
    if (!invItem && (job.modelNumber || shortage?.modelNumber)) {
      const mNum = job.modelNumber || shortage?.modelNumber;
      invItem = await InventoryItem.findOne({ modelNumber: mNum });
    }
    if (!invItem && job.productName) {
      invItem = await InventoryItem.findOne({ name: job.productName });
    }

    if (invItem) {
      invItem.productionStatus = 'none';
      invItem.quantity += Number(job.orderQuantity || 0);
      await invItem.save();
      broadcastToOrg(req, 'inventory_updated', { action: 'update', item: invItem });
    }
    broadcastToOrg(req, 'communication_updated', { action: 'update' });

    broadcastToOrg(req, 'build_updated', { action: 'update', job });
    res.status(200).json({ success: true, data: job });
  } catch (error) {
    next(error);
  }
};

exports.receiveBuildProduct = async (req, res, next) => {
  try {
    const { accepted, rackLocation } = req.body;
    const job = await BuildJob.findById(req.params.id).populate('orderedBy', 'name role');
    if (!job) return res.status(404).json({ success: false, message: 'Build Job not found' });

    if (accepted) {
      job.status = 'received';
      await job.save();

      // Automatically add to unified inventory
      let inventoryItem = null;
      if (job.inventoryItemId) {
        inventoryItem = await InventoryItem.findById(job.inventoryItemId);
      }
      if (!inventoryItem && job.modelNumber) {
        inventoryItem = await InventoryItem.findOne({ modelNumber: job.modelNumber });
      }
      if (!inventoryItem && job.productName) {
        inventoryItem = await InventoryItem.findOne({
          name: job.productName,
          size: job.productSize || 'Standard'
        });
      }

      if (inventoryItem) {
        inventoryItem.quantity += Number(job.orderQuantity || 0);
        inventoryItem.productionStatus = 'none';
        if (rackLocation) inventoryItem.location = rackLocation;
        await inventoryItem.save();
      } else {
        inventoryItem = await InventoryItem.create({
          name: job.productName,
          modelNumber: job.modelNumber || '',
          type: 'finished_good',
          quantity: Number(job.orderQuantity || 0),
          unit: job.unit || 'pcs',
          location: rackLocation || 'Unassigned',
          size: job.productSize || 'Standard',
          description: `Automatically created via production build job ${job._id}`
        });
      }

      await createInternalNotification(
        'Product Handshake Completed',
        `Store Manager approved and stocked: ${job.productName} (Qty: ${job.orderQuantity})`,
        'system',
        req.user.organizationId
      );

      broadcastToOrg(req, 'inventory_updated', { action: 'create', item: inventoryItem });
    } else {
      job.status = 'declined';
      await job.save();

      await createInternalNotification(
        'Product Handshake Rejected',
        `Store Manager rejected dispatch of Product: ${job.productName}`,
        'system',
        req.user.organizationId
      );
    }

    broadcastToOrg(req, 'build_updated', { action: 'update', job });

    res.status(200).json({ success: true, message: `Product handshake processed: ${job.status}`, data: job });
  } catch (error) {
    next(error);
  }
};

exports.deleteBuildJob = async (req, res, next) => {
  try {
    const Machine = require('../models/Machine');
    const job = await BuildJob.findByIdAndDelete(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Build job not found' });

    if (job.machineId) {
      await Machine.findByIdAndUpdate(job.machineId, { status: 'available' });
      broadcastToOrg(req, 'machine_updated', { action: 'update' });
    }

    broadcastToOrg(req, 'build_updated', { action: 'delete', jobId: req.params.id });
    broadcastToOrg(req, 'inventory_updated', { action: 'update' });
    res.status(200).json({ success: true, message: 'Build job deleted' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// QUALITY CONTROL LOGS & INVOICES
// ==========================================

exports.getQualityLogs = async (req, res, next) => {
  try {
    const { page, limit = 10, search = '' } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { logId: new RegExp(search, 'i') },
        { itemName: new RegExp(search, 'i') },
        { materialName: new RegExp(search, 'i') }
      ];
    }

    if (page) {
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 10;
      const total = await QualityLog.countDocuments(query);
      const logs = await QualityLog.find(query)
        .populate('verifiedBy', 'name role')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum);

      return res.status(200).json({
        success: true,
        count: logs.length,
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum) || 1,
        data: logs
      });
    }

    const logs = await QualityLog.find(query).populate('verifiedBy', 'name role').sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
};

exports.createQualityLog = async (req, res, next) => {
  try {
    const logData = { ...req.body };
    if (req.file) {
      logData.invoiceUrl = `/uploads/${req.file.filename}`;
    }
    const log = await QualityLog.create(logData);

    await createInternalNotification(
      'QC/Invoice Document Uploaded',
      `Quality Checker uploaded raw document for: ${log.materialName} (${log.qcType})`,
      'user_added', // generic icon
      req.user.organizationId
    );

    broadcastToOrg(req, 'quality_updated', { action: 'create', log });
    res.status(201).json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
};

exports.verifyQualityLog = async (req, res, next) => {
  try {
    const log = await QualityLog.findById(req.params.id);
    if (!log) return res.status(404).json({ success: false, message: 'Log not found' });

    log.status = 'verified';
    log.verifiedBy = req.user._id;
    await log.save();

    // Deduct damaged products from inventory or add inspected items
    if (log.qcType === 'inspected') {
      let invItem = await InventoryItem.findOne({ name: log.materialName, type: 'raw_material' });
      if (invItem) {
        invItem.quantity += log.quantity;
        await invItem.save();
        broadcastToOrg(req, 'inventory_updated', { action: 'update', item: invItem });
      } else {
        invItem = await InventoryItem.create({
          name: log.materialName,
          type: 'raw_material',
          quantity: log.quantity,
          unit: log.unit || 'kg',
          location: 'Unassigned',
          description: `Auto-stocked from verified QC Log ID ${log._id}`
        });
        broadcastToOrg(req, 'inventory_updated', { action: 'create', item: invItem });
      }
    } else if (log.qcType === 'damaged') {
      // If it's a damaged item, we could deduct from inventory
      let invItem = await InventoryItem.findOne({ name: log.materialName });
      if (invItem && invItem.quantity >= log.quantity) {
        invItem.quantity -= log.quantity;
        await invItem.save();
        broadcastToOrg(req, 'inventory_updated', { action: 'update', item: invItem });
      }
    }

    await createInternalNotification(
      'QC Document Verified',
      `Invoice/QC verified by ${req.user.name} for: ${log.materialName}`,
      'system',
      req.user.organizationId
    );

    broadcastToOrg(req, 'quality_updated', { action: 'update', log });
    res.status(200).json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
};

exports.updateQualityLog = async (req, res, next) => {
  try {
    const logData = { ...req.body };
    if (req.file) {
      logData.invoiceUrl = `/uploads/${req.file.filename}`;
    }
    const log = await QualityLog.findByIdAndUpdate(req.params.id, logData, { new: true, runValidators: true });
    if (!log) return res.status(404).json({ success: false, message: 'Log not found' });
    broadcastToOrg(req, 'quality_updated', { action: 'update', log });
    res.status(200).json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
};

exports.deleteQualityLog = async (req, res, next) => {
  try {
    const log = await QualityLog.findByIdAndDelete(req.params.id);
    if (!log) return res.status(404).json({ success: false, message: 'Log not found' });
    broadcastToOrg(req, 'quality_updated', { action: 'delete', logId: req.params.id });
    res.status(200).json({ success: true, message: 'Log deleted' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// SHORTAGE, BUY, SALES COMMUNICATION LOGS
// ==========================================

exports.getShortageBuySales = async (req, res, next) => {
  try {
    const { page, limit = 10, search = '' } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { itemName: new RegExp(search, 'i') },
        { assignedTo: new RegExp(search, 'i') },
        { remarks: new RegExp(search, 'i') }
      ];
    }

    if (page) {
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 10;
      const total = await ShortageBuySale.countDocuments(query);
      const items = await ShortageBuySale.find(query)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum);

      return res.status(200).json({
        success: true,
        count: items.length,
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum) || 1,
        data: items
      });
    }

    const items = await ShortageBuySale.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

exports.createShortageBuySale = async (req, res, next) => {
  try {
    const payload = { ...req.body };
    const InventoryItem = require('../models/InventoryItem');

    let matchedItem = null;
    if (payload.inventoryItemId) {
      matchedItem = await InventoryItem.findById(payload.inventoryItemId);
    } else if (payload.modelNumber) {
      matchedItem = await InventoryItem.findOne({ modelNumber: payload.modelNumber });
    } else if (payload.itemName) {
      matchedItem = await InventoryItem.findOne({ name: payload.itemName });
    }

    if (!matchedItem && payload.itemName) {
      matchedItem = await InventoryItem.create({
        name: payload.itemName,
        modelNumber: payload.modelNumber || '',
        type: payload.itemType || 'raw_material',
        quantity: 0,
        minStock: 100,
        unit: payload.unit || 'pcs',
        location: 'Unassigned',
        size: payload.size || '',
        radius: payload.radius || 'N/A',
        designType: payload.designType || 'OP',
        vs: payload.vs || 'N/A',
        hs: payload.hs || 'N/A',
        sr: payload.sr || 'N/A',
        description: 'Auto-created from shortage log entry'
      });
      broadcastToOrg(req, 'inventory_updated', { action: 'create', item: matchedItem });
    }

    if (matchedItem) {
      payload.inventoryItemId = matchedItem._id;
      payload.modelNumber = matchedItem.modelNumber || payload.modelNumber || '';
    }

    const item = await ShortageBuySale.create(payload);

    await createInternalNotification(
      `New ${item.type.toUpperCase()} Logged`,
      `Store Manager created communication record: ${item.itemName} (${item.quantity} ${item.unit})`,
      'system',
      req.user.organizationId
    );

    broadcastToOrg(req, 'communication_updated', { action: 'create', item });
    broadcastToOrg(req, 'inventory_updated', { action: 'update' });
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

exports.updateShortageBuySale = async (req, res, next) => {
  try {
    const item = await ShortageBuySale.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ success: false, message: 'Log entry not found' });

    if (req.body.status === 'completed') {
      const InventoryItem = require('../models/InventoryItem');
      let invItem = null;
      if (item.inventoryItemId) {
        invItem = await InventoryItem.findById(item.inventoryItemId);
      }
      if (!invItem && item.itemName) {
        invItem = await InventoryItem.findOne({ name: item.itemName });
      }
      if (invItem) {
        invItem.quantity += (item.quantity || 0);
        await invItem.save();
        broadcastToOrg(req, 'inventory_updated', { action: 'update', item: invItem });
      }
    }

    if (req.body.assignedTo && req.body.assignedTo !== 'unassigned') {
      await createInternalNotification(
        'Task Assignment Dispatched',
        `Item: ${item.itemName} has been assigned to ${req.body.assignedTo} in real-time.`,
        'system',
        req.user.organizationId
      );
    }

    broadcastToOrg(req, 'communication_updated', { action: 'update', item });
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

exports.deleteShortageBuySale = async (req, res, next) => {
  try {
    const item = await ShortageBuySale.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Log entry not found' });
    broadcastToOrg(req, 'communication_updated', { action: 'delete', itemId: req.params.id });
    res.status(200).json({ success: true, message: 'Log entry deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.getProductTemplates = async (req, res, next) => {
  try {
    let templates = await ProductTemplate.find().sort({ modelNumber: 1 });
    const defaultTemplates = [
      { modelNumber: 'S 10', name: 'Drag Chain S 10', pitch: 16, numberOfLinks: '63', linksPerMeter: '63', lengthPerMeter: 1008, ratePerMeter: 450, innerSize: '15', radius: 'R28', chainType: 'OP', type: 'finished_good' },
      { modelNumber: 'S 15', name: 'Drag Chain S 15', pitch: 24, numberOfLinks: '42', linksPerMeter: '42', lengthPerMeter: 1008, ratePerMeter: 650, innerSize: '20', radius: 'R38', chainType: 'OP', type: 'finished_good' },
      { modelNumber: 'S 20', name: 'Drag Chain S 20', pitch: 35, numberOfLinks: '29', linksPerMeter: '29', lengthPerMeter: 1015, ratePerMeter: 850, innerSize: '25', radius: 'R50', chainType: 'OP', type: 'finished_good' },
      { modelNumber: 'S-21.1', name: 'Drag Chain S-21.1', pitch: 33, numberOfLinks: '31', linksPerMeter: '31', lengthPerMeter: 1023, ratePerMeter: 900, innerSize: '30', radius: 'R50', chainType: 'OP', type: 'finished_good' },
      { modelNumber: 'S-25.1', name: 'Drag Chain S-25.1', pitch: 46, numberOfLinks: '22', linksPerMeter: '22', lengthPerMeter: 1012, ratePerMeter: 1200, innerSize: '50', radius: 'R75', chainType: 'OP', type: 'finished_good' },
      { modelNumber: 'S-29.1', name: 'Drag Chain S-29.1', pitch: 22, numberOfLinks: '46', linksPerMeter: '46', lengthPerMeter: 1012, ratePerMeter: 1350, innerSize: '60', radius: 'R75', chainType: 'OP', type: 'finished_good' },
      { modelNumber: 'S-35.1', name: 'Drag Chain S-35.1', pitch: 25, numberOfLinks: '40', linksPerMeter: '40', lengthPerMeter: 1000, ratePerMeter: 1500, innerSize: '75', radius: 'R100', chainType: 'OP', type: 'finished_good' },
      { modelNumber: 'S-35.2', name: 'Drag Chain S-35.2', pitch: 56, numberOfLinks: '18', linksPerMeter: '18', lengthPerMeter: 1008, ratePerMeter: 1650, innerSize: '75', radius: 'R100', chainType: 'OP', type: 'finished_good' },
      { modelNumber: 'S-42.1', name: 'Drag Chain S-42.1', pitch: 67, numberOfLinks: '15', linksPerMeter: '15', lengthPerMeter: 1005, ratePerMeter: 1950, innerSize: '90', radius: 'R125', chainType: 'OP', type: 'finished_good' },
      { modelNumber: 'S-45.1', name: 'Drag Chain S-45.1', pitch: 67, numberOfLinks: '15', linksPerMeter: '15', lengthPerMeter: 1005, ratePerMeter: 2200, innerSize: '100', radius: 'R125', chainType: 'OP', type: 'finished_good' },
      { modelNumber: 'S-56.1', name: 'Drag Chain S-56.1', pitch: 91, numberOfLinks: '12', linksPerMeter: '12', lengthPerMeter: 1092, ratePerMeter: 2700, innerSize: '110', radius: 'R150', chainType: 'OP', type: 'finished_good' },
      { modelNumber: 'S-60', name: 'Drag Chain S-60', pitch: 95, numberOfLinks: '11', linksPerMeter: '11', lengthPerMeter: 1045, ratePerMeter: 3100, innerSize: '125', radius: 'R150', chainType: 'OP', type: 'finished_good' },
      { modelNumber: 'S-80.1', name: 'Drag Chain S-80.1', pitch: 112, numberOfLinks: '9', linksPerMeter: '9', lengthPerMeter: 1008, ratePerMeter: 4200, innerSize: '150', radius: 'R200', chainType: 'OP', type: 'finished_good' }
    ];

    if (templates.length === 0) {
      templates = await ProductTemplate.insertMany(defaultTemplates);
    } else {
      const existing = new Set(templates.map(t => (t.modelNumber || '').toUpperCase().replace(/[\s-_]/g, '')));
      const missing = defaultTemplates.filter(d => !existing.has(d.modelNumber.toUpperCase().replace(/[\s-_]/g, '')));
      if (missing.length > 0) {
        await ProductTemplate.insertMany(missing);
        templates = await ProductTemplate.find().sort({ modelNumber: 1 });
      }
    }
    res.status(200).json({ success: true, count: templates.length, data: templates });
  } catch (error) {
    next(error);
  }
};

exports.createProductTemplate = async (req, res, next) => {
  try {
    const template = await ProductTemplate.create(req.body);
    broadcastToOrg(req, 'product_templates_updated', { action: 'create', template });
    res.status(201).json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
};

exports.updateProductTemplate = async (req, res, next) => {
  try {
    const template = await ProductTemplate.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    broadcastToOrg(req, 'product_templates_updated', { action: 'update', template });
    res.status(200).json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
};

exports.deleteProductTemplate = async (req, res, next) => {
  try {
    const template = await ProductTemplate.findByIdAndDelete(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    broadcastToOrg(req, 'product_templates_updated', { action: 'delete', id: req.params.id });
    res.status(200).json({ success: true, message: 'Template deleted' });
  } catch (error) {
    next(error);
  }
};

// Send a ProductTemplate entry directly to store InventoryItem
exports.sendTemplateToInventory = async (req, res, next) => {
  try {
    const template = await ProductTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });

    const { quantity = 1, unitPrice = 0 } = req.body;

    // Build the merged product name like the rest of the system
    const parts = [template.modelNumber];
    if (template.innerSize) parts.push(template.innerSize);
    if (template.radius) parts.push(template.radius);
    if (template.designType && template.designType !== 'N/A') parts.push(template.designType);

    const itemName = parts.join(' | ');

    const inventoryData = {
      name: itemName,
      type: template.type || 'finished_good',
      quantity: Number(quantity),
      unit: template.unit || 'pcs',
      unitPrice: Number(unitPrice),
      modelNumber: template.modelNumber,
      size: template.innerSize || '',
      description: template.outerSize ? `Outer: ${template.outerSize}` : '',
      radius: template.radius || 'N/A',
      designType: template.designType || 'N/A',
      vs: template.vs || 'N/A',
      hs: template.hs || 'N/A',
      sr: template.sr || 'N/A',
      series: template.series || 'N/A',
      rack: template.rackShelfCatalog || template.rack || 'Unassigned',
      almirah: template.almirahCatalog || 'N/A',
      warehouseLocation: template.warehouseLocation || 'N/A',
      qualityStatus: 'pending',
      storeRemarks: `Auto-added from Universal Model Info by ${req.user?.name || 'Admin'}`
    };

    const item = await InventoryItem.create(inventoryData);
    broadcastToOrg(req, 'inventory_updated', { action: 'create', item });
    res.status(201).json({ success: true, data: item, message: 'Successfully sent to Store Inventory' });
  } catch (error) {
    next(error);
  }
};
