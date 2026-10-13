import axios from 'axios';

const API = axios.create({
  baseURL: `${process.env.REACT_APP_API_URL || (window.location.port ? `${window.location.protocol}//${window.location.hostname}:9898` : window.location.origin)}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - attach token and selected organization for superadmin
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Only platform admin's org selector should override the tenant context.
    // Regular users must NEVER send X-Organization-Id (prevents cross-org data leak).
    const selectedOrgId = localStorage.getItem('selectedOrgId');
    const storedUser = localStorage.getItem('user');
    const platformAdminEmail = process.env.REACT_APP_PLATFORM_ADMIN_EMAIL;
    if (selectedOrgId && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser.email === platformAdminEmail) {
          config.headers['X-Organization-Id'] = selectedOrgId;
        }
      } catch (_) {
        // ignore parse errors
      }
    }

    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401 and 403
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      if (error.response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
      if (error.response.status === 403 && error.response.data?.requiresReverification) {
        // Dispatch event for AuthContext to pick up and lock the screen
        window.dispatchEvent(new CustomEvent('reverificationRequired'));
      }
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  register: (data) => API.post('/auth/register', data),
  login: (data) => API.post('/auth/login', data),
  logout: () => API.post('/auth/logout'),
  getMe: () => API.get('/auth/me'),
  forgotPassword: (email) => API.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => API.put(`/auth/reset-password/${token}`, { password }),
  updateProfile: (data) => API.put('/auth/update-profile', data),
  changePassword: (data) => API.put('/auth/change-password', data),
  onboardSendOTP: (data) => API.post('/auth/onboard/send-otp', data),
  onboardVerifyOrg: (data) => API.post('/auth/onboard/verify-org', data),
};

// Gate Entry API calls
export const gateEntryAPI = {
  getAll: (params) => API.get('/gate-entry', { params }),
  getById: (id) => API.get(`/gate-entry/${id}`),
  create: (data) => API.post('/gate-entry', data),
  update: (id, data) => API.put(`/gate-entry/${id}`, data),
  delete: (id) => API.delete(`/gate-entry/${id}`),
  verify: (id, data = {}) => API.put(`/gate-entry/${id}/verify`, data),
  createGRN: (id, data) => API.put(`/gate-entry/${id}/create-grn`, data),
  notifyAccounts: (id, data = {}) => API.post(`/gate-entry/${id}/notify-accounts`, data),
  getStats: () => API.get('/gate-entry/stats'),
  scanEBill: (data) => API.post('/gate-entry/scan-ebill', data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {}
  }),
};

// Admin API calls
export const adminAPI = {
  getUsers: (params) => API.get('/admin/users', { params }),
  getUser: (id) => API.get(`/admin/users/${id}`),
  createUser: (data) => API.post('/admin/users', data),
  updateUser: (id, data) => API.put(`/admin/users/${id}`, data),
  updateRole: (id, role, permissions) => API.put(`/admin/users/${id}/role`, { role, permissions }),
  toggleStatus: (id) => API.put(`/admin/users/${id}/status`),
  deleteUser: (id) => API.delete(`/admin/users/${id}`),
  getStats: () => API.get('/admin/stats'),
  getSuperStats: () => API.get('/admin/super-stats'),
};

// Production API calls
export const productionAPI = {
  createPlan: (data) => API.post('/production/plans', data),
  getPlans: (params) => API.get('/production/plans', { params }),
  createWipBatch: (data) => API.post('/production/wip', data),
  getWipBatches: (params) => API.get('/production/wip', { params }),
  updateWipStage: (id, data) => API.put(`/production/wip/${id}/stage`, data),
  getStats: () => API.get('/production/stats'),
};

// Store & Assembly API calls
export const storeAPI = {
  getReadyWip: () => API.get('/store/ready-wip'),
  assembleWip: (data) => API.post('/store/assemble', data),
  getAssemblies: () => API.get('/store/assemblies'),
  getRacks: () => API.get('/store/racks'),
  createRack: (data) => API.post('/store/racks', data),
  storeChain: (data) => API.post('/store/store-chain', data),
  getInventory: () => API.get('/store/inventory'),
  getStats: () => API.get('/store/stats'),
  saveScannedItems: (data) => API.post('/store/inventory/scan', data),
};

// Order Management API calls
export const orderAPI = {
  createOrder: (data) => API.post('/orders', data),
  getOrders: () => API.get('/orders'),
  getShortages: () => API.get('/orders/shortages'),
  planShortage: (id, data) => API.post(`/orders/shortages/${id}/plan`, data),
  dispatchOrder: (id) => API.post(`/orders/${id}/dispatch`),
  getStats: () => API.get('/orders/stats'),
};

