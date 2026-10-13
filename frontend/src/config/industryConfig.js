/**
 * industryConfig.js
 * 
 * Central configuration for all supported industries.
 * Defines:
 * - Display labels, terminology, and color themes
 * - Enabled modules per industry/sub-industry
 * - Dynamic metadata fields for inventory items
 *
 * To add a new industry: just add a new key below.
 */

// ─── MODULE DEFINITIONS ────────────────────────────────────────────────────────
export const ALL_MODULES = [
  { key: 'gate',       label: 'Gate Operations',   icon: 'HiOutlineTruck' },
  { key: 'production', label: 'Production Line',   icon: 'HiOutlineCog' },
  { key: 'quality',    label: 'Quality Control',   icon: 'HiOutlineClipboardCheck' },
  { key: 'store',      label: 'Store & Godown',    icon: 'HiOutlineCube' },
  { key: 'sales',      label: 'Sales & Orders',    icon: 'HiOutlineShoppingCart' },
  { key: 'hr',         label: 'HR & Payroll',      icon: 'HiOutlineUsers' },
  { key: 'dispatch',   label: 'Dispatch',          icon: 'HiOutlineTruck' },
  { key: 'finance',    label: 'Finance',           icon: 'HiOutlineCurrencyRupee' },
  { key: 'reports',    label: 'Reports',           icon: 'HiOutlineChartBar' },
];

// ─── SUB-INDUSTRY CONFIG ───────────────────────────────────────────────────────
// Each sub-industry defines:
//   label:           Display name shown in UI
//   color:           Accent color for tags/badges
//   enabledModules:  Which app modules are active
//   terminology:     Replaces generic words with industry-specific ones
//   inventoryFields: Dynamic metadata fields for inventory items (Store form)
//   orderFields:     Dynamic metadata fields for orders/sales
// ──────────────────────────────────────────────────────────────────────────────

