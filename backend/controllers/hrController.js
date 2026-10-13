const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Payroll = require('../models/Payroll');

// Constants for Deductions (India standard simplified)
const ESI_RATE = 0.0075; // 0.75%
const PF_RATE = 0.12;    // 12%

// @desc    Add new Employee
// @route   POST /api/hr/employees
// @access  Private (hr_manager, admin, super_admin)
exports.addEmployee = async (req, res, next) => {
  try {
    const { empId, name, department, basicSalary, overtimeRate, esiApplicable, pfApplicable } = req.body;
    
    const exists = await Employee.findOne({ empId });
    if (exists) return res.status(400).json({ success: false, message: 'Employee ID already exists' });

    const employee = await Employee.create(req.body);
    res.status(201).json({ success: true, data: employee });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all active Employees
// @route   GET /api/hr/employees
// @access  Private
exports.getEmployees = async (req, res, next) => {
  try {
    const employees = await Employee.find({ isActive: true }).sort({ name: 1 });
    res.status(200).json({ success: true, data: employees });
  } catch (error) {
    next(error);
  }
};

// @desc    Punch In / Out Attendance
// @route   POST /api/hr/attendance
// @access  Private
exports.punchAttendance = async (req, res, next) => {
  try {
    const { employeeId, type, timestamp, overtimeHours } = req.body; // type: 'in' or 'out'
    const date = new Date(timestamp);
    date.setHours(0,0,0,0); // Normalize to midnight for indexing

    let record = await Attendance.findOne({ employeeId, date });

    if (!record) {
      if (type === 'out') return res.status(400).json({ success: false, message: 'Cannot punch out before punching in' });
      record = await Attendance.create({
        employeeId,
        date,
        punchIn: timestamp,
        status: 'Present'
      });
    } else {
      if (type === 'in') return res.status(400).json({ success: false, message: 'Already punched in for today' });
      record.punchOut = timestamp;
      if (overtimeHours) record.overtimeHours = overtimeHours;
      await record.save();
    }

    res.status(200).json({ success: true, message: `Punch ${type} successful`, data: record });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Attendance for a specific date
// @route   GET /api/hr/attendance
// @access  Private
exports.getAttendance = async (req, res, next) => {
  try {
    const { date } = req.query;
    const queryDate = new Date(date);
    queryDate.setHours(0,0,0,0);

    const records = await Attendance.find({ date: queryDate }).populate('employeeId', 'empId name department');
    res.status(200).json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate Monthly Payroll
// @route   POST /api/hr/payroll/generate
// @access  Private (hr_manager, admin, super_admin)
exports.generatePayroll = async (req, res, next) => {
  try {
    const { month, year } = req.body;
    
    // Find all active employees
    const employees = await Employee.find({ isActive: true });
    
    // Get start and end of month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    const totalDays = endDate.getDate();

    const payrollResults = [];

    for (let emp of employees) {
      // Find attendance for this month
      const attendance = await Attendance.find({
        employeeId: emp._id,
        date: { $gte: startDate, $lte: endDate },
        status: { $in: ['Present', 'Half-Day'] }
      });

      let presentDays = 0;
      let totalOT = 0;

      attendance.forEach(record => {
        presentDays += record.status === 'Half-Day' ? 0.5 : 1;
        totalOT += record.overtimeHours;
      });

      // Calculate Earnings
      const dailyWage = emp.basicSalary / totalDays;
      const basicEarned = dailyWage * presentDays;
      const otEarned = totalOT * emp.overtimeRate;
      const grossEarned = basicEarned + otEarned;

      // Calculate Deductions
      const esiDeduction = emp.esiApplicable ? grossEarned * ESI_RATE : 0;
      const pfDeduction = emp.pfApplicable ? basicEarned * PF_RATE : 0;
      
      const netSalary = grossEarned - esiDeduction - pfDeduction;

      // Upsert Payroll record
      const payrollRecord = await Payroll.findOneAndUpdate(
        { employeeId: emp._id, month, year },
        {
          totalDays,
          presentDays,
          totalOvertimeHours: totalOT,
          earnings: { basic: basicEarned, overtimePay: otEarned, bonus: 0 },
          deductions: { esi: esiDeduction, pf: pfDeduction },
          netSalary
        },
        { new: true, upsert: true }
      );

      payrollResults.push(payrollRecord);
    }

    res.status(200).json({ success: true, message: 'Payroll generated successfully', count: payrollResults.length });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Monthly Payroll
// @route   GET /api/hr/payroll
// @access  Private
exports.getPayroll = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const records = await Payroll.find({ month, year }).populate('employeeId', 'empId name department basicSalary');
    res.status(200).json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
};

// @desc    Get HR Stats
// @route   GET /api/hr/stats
// @access  Private
exports.getHRStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0,0,0,0);

    const [totalEmployees, presentToday] = await Promise.all([
      Employee.countDocuments({ isActive: true }),
      Attendance.countDocuments({ date: today, status: { $in: ['Present', 'Half-Day'] } })
    ]);

    res.status(200).json({
      success: true,
      data: { totalEmployees, presentToday, absentToday: totalEmployees - presentToday }
    });
  } catch (error) {
    next(error);
  }
};