// AI & Reports API calls
export const aiAPI = {
  predictShots: (data) => API.post('/ai/predict-shots', data),
  getReports: () => API.get('/ai/reports'),
  chatWithAI: (data) => API.post('/ai/chat', data),
};

// HR & Payroll API calls
export const hrAPI = {
  getStats: () => API.get('/hr/stats'),
  getEmployees: () => API.get('/hr/employees'),
  addEmployee: (data) => API.post('/hr/employees', data),
  punchAttendance: (data) => API.post('/hr/attendance', data),
  getAttendance: (date) => API.get(`/hr/attendance?date=${date}`),
  generatePayroll: (data) => API.post('/hr/payroll/generate', data),
  getPayroll: (month, year) => API.get(`/hr/payroll?month=${month}&year=${year}`),
};

// Finance, Purchase & Procurement API calls
export const financeAPI = {
  // Vendors
  getVendors: (params) => API.get('/finance/vendors', { params }),
  addVendor: (data) => API.post('/finance/vendors', data),
  updateVendor: (id, data) => API.put(`/finance/vendors/${id}`, data),
  deleteVendor: (id) => API.delete(`/finance/vendors/${id}`),

  // Quotations
  getQuotations: (params) => API.get('/finance/quotations', { params }),
  createQuotation: (data) => API.post('/finance/quotations', data),
  updateQuotation: (id, data) => API.put(`/finance/quotations/${id}`, data),
  convertQuotationToPO: (id, data = {}) => API.post(`/finance/quotations/${id}/convert-to-po`, data),
  deleteQuotation: (id) => API.delete(`/finance/quotations/${id}`),

  // Purchase Orders
  getPOs: (params) => API.get('/finance/pos', { params }),
  createPO: (data) => API.post('/finance/pos', data),
  updatePO: (id, data) => API.put(`/finance/pos/${id}`, data),
  deletePO: (id) => API.delete(`/finance/pos/${id}`),
  getPOLookupForGateEntry: () => API.get('/finance/pos/lookup-active'),

  // Purchase Store Inventory & IN/OUT Movements Ledger
  getStoreInventory: (params) => API.get('/finance/purchase-store/inventory', { params }),
  placeStoreInward: (data) => API.post('/finance/purchase-store/inward', data),
  placeStoreOutward: (data) => API.post('/finance/purchase-store/outward', data),
  getStoreLedger: (params) => API.get('/finance/purchase-store/ledger', { params }),

  // OCR & Invoices
  scanInvoice: (formData) => API.post('/finance/scan-invoice', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getInvoices: () => API.get('/finance/invoices'),
  createSalesInvoice: (data) => API.post('/finance/sales-invoices', data),
  getSalesInvoices: () => API.get('/finance/sales-invoices'),
  deleteSalesInvoice: (id) => API.delete(`/finance/sales-invoices/${id}`),
};

export const purchaseAPI = financeAPI;

// Notification API calls
export const notificationAPI = {
  getNotifications: (page = 1, limit = 10) => API.get(`/notifications?page=${page}&limit=${limit}`),
  getSuperadminNotifications: (page = 1, limit = 10) => API.get(`/notifications/superadmin?page=${page}&limit=${limit}`),
  markAsRead: (id) => API.put(`/notifications/${id}/read`),
  markAllAsRead: () => API.put('/notifications/read-all'),
};

// Admin Organizations API calls (Super Admin Only)
export const adminOrgAPI = {
  getAll: () => API.get('/organizations'),
  create: (data) => API.post('/organizations', data),
  approve: (id) => API.put(`/organizations/${id}/approve`),
  decline: (id, remark) => API.put(`/organizations/${id}/decline`, { remark }),
  forceReverify: (id) => API.post(`/organizations/${id}/force-reverify`),
  reverifyOTP: (data) => API.post('/organizations/reverify-otp', data),
  resendReverifyOTP: () => API.post('/organizations/resend-reverify-otp'),
  getSettings: (params) => API.get('/organizations/settings', { params }),
  updateSettings: (data) => API.put('/organizations/settings', data),
  delete: (id) => API.delete(`/organizations/${id}`)
};

// Operations & Unified ERP API calls
export const operationsAPI = {
  // Inventory
  getInventory: () => API.get('/operations/inventory'),
  createInventoryItem: (data) => API.post('/operations/inventory', data),
  updateInventoryItem: (id, data) => API.put(`/operations/inventory/${id}`, data),
  deleteInventoryItem: (id) => API.delete(`/operations/inventory/${id}`),

  // Machines
  getMachineCategories: () => API.get('/operations/machine-categories'),
  getMachines: () => API.get('/operations/machines'),
  createMachine: (data) => API.post('/operations/machines', data),
  updateMachine: (id, data) => API.put(`/operations/machines/${id}`, data),
  deleteMachine: (id) => API.delete(`/operations/machines/${id}`),

  // Build Jobs
  getBuildJobs: () => API.get('/operations/build-jobs'),
  createBuildJob: (data) => API.post('/operations/build-jobs', data),
  updateBuildJob: (id, data) => API.put(`/operations/build-jobs/${id}`, data),
  deleteBuildJob: (id) => API.delete(`/operations/build-jobs/${id}`),
  sendToStore: (id) => API.put(`/operations/build-jobs/${id}/send-to-store`),
  receiveProduct: (id, data) => API.put(`/operations/build-jobs/${id}/receive`, data),

  // Quality Logs
  getQualityLogs: () => API.get('/operations/qc-logs'),
  createQualityLog: (data) => API.post('/operations/qc-logs', data),
  updateQualityLog: (id, data) => API.put(`/operations/qc-logs/${id}`, data),
  deleteQualityLog: (id) => API.delete(`/operations/qc-logs/${id}`),
  verifyQualityLog: (id) => API.put(`/operations/qc-logs/${id}/verify`),

  // Shortage, Buy & Sales Log
  getShortageBuySales: () => API.get('/operations/shortage-buy-sales'),
  createShortageBuySale: (data) => API.post('/operations/shortage-buy-sales', data),
  updateShortageBuySale: (id, data) => API.put(`/operations/shortage-buy-sales/${id}`, data),
  deleteShortageBuySale: (id) => API.delete(`/operations/shortage-buy-sales/${id}`),

  // Product Model Templates
  getProductTemplates: () => API.get('/operations/product-templates'),
  createProductTemplate: (data) => API.post('/operations/product-templates', data),
  updateProductTemplate: (id, data) => API.put(`/operations/product-templates/${id}`, data),
  deleteProductTemplate: (id) => API.delete(`/operations/product-templates/${id}`),
  sendTemplateToInventory: (id, data) => API.post(`/operations/product-templates/${id}/send-to-inventory`, data),
};

// Support API calls
export const supportAPI = {
  createTicket: (data) => API.post('/support/ticket', data),
  getTickets: () => API.get('/support/tickets'),
  replyTicket: (id, replyText) => API.put(`/support/tickets/${id}/reply`, { replyText }),
};

export const uploadAPI = {
  uploadFile: (formData) => API.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
};

// Dispatch API
export const dispatchAPI = {
  getStats: () => API.get('/dispatch/stats'),
  getAll: (params) => API.get('/dispatch', { params }),
  create: (data) => API.post('/dispatch', data),
  update: (id, data) => API.put(`/dispatch/${id}`, data),
  delete: (id) => API.delete(`/dispatch/${id}`),
  sendEmail: (id, data = {}) => API.post(`/dispatch/${id}/send-email`, data),
};

// Sales Pipeline API
export const salesPipelineAPI = {
  getStats: () => API.get('/sales-pipeline/stats'),
  getAll: (params) => API.get('/sales-pipeline', { params }),
  getNextSONumber: () => API.get('/sales-pipeline/next-so-number'),
  getAuditLogs: (id) => API.get(`/sales-pipeline/${id}/audit-logs`),
  create: (data) => API.post('/sales-pipeline', data),
  update: (id, data) => API.put(`/sales-pipeline/${id}`, data),
  approve: (id) => API.put(`/sales-pipeline/${id}/approve`),
  reject: (id, reason) => API.put(`/sales-pipeline/${id}/reject`, { reason }),
  delete: (id) => API.delete(`/sales-pipeline/${id}`),
  addFollowUp: (id, note) => API.post(`/sales-pipeline/${id}/followup`, { note }),
};

// Reports API
export const reportsAPI = {
  getData: (params) => API.get('/reports/data', { params }),
  exportXLSX: (params) => API.get('/reports/export-xlsx', { params, responseType: 'blob' }),
  getExportXLSXUrl: (params) => {
    const token = localStorage.getItem('token');
    const searchParams = new URLSearchParams();
    if (token) searchParams.append('token', token);
    Object.keys(params || {}).forEach(k => {
      if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
        searchParams.append(k, params[k]);
      }
    });
    const baseURL = API.defaults.baseURL || '/api';
    return `${baseURL}/reports/export-xlsx?${searchParams.toString()}`;
  }
};

export default API;





