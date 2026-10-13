const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add an organization name'],
    trim: true,
    maxlength: [100, 'Name can not be more than 100 characters']
  },
  industry: {
    type: String,
    default: 'Manufacturing'
  },
  subIndustry: {
    type: String,
    default: 'Drag Chain'
  },
  subIndustryId: {
    type: String,
    default: 'drag_chain'
  },
  enabledModules: {
    type: [String],
    default: ['gate', 'production', 'quality', 'store', 'sales', 'hr', 'dispatch', 'finance', 'reports']
  },
  contactEmail: {
    type: String,
    required: [true, 'Please add a contact email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  contactPhone: {
    type: String,
    maxlength: [20, 'Phone number can not be longer than 20 characters']
  },
  address: {
    type: String,
  },
  country: {
    type: String,
    trim: true,
    default: 'India'
  },
  currency: {
    type: String,
    trim: true,
    default: 'INR'
  },
  currencySymbol: {
    type: String,
    trim: true,
    default: '₹'
  },
  taxName: {
    type: String,
    trim: true,
    default: 'GST'
  },
  taxRate: {
    type: Number,
    default: 18
  },
  verified: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'declined'],
    default: 'pending'
  },
  declineRemark: {
    type: String,
    default: ''
  },
  requiresReverification: {
    type: Boolean,
    default: false
  },
  lastVerifiedAt: {
    type: Date,
    default: null
  },
  mobileSessionForceLogoutAt: {
    type: Date,
    default: Date.now
  },
  settings: {
    brandName: {
      type: String,
      default: 'TrackBells ERP'
    },
    brandSubtitle: {
      type: String,
      default: 'Factory Automation'
    },
    logo: {
      type: String,
      default: '/logo.png'
    },
    themeColor: {
      type: String,
      default: '#f58220'
    },
    footerText: {
      type: String,
      default: 'Powered by Cyberbells ITES services pvt ltd'
    },
    menus: {
      type: Array,
      default: [
        { key: 'gateGuard', label: 'Gate Operations', icon: 'HiOutlineTruck', path: '/gate-guard', visible: true, roles: ['super_admin', 'gate_guard'] },
        { key: 'supervisor', label: 'Production Line', icon: 'HiOutlineCog', path: '/supervisor', visible: true, roles: ['super_admin', 'supervisor', 'production_manager'] },
        { key: 'qualityChecker', label: 'Quality Control', icon: 'HiOutlineClipboardCheck', path: '/quality', visible: true, roles: ['super_admin', 'quality_checker'] },
        { key: 'storeManager', label: 'Store & Godown', icon: 'HiOutlineCube', path: '/store', visible: true, roles: ['super_admin', 'store_manager'] },
        { key: 'sales', label: 'Sales & Orders', icon: 'HiOutlineShoppingCart', path: '/sales', visible: true, roles: ['super_admin', 'sales'] },
        { key: 'users', label: 'User Management', icon: 'HiOutlineUsers', path: '/users', visible: true, roles: ['super_admin', 'admin'] },
        { key: 'organizations', label: 'SaaS Tenants', icon: 'HiOutlineOfficeBuilding', path: '/admin/organizations', visible: true, roles: ['super_admin'] },
        { key: 'settings', label: 'Settings', icon: 'HiOutlineAdjustments', path: '/settings', visible: true, roles: ['super_admin', 'admin'] }
      ]
    },
    disableScreenshots: {
      type: Boolean,
      default: true
    },
    requireBiometric: {
      type: Boolean,
      default: true
    },
    restrictCrossDepartment: {
      type: Boolean,
      default: true
    },
    allowMobileApp: {
      type: Boolean,
      default: true
    },
    warehouses: {
      type: [String],
      default: []
    },
    almirahs: {
      type: [String],
      default: []
    },
    racks: {
      type: [String],
      default: []
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Organization', organizationSchema);
