const XLSX = require('xlsx');
const GateEntry = require('../models/GateEntry');
const BuildJob = require('../models/BuildJob');
const QualityLog = require('../models/QualityLog');
const InventoryItem = require('../models/InventoryItem');
const Order = require('../models/Order');
const Organization = require('../models/Organization');

// Helper to construct Date filter query
const buildDateFilter = (dateMode, singleDate, startDate, endDate) => {
  const filter = {};
  if (dateMode === 'single' && singleDate) {
    const start = new Date(singleDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(singleDate);
    end.setHours(23, 59, 59, 999);
    filter.$gte = start;
    filter.$lte = end;
  } else if (dateMode === 'range' && (startDate || endDate)) {
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      filter.$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.$lte = end;
    }
  }
  return Object.keys(filter).length > 0 ? filter : null;
};

// Helper to format date string
const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

// @desc    Get Paginated Report Data across roles
// @route   GET /api/reports/data
// @access  Private
exports.getReportData = async (req, res, next) => {
  try {
    const {
      dateMode = 'single',
      singleDate,
      startDate,
      endDate,
      targetRole = 'all',
      targetOrgId,
      page = 1,
      limit = 20,
      search = ''
    } = req.query;

    let orgId = req.user.organizationId;
    if (req.user.role === 'super_admin') {
      if (targetOrgId && targetOrgId !== 'all') {
        orgId = targetOrgId;
      } else if (targetOrgId === 'all') {
        orgId = null; // Query all orgs for Platform Admin
      }
    }

    const dateFilter = buildDateFilter(dateMode, singleDate, startDate, endDate);
    const userRole = req.user.role;

    // Determine allowed roles to query based on user's role
    let activeRoleFilter = targetRole;
    if (!['super_admin', 'admin'].includes(userRole)) {
      // Non-admins can only see their own department's report
      activeRoleFilter = userRole;
    }

    let reports = [];
    let totalCount = 0;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;

    // 1. GATE GUARD / GATE OPERATIONS
    if (['all', 'gate_guard'].includes(activeRoleFilter)) {
      const query = {};
      if (orgId) query.organizationId = orgId;
      if (dateFilter) query.createdAt = dateFilter;
      if (search) {
        query.$or = [
          { vehicleNumber: new RegExp(search, 'i') },
          { driverName: new RegExp(search, 'i') },
          { materialName: new RegExp(search, 'i') },
          { gatePassNumber: new RegExp(search, 'i') }
        ];
      }

      const count = await GateEntry.countDocuments(query);
      const entries = await GateEntry.find(query)
        .sort({ createdAt: -1 })
        .limit(activeRoleFilter === 'gate_guard' ? limitNum : 10)
        .skip(activeRoleFilter === 'gate_guard' ? (pageNum - 1) * limitNum : 0)
        .populate('organizationId', 'name country currencySymbol');

      entries.forEach(e => {
        reports.push({
          id: e._id,
          module: 'Gate Operations',
          refNo: e.gatePassNumber || `GATE-${e._id.toString().substr(-6).toUpperCase()}`,
          title: `Vehicle: ${e.vehicleNumber || 'N/A'}`,
          subtitle: `Driver: ${e.driverName || 'N/A'} | Transporter: ${e.transporterName || 'N/A'}`,
          detail: `Material: ${e.materialName || 'N/A'} (${e.quantity || 0} ${e.unit || 'pcs'})`,
          status: e.status || 'Entry Granted',
          organizationName: e.organizationId?.name || 'Main Factory',
          currencySymbol: e.organizationId?.currencySymbol || '₹',
          amount: 0,
          date: e.entryTime || e.createdAt,
          createdAt: e.createdAt
        });
      });
      totalCount += count;
    }

    // 2. SUPERVISOR / PRODUCTION
    if (['all', 'supervisor', 'production_manager'].includes(activeRoleFilter)) {
      const query = {};
      if (orgId) query.organizationId = orgId;
      if (dateFilter) query.createdAt = dateFilter;
      if (search) {
        query.$or = [
          { jobId: new RegExp(search, 'i') },
          { productName: new RegExp(search, 'i') },
          { modelNumber: new RegExp(search, 'i') }
        ];
      }

      const count = await BuildJob.countDocuments(query);
      const jobs = await BuildJob.find(query)
        .sort({ createdAt: -1 })
        .limit(['supervisor', 'production_manager'].includes(activeRoleFilter) ? limitNum : 10)
        .skip(['supervisor', 'production_manager'].includes(activeRoleFilter) ? (pageNum - 1) * limitNum : 0)
        .populate('organizationId', 'name country currencySymbol');

      jobs.forEach(j => {
        reports.push({
          id: j._id,
          module: 'Production Management',
          refNo: j.jobId || `JOB-${j._id.toString().substr(-6).toUpperCase()}`,
          title: `Model: ${j.modelNumber || j.productName || 'N/A'}`,
          subtitle: `Target Qty: ${j.targetQuantity || 0} | Completed: ${j.completedQuantity || 0}`,
          detail: `Operator: ${j.assignedOperator || 'Unassigned'} | Machine: ${j.machineName || 'Line 1'}`,
          status: j.status || 'In Progress',
          organizationName: j.organizationId?.name || 'Main Factory',
          currencySymbol: j.organizationId?.currencySymbol || '₹',
          amount: 0,
          date: j.createdAt,
          createdAt: j.createdAt
        });
      });
      totalCount += count;
    }

    // 3. QUALITY CHECKER
    if (['all', 'quality_checker'].includes(activeRoleFilter)) {
      const query = {};
      if (orgId) query.organizationId = orgId;
      if (dateFilter) query.createdAt = dateFilter;
      if (search) {
        query.$or = [
          { logId: new RegExp(search, 'i') },
          { itemName: new RegExp(search, 'i') }
        ];
      }

      const count = await QualityLog.countDocuments(query);
      const logs = await QualityLog.find(query)
        .sort({ createdAt: -1 })
        .limit(activeRoleFilter === 'quality_checker' ? limitNum : 10)
        .skip(activeRoleFilter === 'quality_checker' ? (pageNum - 1) * limitNum : 0)
        .populate('organizationId', 'name country currencySymbol');

      logs.forEach(q => {
        reports.push({
          id: q._id,
          module: 'Quality Control',
          refNo: q.logId || `QC-${q._id.toString().substr(-6).toUpperCase()}`,
          title: `Item: ${q.itemName || 'N/A'}`,
          subtitle: `Passed: ${q.passedQuantity || q.quantityApproved || 0} | Rejected: ${q.rejectedQuantity || q.quantityRejected || 0}`,
          detail: `Inspector: ${q.inspectorName || 'QA Officer'} | Remarks: ${q.remarks || 'None'}`,
          status: q.status || 'Verified',
          organizationName: q.organizationId?.name || 'Main Factory',
          currencySymbol: q.organizationId?.currencySymbol || '₹',
          amount: 0,
          date: q.createdAt,
          createdAt: q.createdAt
        });
      });
      totalCount += count;
    }

    // 4. STORE MANAGER / INVENTORY
    if (['all', 'store_manager', 'dispatch'].includes(activeRoleFilter)) {
      const query = {};
      if (orgId) query.organizationId = orgId;
      if (dateFilter) query.createdAt = dateFilter;
      if (search) {
        query.$or = [
          { name: new RegExp(search, 'i') },
          { modelNumber: new RegExp(search, 'i') },
          { warehouseLocation: new RegExp(search, 'i') }
        ];
      }

      const count = await InventoryItem.countDocuments(query);
      const items = await InventoryItem.find(query)
        .sort({ createdAt: -1 })
        .limit(['store_manager', 'dispatch'].includes(activeRoleFilter) ? limitNum : 10)
        .skip(['store_manager', 'dispatch'].includes(activeRoleFilter) ? (pageNum - 1) * limitNum : 0)
        .populate('organizationId', 'name country currencySymbol');

      items.forEach(inv => {
        const itemVal = (inv.quantity || 0) * (inv.unitPrice || 0);
        reports.push({
          id: inv._id,
          module: 'Store & Inventory',
          refNo: inv.modelNumber || `SKU-${inv._id.toString().substr(-6).toUpperCase()}`,
          title: `Item: ${inv.name}`,
          subtitle: `Qty: ${inv.quantity || 0} ${inv.unit || 'pcs'} @ ${inv.organizationId?.currencySymbol || '₹'}${inv.unitPrice || 0}/pc`,
          detail: `Location: ${inv.warehouseLocation || 'Alemira Warehouse'} | Size: ${inv.innerSize || 'N/A'}`,
          status: inv.quantity > 10 ? 'In Stock' : inv.quantity > 0 ? 'Low Stock' : 'Out of Stock',
          organizationName: inv.organizationId?.name || 'Main Factory',
          currencySymbol: inv.organizationId?.currencySymbol || '₹',
          amount: itemVal,
          date: inv.createdAt,
          createdAt: inv.createdAt
        });
      });
      totalCount += count;
    }

    // 5. SALES OFFICER
    if (['all', 'sales'].includes(activeRoleFilter)) {
      const query = {};
      if (orgId) query.organizationId = orgId;
      if (dateFilter) query.createdAt = dateFilter;
      if (search) {
        query.$or = [
          { orderNumber: new RegExp(search, 'i') },
          { customerName: new RegExp(search, 'i') },
          { clientName: new RegExp(search, 'i') }
        ];
      }

      const count = await Order.countDocuments(query);
      const orders = await Order.find(query)
        .sort({ createdAt: -1 })
        .limit(activeRoleFilter === 'sales' ? limitNum : 10)
        .skip(activeRoleFilter === 'sales' ? (pageNum - 1) * limitNum : 0)
        .populate('organizationId', 'name country currencySymbol');

      orders.forEach(o => {
        reports.push({
          id: o._id,
          module: 'Sales & Orders',
          refNo: o.orderNumber || `SO-${o._id.toString().substr(-6).toUpperCase()}`,
          title: `Client: ${o.customerName || o.clientName || 'N/A'}`,
          subtitle: `Items: ${o.items ? o.items.length : 1} products`,
          detail: `Payment Status: ${o.paymentStatus || 'Pending'} | Total Amount: ${o.organizationId?.currencySymbol || '₹'}${o.totalAmount || 0}`,
          status: o.status || 'Order Confirmed',
          organizationName: o.organizationId?.name || 'Main Factory',
          currencySymbol: o.organizationId?.currencySymbol || '₹',
          amount: o.totalAmount || 0,
          date: o.orderDate || o.createdAt,
          createdAt: o.createdAt
        });
      });
      totalCount += count;
    }

    // Sort combined reports by date desc
    reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / limitNum) || 1;

    res.status(200).json({
      success: true,
      count: reports.length,
      totalCount,
      totalPages,
      currentPage: pageNum,
      data: reports
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export Professional Formatted Report to Excel (.xlsx)
// @route   GET /api/reports/export-xlsx
// @access  Private
exports.exportReportXLSX = async (req, res, next) => {
  try {
    const {
      dateMode = 'single',
      singleDate,
      startDate,
      endDate,
      targetRole = 'all',
      targetOrgId
    } = req.query;

    let orgId = req.user.organizationId;
    let orgName = 'TrackBells ERP Factory Automation';
    let currencySymbol = '₹';

    if (req.user.role === 'super_admin') {
      if (targetOrgId && targetOrgId !== 'all') {
        orgId = targetOrgId;
      } else if (targetOrgId === 'all') {
        orgId = null;
        orgName = 'All Platform Organizations (Global Master Report)';
      }
    }

    if (orgId) {
      const org = await Organization.findById(orgId);
      if (org) {
        orgName = org.name;
        currencySymbol = org.currencySymbol || '₹';
      }
    }

    const dateFilter = buildDateFilter(dateMode, singleDate, startDate, endDate);
    const userRole = req.user.role;

    let activeRoleFilter = targetRole;
    if (!['super_admin', 'admin'].includes(userRole)) {
      activeRoleFilter = userRole;
    }

    const dateScopeText = dateMode === 'single'
      ? `Single Date: ${singleDate || new Date().toISOString().split('T')[0]}`
      : `Date Range: ${startDate || 'Beginning'} to ${endDate || 'Present'}`;

    const wb = XLSX.utils.book_new();

    // Create Summary / Header rows
    const summaryRows = [
      ['OFFICIAL SYSTEM OPERATIONAL REPORT'],
      ['Organization / Factory:', orgName],
      ['Report Date Scope:', dateScopeText],
      ['Generated By Role:', req.user.role.toUpperCase()],
      ['Export Timestamp:', formatDate(new Date())],
      [] // Blank line
    ];

    // Helper to format role data into clean sheet rows
    const buildSheetData = async () => {
      const sheetRows = [...summaryRows];

      // 1. GATE GUARD REPORT
      if (['all', 'gate_guard'].includes(activeRoleFilter)) {
        const query = {};
        if (orgId) query.organizationId = orgId;
        if (dateFilter) query.createdAt = dateFilter;

        const entries = await GateEntry.find(query).sort({ createdAt: -1 }).populate('organizationId', 'name currencySymbol');

        sheetRows.push(['=== 1. GATE OPERATIONS & VEHICLE LOGS ===']);
        sheetRows.push(['Gate Pass No', 'Entry Date & Time', 'Vehicle Number', 'Driver Name', 'Transporter', 'Material Name', 'Quantity', 'Status', 'Organization']);

        if (entries.length === 0) {
          sheetRows.push(['No gate entry records found for this period']);
        } else {
          entries.forEach(e => {
            sheetRows.push([
              e.gatePassNumber || `GATE-${e._id.toString().substr(-6).toUpperCase()}`,
              formatDate(e.entryTime || e.createdAt),
              e.vehicleNumber || 'N/A',
              e.driverName || 'N/A',
              e.transporterName || 'N/A',
              e.materialName || 'N/A',
              `${e.quantity || 0} ${e.unit || 'pcs'}`,
              e.status || 'Granted',
              e.organizationId?.name || orgName
            ]);
          });
        }
        sheetRows.push([]); // Empty row
      }

      // 2. PRODUCTION MANAGEMENT REPORT
      if (['all', 'supervisor', 'production_manager'].includes(activeRoleFilter)) {
        const query = {};
        if (orgId) query.organizationId = orgId;
        if (dateFilter) query.createdAt = dateFilter;

        const jobs = await BuildJob.find(query).sort({ createdAt: -1 }).populate('organizationId', 'name currencySymbol');

        sheetRows.push(['=== 2. PRODUCTION MANAGEMENT & BUILD JOBS ===']);
        sheetRows.push(['Job ID', 'Date Created', 'Product / Model No', 'Target Qty', 'Completed Qty', 'Assigned Operator', 'Machine Line', 'Status', 'Organization']);

        if (jobs.length === 0) {
          sheetRows.push(['No production build jobs found for this period']);
        } else {
          jobs.forEach(j => {
            sheetRows.push([
              j.jobId || `JOB-${j._id.toString().substr(-6).toUpperCase()}`,
              formatDate(j.createdAt),
              j.modelNumber || j.productName || 'N/A',
              j.targetQuantity || 0,
              j.completedQuantity || 0,
              j.assignedOperator || 'N/A',
              j.machineName || 'Line 1',
              j.status || 'In Progress',
              j.organizationId?.name || orgName
            ]);
          });
        }
        sheetRows.push([]);
      }

      // 3. QUALITY CONTROL REPORT
      if (['all', 'quality_checker'].includes(activeRoleFilter)) {
        const query = {};
        if (orgId) query.organizationId = orgId;
        if (dateFilter) query.createdAt = dateFilter;

        const logs = await QualityLog.find(query).sort({ createdAt: -1 }).populate('organizationId', 'name currencySymbol');

        sheetRows.push(['=== 3. QUALITY CONTROL & VERIFICATION LOGS ===']);
        sheetRows.push(['Log ID', 'Inspection Date', 'Item Name', 'Approved Qty', 'Rejected Qty', 'Inspector Name', 'Remarks / Reason', 'Status', 'Organization']);

        if (logs.length === 0) {
          sheetRows.push(['No quality inspection records found for this period']);
        } else {
          logs.forEach(q => {
            sheetRows.push([
              q.logId || `QC-${q._id.toString().substr(-6).toUpperCase()}`,
              formatDate(q.createdAt),
              q.itemName || 'N/A',
              q.passedQuantity || q.quantityApproved || 0,
              q.rejectedQuantity || q.quantityRejected || 0,
              q.inspectorName || 'QA Officer',
              q.remarks || 'Verified OK',
              q.status || 'Verified',
              q.organizationId?.name || orgName
            ]);
          });
        }
        sheetRows.push([]);
      }

      // 4. STORE & INVENTORY REPORT
      if (['all', 'store_manager', 'dispatch'].includes(activeRoleFilter)) {
        const query = {};
        if (orgId) query.organizationId = orgId;
        if (dateFilter) query.createdAt = dateFilter;

        const items = await InventoryItem.find(query).sort({ createdAt: -1 }).populate('organizationId', 'name currencySymbol');

        sheetRows.push(['=== 4. STORE GODOWN & UNIFIED INVENTORY REPORT ===']);
        sheetRows.push(['Model Number / SKU', 'Date Added', 'Item Name', 'Warehouse Location', 'Inner Size', 'Outer Size', 'Quantity Stock', 'Unit Price', 'Total Stock Value', 'Organization']);

        if (items.length === 0) {
          sheetRows.push(['No store inventory records found for this period']);
        } else {
          items.forEach(inv => {
            const symbol = inv.organizationId?.currencySymbol || currencySymbol;
            const totalVal = (inv.quantity || 0) * (inv.unitPrice || 0);
            sheetRows.push([
              inv.modelNumber || `SKU-${inv._id.toString().substr(-6).toUpperCase()}`,
              formatDate(inv.createdAt),
              inv.name || 'N/A',
              inv.warehouseLocation || 'Alemira Warehouse',
              inv.innerSize || 'N/A',
              inv.outerSize || 'N/A',
              inv.quantity || 0,
              `${symbol}${inv.unitPrice || 0}`,
              `${symbol}${totalVal.toLocaleString('en-US')}`,
              inv.organizationId?.name || orgName
            ]);
          });
        }
        sheetRows.push([]);
      }

      // 5. SALES & ORDERS REPORT
      if (['all', 'sales'].includes(activeRoleFilter)) {
        const query = {};
        if (orgId) query.organizationId = orgId;
        if (dateFilter) query.createdAt = dateFilter;

        const orders = await Order.find(query).sort({ createdAt: -1 }).populate('organizationId', 'name currencySymbol');

        sheetRows.push(['=== 5. SALES & ORDERS REPORT ===']);
        sheetRows.push(['Order Number', 'Order Date', 'Customer / Client Name', 'Items Count', 'Payment Status', 'Total Order Amount', 'Order Status', 'Organization']);

        if (orders.length === 0) {
          sheetRows.push(['No sales order records found for this period']);
        } else {
          orders.forEach(o => {
            const symbol = o.organizationId?.currencySymbol || currencySymbol;
            sheetRows.push([
              o.orderNumber || `SO-${o._id.toString().substr(-6).toUpperCase()}`,
              formatDate(o.orderDate || o.createdAt),
              o.customerName || o.clientName || 'N/A',
              o.items ? o.items.length : 1,
              o.paymentStatus || 'Pending',
              `${symbol}${o.totalAmount || 0}`,
              o.status || 'Confirmed',
              o.organizationId?.name || orgName
            ]);
          });
        }
      }

      return sheetRows;
    };

    const finalData = await buildSheetData();
    const ws = XLSX.utils.aoa_to_sheet(finalData);

    // Set column widths for clean readability
    ws['!cols'] = [
      { wch: 25 }, { wch: 22 }, { wch: 28 }, { wch: 22 },
      { wch: 22 }, { wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 25 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Operational Report');

    // Generate XLSX Buffer
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const filename = `ERP_Report_${activeRoleFilter.toUpperCase()}_${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buf);

  } catch (error) {
    next(error);
  }
};