const SUB_INDUSTRIES = {

  // ── DRAG CHAIN (Manufacturing) ─────────────────────────────────────────────
  drag_chain: {
    label: 'Drag Chain',
    color: 'var(--primary)',
    enabledModules: ['gate', 'production', 'quality', 'store', 'sales', 'hr', 'dispatch', 'finance', 'reports'],
    terminology: {
      store: 'Store & Godown',
      item: 'Chain Component',
      order: 'Work Order',
      warehouse: 'Godown',
    },
    uom: {
      sales: 'meter',
      store: 'meter',
      production: 'shots',
      quality: 'pcs'
    },
    inventoryFields: [
      { key: 'sr',         label: 'SR No.',       type: 'text',   placeholder: 'e.g. 35-1' },
      { key: 'series',     label: 'Series',       type: 'text',   placeholder: 'e.g. TDC-2000' },
      { key: 'vs',         label: 'VS',           type: 'text',   placeholder: 'e.g. 25mm' },
      { key: 'hs',         label: 'HS',           type: 'text',   placeholder: 'e.g. 18mm' },
      { key: 'radius',     label: 'Radius (mm)',  type: 'text',   placeholder: 'e.g. 75mm' },
    ],
    orderFields: [
      { key: 'chainLength', label: 'Chain Length (m)', type: 'number', placeholder: 'e.g. 5' },
      { key: 'pitchSize',   label: 'Pitch Size',       type: 'text',   placeholder: 'e.g. 1"' },
    ],
  },

  // ── AUTOMOTIVE (Manufacturing) ─────────────────────────────────────────────
  automotive: {
    label: 'Automotive',
    color: 'var(--c-blue)',
    enabledModules: ['gate', 'production', 'quality', 'store', 'sales', 'hr', 'dispatch', 'finance', 'reports'],
    terminology: {
      store: 'Parts Inventory',
      item: 'Auto Part',
      order: 'Production Order',
      warehouse: 'Parts Warehouse',
    },
    inventoryFields: [
      { key: 'partNumber',    label: 'Part Number',     type: 'text',   placeholder: 'e.g. AP-2045' },
      { key: 'vehicleModel',  label: 'Vehicle Model',   type: 'text',   placeholder: 'e.g. Swift, Nexon' },
      { key: 'oem',           label: 'OEM / Brand',     type: 'text',   placeholder: 'e.g. Maruti, Tata' },
      { key: 'material',      label: 'Material',        type: 'text',   placeholder: 'e.g. Steel, Aluminium' },
      { key: 'compatibility', label: 'Compatibility',   type: 'text',   placeholder: 'e.g. BS6, Universal' },
      { key: 'hsnCode',       label: 'HSN Code',        type: 'text',   placeholder: 'e.g. 8708' },
    ],
    orderFields: [
      { key: 'vehicleType',   label: 'Vehicle Type',    type: 'select', options: ['2-Wheeler', '3-Wheeler', '4-Wheeler', 'Commercial', 'Other'] },
      { key: 'batchNumber',   label: 'Batch Number',    type: 'text',   placeholder: 'e.g. BATCH-001' },
    ],
  },

  // ── STEEL & FABRICATION (Manufacturing) ────────────────────────────────────
  steel_fabrication: {
    label: 'Steel & Fabrication',
    color: 'var(--text-muted)',
    enabledModules: ['gate', 'production', 'quality', 'store', 'sales', 'hr', 'dispatch', 'finance', 'reports'],
    terminology: {
      store: 'Steel Store',
      item: 'Steel Item',
      order: 'Fabrication Order',
      warehouse: 'Steel Yard',
    },
    inventoryFields: [
      { key: 'grade',       label: 'Steel Grade',     type: 'text',   placeholder: 'e.g. SS304, MS, GI' },
      { key: 'thickness',   label: 'Thickness (mm)',  type: 'number', placeholder: 'e.g. 5' },
      { key: 'width',       label: 'Width (mm)',      type: 'number', placeholder: 'e.g. 100' },
      { key: 'length',      label: 'Length (mm)',     type: 'number', placeholder: 'e.g. 6000' },
      { key: 'finish',      label: 'Finish',          type: 'select', options: ['Raw', 'Powder Coated', 'Galvanized', 'Polished', 'Other'] },
      { key: 'heatNumber',  label: 'Heat Number',     type: 'text',   placeholder: 'e.g. HT-2025-001' },
    ],
    orderFields: [
      { key: 'drawingRef',  label: 'Drawing Reference', type: 'text', placeholder: 'e.g. DRW-001' },
      { key: 'weldType',    label: 'Weld Type',         type: 'select', options: ['MIG', 'TIG', 'Arc', 'Spot', 'N/A'] },
    ],
  },

  // ── ELECTRICAL & ELECTRONICS (Manufacturing) ───────────────────────────────
  electrical: {
    label: 'Electrical & Electronics',
    color: 'var(--warning)',
    enabledModules: ['gate', 'store', 'quality', 'sales', 'hr', 'dispatch', 'finance', 'reports'],
    terminology: {
      store: 'Component Store',
      item: 'Electrical Component',
      order: 'Supply Order',
      warehouse: 'Components Warehouse',
    },
    inventoryFields: [
      { key: 'voltage',     label: 'Voltage Rating',  type: 'text',   placeholder: 'e.g. 230V, 12V DC' },
      { key: 'ampere',      label: 'Ampere Rating',   type: 'text',   placeholder: 'e.g. 5A, 10A' },
      { key: 'make',        label: 'Make / Brand',    type: 'text',   placeholder: 'e.g. Legrand, Schneider' },
      { key: 'isPolarized', label: 'Is Polarized?',   type: 'select', options: ['Yes', 'No', 'N/A'] },
      { key: 'ipRating',    label: 'IP Rating',       type: 'text',   placeholder: 'e.g. IP65, IP44' },
    ],
    orderFields: [],
  },

  // ── ENERGY & POWER (Manufacturing) ────────────────────────────────────────
  energy_power: {
    label: 'Energy & Power',
    color: 'var(--warning)',
    enabledModules: ['gate', 'production', 'quality', 'store', 'sales', 'hr', 'dispatch', 'finance', 'reports'],
    terminology: {
      store: 'Equipment Store',
      item: 'Power Equipment',
      order: 'Production Order',
      warehouse: 'Equipment Yard',
    },
    inventoryFields: [
      { key: 'equipmentType', label: 'Equipment Type',   type: 'select', options: ['Generator', 'Transformer', 'Motor', 'Panel', 'Cable', 'Other'] },
      { key: 'capacity',      label: 'Capacity (KW/KVA)',type: 'text',   placeholder: 'e.g. 500 KW' },
      { key: 'voltage',       label: 'Voltage (V)',      type: 'text',   placeholder: 'e.g. 415V, 11kV' },
      { key: 'make',          label: 'Make / OEM',       type: 'text',   placeholder: 'e.g. ABB, Siemens' },
      { key: 'serialNo',      label: 'Serial Number',    type: 'text',   placeholder: 'e.g. EQ-2025-001' },
      { key: 'certStandard',  label: 'Cert. Standard',   type: 'text',   placeholder: 'e.g. IEC 60076, IS 2026' },
    ],
    orderFields: [
      { key: 'projectRef',  label: 'Project Reference', type: 'text', placeholder: 'e.g. PROJ-001' },
    ],
  },

  // ── FOOD & BEVERAGE (Manufacturing) ───────────────────────────────────────
  food_beverage: {
    label: 'Food & Beverage',
    color: 'var(--success)',
    enabledModules: ['gate', 'production', 'quality', 'store', 'sales', 'hr', 'dispatch', 'finance', 'reports'],
    terminology: {
      store: 'Ingredient Store',
      item: 'Ingredient / Product',
      order: 'Production Batch',
      warehouse: 'Cold Store / Warehouse',
    },
    inventoryFields: [
      { key: 'batchNo',      label: 'Batch Number',       type: 'text',   placeholder: 'e.g. BATCH-001' },
      { key: 'expiryDate',   label: 'Expiry / Best Before', type: 'text',   placeholder: 'e.g. 2026-12-31' },
      { key: 'fssaiNo',      label: 'FSSAI Lic. No.',     type: 'text',   placeholder: 'e.g. 10019022007742' },
      { key: 'storageTemp',  label: 'Storage Temp (°C)',  type: 'text',   placeholder: 'e.g. 2-8°C' },
      { key: 'category',     label: 'Food Category',      type: 'select', options: ['Raw Material', 'Packaging', 'Finished Good', 'Semi-Processed', 'Additive'] },
      { key: 'allergens',    label: 'Allergens',          type: 'text',   placeholder: 'e.g. Gluten, Dairy' },
    ],
    orderFields: [
      { key: 'recipeRef',  label: 'Recipe / Formula Ref', type: 'text', placeholder: 'e.g. RCP-001' },
    ],
  },

  // ── PHARMACEUTICAL (Manufacturing) ────────────────────────────────────────
  pharmaceutical: {
    label: 'Pharmaceutical',
    color: 'var(--c-cyan)',
    enabledModules: ['gate', 'production', 'quality', 'store', 'sales', 'hr', 'dispatch', 'finance', 'reports'],
    terminology: {
      store: 'Pharmacy Store',
      item: 'Drug / API / Excipient',
      order: 'Manufacturing Order',
      warehouse: 'Temperature-Controlled Warehouse',
    },
    inventoryFields: [
      { key: 'batchNo',      label: 'Batch Number',        type: 'text',   placeholder: 'e.g. BATCH-2025-001' },
      { key: 'expiryDate',   label: 'Expiry Date',         type: 'text',   placeholder: 'e.g. 2027-06-30' },
      { key: 'manufacturer', label: 'Manufacturer',        type: 'text',   placeholder: 'e.g. Sun Pharma' },
      { key: 'storageCondition', label: 'Storage Condition', type: 'select', options: ['Room Temp', '2-8°C', 'Below -20°C', 'Protect from Light', 'Controlled Substance'] },
      { key: 'schedule',     label: 'Schedule (H/G/X)',    type: 'select', options: ['H', 'G', 'X', 'OTC', 'N/A'] },
      { key: 'coaRef',       label: 'CoA Reference',       type: 'text',   placeholder: 'e.g. COA-2025-001' },
    ],
    orderFields: [
      { key: 'formulaRef',  label: 'Formula Reference', type: 'text', placeholder: 'e.g. FRM-001' },
    ],
  },

  // ── CHEMICALS & PETROCHEMICALS (Manufacturing) ─────────────────────────────
  chemicals_petrochemicals: {
    label: 'Chemicals & Petrochemicals',
    color: 'var(--c-violet)',
    enabledModules: ['gate', 'production', 'quality', 'store', 'sales', 'hr', 'dispatch', 'finance', 'reports'],
    terminology: {
      store: 'Chemical Store',
      item: 'Chemical / Raw Material',
      order: 'Production Order',
      warehouse: 'Hazmat Warehouse',
    },
    inventoryFields: [
      { key: 'casNumber',    label: 'CAS Number',          type: 'text',   placeholder: 'e.g. 67-64-1' },
      { key: 'hazardClass',  label: 'Hazard Class',        type: 'select', options: ['Flammable', 'Corrosive', 'Toxic', 'Oxidizer', 'Explosive', 'Non-Hazardous'] },
      { key: 'msdsRef',      label: 'MSDS Reference',      type: 'text',   placeholder: 'e.g. MSDS-2025-001' },
      { key: 'storageTemp',  label: 'Storage Temp (°C)',   type: 'text',   placeholder: 'e.g. Below 30°C' },
      { key: 'purity',       label: 'Purity (%)',          type: 'text',   placeholder: 'e.g. 99.5%' },
      { key: 'packingType',  label: 'Packing Type',        type: 'select', options: ['Drum', 'IBC', 'Bag', 'Cylinder', 'Tanker', 'Other'] },
    ],
    orderFields: [
      { key: 'reactionType', label: 'Reaction Type', type: 'text', placeholder: 'e.g. Polymerization' },
    ],
  },

  // ── LOGISTICS (Logistics) ──────────────────────────────────────────────────
  logistics: {
    label: 'Logistics & Transport',
    color: 'var(--success)',
    enabledModules: ['gate', 'dispatch', 'sales', 'hr', 'finance', 'reports'],
    terminology: {
      store: 'Fleet Assets',
      item: 'Shipment',
      order: 'Transport Order',
      warehouse: 'Transit Hub',
    },
    inventoryFields: [
      { key: 'vehicleNo',   label: 'Vehicle Number',   type: 'text',   placeholder: 'e.g. PB-01-AB-1234' },
      { key: 'driverName',  label: 'Driver Name',      type: 'text',   placeholder: 'e.g. Rajesh Kumar' },
      { key: 'routeFrom',   label: 'Origin',           type: 'text',   placeholder: 'e.g. Chandigarh' },
      { key: 'routeTo',     label: 'Destination',      type: 'text',   placeholder: 'e.g. Delhi' },
      { key: 'ewayBill',    label: 'E-Way Bill No.',   type: 'text',   placeholder: 'e.g. EW-123456' },
    ],
    orderFields: [
      { key: 'freightType', label: 'Freight Type', type: 'select', options: ['Full Load', 'Partial Load', 'Express', 'Cold Chain'] },
    ],
  },

  // ── RETAIL (Retail) ────────────────────────────────────────────────────────
  retail: {
    label: 'Retail',
    color: 'var(--c-pink)',
    enabledModules: ['store', 'sales', 'hr', 'dispatch', 'finance', 'reports'],
    terminology: {
      store: 'Inventory',
      item: 'Product',
      order: 'Sales Order',
      warehouse: 'Warehouse',
    },
    inventoryFields: [
      { key: 'sku',         label: 'SKU',              type: 'text',   placeholder: 'e.g. SKU-10045' },
      { key: 'barcode',     label: 'Barcode',          type: 'text',   placeholder: 'e.g. 890001234567' },
      { key: 'category',    label: 'Product Category', type: 'text',   placeholder: 'e.g. Electronics, Apparel' },
      { key: 'mrp',         label: 'MRP (₹)',          type: 'number', placeholder: 'e.g. 499' },
      { key: 'brand',       label: 'Brand',            type: 'text',   placeholder: 'e.g. Nike, Samsung' },
      { key: 'shelfLife',   label: 'Shelf Life (days)',type: 'number', placeholder: 'e.g. 365' },
    ],
    orderFields: [
      { key: 'salesChannel', label: 'Sales Channel', type: 'select', options: ['In-Store', 'Online', 'WhatsApp', 'Distributor', 'Other'] },
    ],
  },
};

// ─── INDUSTRY -> DEFAULT SUB-INDUSTRY MAPPING ──────────────────────────────────
export const INDUSTRY_DEFAULTS = {
  'Manufacturing': 'drag_chain',
  'Automotive':    'automotive',
  'Logistics':     'logistics',
  'Retail':        'retail',
};

// ─── HELPER FUNCTIONS ──────────────────────────────────────────────────────────

/**
 * Get the industry config for a given sub-industry ID or the organization object.
 * Falls back to drag_chain if not found.
 */
export function getIndustryConfig(subIndustryId) {
  return SUB_INDUSTRIES[subIndustryId] || SUB_INDUSTRIES['drag_chain'];
}

/**
 * Get inventory metadata fields for a given subIndustryId.
 */
export function getInventoryFields(subIndustryId) {
  const config = getIndustryConfig(subIndustryId);
  return config.inventoryFields || [];
}

/**
 * Get enabled modules for a given subIndustryId.
 */
export function getEnabledModules(subIndustryId) {
  const config = getIndustryConfig(subIndustryId);
  return config.enabledModules || [];
}

/**
 * Get terminology for a given subIndustryId.
 */
export function getTerm(subIndustryId, key) {
  const config = getIndustryConfig(subIndustryId);
  return (config.terminology && config.terminology[key]) || key;
}

/**
 * Get all available sub-industry options for a select dropdown.
 */
export function getSubIndustryOptions() {
  return Object.entries(SUB_INDUSTRIES).map(([id, cfg]) => ({
    id,
    label: cfg.label,
    color: cfg.color,
  }));
}

export default SUB_INDUSTRIES;
