/**
 * Page copy and data.
 *
 * Icons are stored as component references rather than JSX elements, which
 * keeps this file plain data that either a server or a client component can
 * import, and lets each section decide how to size and colour the icon.
 */
import {
  LuShieldCheck, LuBoxes, LuCog, LuTruck, LuShoppingCart, LuClipboardList,
  LuFactory, LuScanLine, LuWarehouse, LuWrench, LuWorkflow, LuQrCode,
  LuIndianRupee, LuTrendingUp, LuCloud, LuBlocks, LuChartNoAxesCombined,
  LuHandshake, LuUsersRound, LuSettings2, LuGraduationCap, LuHeadset,
  LuSearch, LuFileText, LuReceipt, LuCreditCard, LuPackage, LuClipboardCheck,
  LuUserCheck, LuBellRing, LuLock, LuSmartphone, LuDatabase, LuTarget,
  LuLayers, LuBuilding2, LuHardHat, LuBadgeCheck, LuBookOpen, LuBanknote,
  LuChartColumn, LuRoute, LuMonitorSmartphone,
} from 'react-icons/lu';

/* --------------------------------------------------------------- hero --- */

export const HERO_TAGS = [
  { icon: LuCloud, label: 'Cloud-Based' },
  { icon: LuBlocks, label: 'Customizable' },
  { icon: LuChartNoAxesCombined, label: 'Scalable' },
];

export const HERO_PROOF = [
  { icon: LuLock, text: 'Data isolated per company' },
  { icon: LuMonitorSmartphone, text: 'Desktop, tablet & phone' },
  { icon: LuHeadset, text: 'Training & support included' },
];

/** The eight modules orbiting the brand hub, alternating tone. */
export const WHEEL = [
  { icon: LuShoppingCart, label: 'Sales & Orders', tone: 'var(--primary)' },
  { icon: LuHandshake, label: 'CRM & Pipeline', tone: 'var(--c-green)' },
  { icon: LuClipboardList, label: 'Purchase & Material', tone: 'var(--primary)' },
  { icon: LuCog, label: 'Production & Quality', tone: 'var(--c-green)' },
  { icon: LuBoxes, label: 'Inventory Control', tone: 'var(--primary)' },
  { icon: LuIndianRupee, label: 'Finance & Accounts', tone: 'var(--c-green)' },
  { icon: LuUsersRound, label: 'Payroll & HR', tone: 'var(--primary)' },
  { icon: LuScanLine, label: 'Gate Management', tone: 'var(--c-green)' },
];

export const STATS = [
  { icon: LuLayers, v: '260+', l: 'Chain models' },
  { icon: LuRoute, v: '9', l: 'Order stages' },
  { icon: LuUsersRound, v: '16', l: 'Role workspaces' },
  { icon: LuBoxes, v: '12', l: 'Connected modules' },
  { icon: LuLock, v: '100%', l: 'Tenant isolation' },
];

export const MARQUEE = [
  'Gate Entry & GRN', 'Vendor Purchase Orders', 'Production Planning', 'Machine Status',
  'First & Final Inspection', 'Rack-Level Inventory', 'Live Stock Valuation', 'Assembly Batches',
  'Packing & LR Copy', 'Courier Tracking & POD', 'Lead to Sales Order', 'Proforma & Tax Invoice',
  'Credit Overdue Alerts', 'Payroll & Attendance', 'OCR Bill Scanning', 'Role-Based Access',
];

/* ----------------------------------------------------------- solutions --- */

export const SOLUTIONS = [
  {
    icon: LuFactory, tone: 'primary',
    title: 'Factory ERP',
    desc: 'Gate entry, purchase, production, quality, store, assembly and dispatch on one connected floor.',
    points: ['One stock figure for every team', 'Machine and line status live', 'Nothing re-typed between departments'],
  },
  {
    icon: LuWrench, tone: 'violet',
    title: 'Drag Chain Manufacturing',
    desc: 'A built-in catalogue of 260+ series with pitch, links-per-metre and rate, so every order is specified correctly.',
    points: ['Model, width, radius and bracket', 'Links calculated from pitch & length', 'Rate per metre with discount'],
  },
  {
    icon: LuShieldCheck, tone: 'green',
    title: 'Quality & Dispatch',
    desc: 'First and final inspection, four outcomes, then packing, courier, LR copy and proof of delivery.',
    points: ['Pass, Hold, Reject or Rework', 'Photo proof at every stage', 'POD filed against the order'],
  },
  {
    icon: LuBlocks, tone: 'cyan',
    title: 'Custom Industry Schemas',
    desc: 'Forms and fields adapt to your sector — build your own schema without touching code.',
    points: ['Your fields, your labels', 'Menus shown per role', 'Currency and tax per country'],
  },
];

/* ------------------------------------------------------------- modules --- */

export const MODULES = [
  {
    icon: LuScanLine, tone: 'primary', title: 'Gate Management',
    desc: 'Every vehicle and every bill logged at the boundary.',
    points: ['Vehicle, driver and bill capture', 'GRN raised on material receipt', 'Outward approval before dispatch'],
  },
  {
    icon: LuClipboardList, tone: 'violet', title: 'Purchase & Procurement',
    desc: 'From vendor quotation to received material.',
    points: ['Quotation compared, then converted to PO', 'Branded purchase order PDF', 'Purchase store inward & outward ledger'],
  },
  {
    icon: LuCog, tone: 'blue', title: 'Production Floor',
    desc: 'Build jobs assigned to machines and lines.',
    points: ['Shot count and material consumption', 'Countdown timer on every job', 'Handover to store on completion'],
  },
  {
    icon: LuClipboardCheck, tone: 'green', title: 'Quality Control',
    desc: 'Two inspection stages, four honest outcomes.',
    points: ['First and final inspection', 'Pass, Hold, Reject, Rework', 'Rework reason logged on the batch'],
  },
  {
    icon: LuWarehouse, tone: 'cyan', title: 'Store & Inventory',
    desc: 'Stock you can find, and stock you can value.',
    points: ['Warehouse to almirah to rack location', 'Shortage raised at minimum stock', 'Live valuation in your currency'],
  },
  {
    icon: LuWrench, tone: 'amber', title: 'Assembly Line',
    desc: 'Chains built to the exact ordered specification.',
    points: ['WIP batches pulled from store', 'Assembled against order specs', 'Photo proof before packing'],
  },
  {
    icon: LuTruck, tone: 'teal', title: 'Dispatch & Logistics',
    desc: 'Four stages from assembled to delivered.',
    points: ['Assemble, Hold, Packing, Dispatched', 'Courier, AWB and LR copy', 'Proof of delivery on the order'],
  },
  {
    icon: LuHandshake, tone: 'pink', title: 'Sales & CRM',
    desc: 'The whole funnel, not just the closed order.',
    points: ['Lead to Quotation to PI to PO to SO', 'Chain configurator with live rate', 'Follow-ups, visits and complaints'],
  },
  {
    icon: LuIndianRupee, tone: 'indigo', title: 'Finance & Invoicing',
    desc: 'Every document your buyer actually asks for.',
    points: ['Tax invoice, bill, challan, quotation, PI', 'Credit days with red overdue alert', 'Invoice PDF generated in-app'],
  },
  {
    icon: LuUsersRound, tone: 'orange', title: 'HR & Payroll',
    desc: 'The people side of the same plant.',
    points: ['Employee master and attendance', 'Monthly payroll generation', 'Department-wise headcount'],
  },
  {
    icon: LuChartColumn, tone: 'red', title: 'Reports & Analytics',
    desc: 'Answers without a night of spreadsheet work.',
    points: ['Cross-module report builder', 'Export to Excel in one click', 'Live KPI tracker for management'],
  },
  {
    icon: LuBuilding2, tone: 'slate', title: 'Admin & Tenants',
    desc: 'Your company, shaped the way you run it.',
    points: ['Brand name, logo and theme colour', 'Menu visibility per role', 'Isolated at the database layer'],
  },
];

/* ------------------------------------------------------------ workflow --- */

export const WORKFLOW = [
  { n: '01', icon: LuTarget, tone: 'primary', title: 'Lead', desc: 'Inquiry captured with its source, rating and owner, so nothing sits in an inbox.' },
  { n: '02', icon: LuFileText, tone: 'blue', title: 'Quotation', desc: 'Chain specs configured, rate per metre applied, discount recorded against the deal.' },
  { n: '03', icon: LuBookOpen, tone: 'violet', title: 'Customer PO', desc: 'The buyer purchase order attached to the same record the quote came from.' },
  { n: '04', icon: LuReceipt, tone: 'amber', title: 'Proforma Invoice', desc: 'PI raised with credit days, and the due date calculated from that day forward.' },
  { n: '05', icon: LuBanknote, tone: 'cyan', title: 'Invoice', desc: 'Tax invoice, standard bill or delivery challan — branded, numbered and downloadable.' },
  { n: '06', icon: LuCreditCard, tone: 'green', title: 'Payment', desc: 'Payment logged against the order; anything past its credit date turns red by itself.' },
  { n: '07', icon: LuWrench, tone: 'amber', title: 'Assembly', desc: 'Store assembles the chain to the ordered spec and attaches proof of what was built.' },
  { n: '08', icon: LuPackage, tone: 'primary', title: 'Packing', desc: 'Box count, total weight and packing photos recorded before anything leaves.' },
  { n: '09', icon: LuTruck, tone: 'green', title: 'Dispatch', desc: 'Courier, AWB, LR copy and finally the POD, all filed on the same order.' },
];

/* ---------------------------------------------------------- about/why --- */

export const ABOUT_TILES = [
  { icon: LuWorkflow, v: 'Gate → Godown', l: 'Full cycle coverage', tone: 'primary' },
  { icon: LuDatabase, v: 'Multi-tenant', l: 'Isolated per company', tone: 'violet' },
  { icon: LuBellRing, v: 'Real-time', l: 'Socket-driven updates', tone: 'green' },
  { icon: LuBlocks, v: 'Configurable', l: 'Schemas per industry', tone: 'cyan' },
];

export const ABOUT_POINTS = [
  'Domain-built for manufacturing, not a generic ERP with a factory skin',
  'Role-based workspaces so every team sees only their own work',
  'Deployed, trained and supported by the team that built it',
];

export const WHY_ERP = [
  { icon: LuSearch, title: 'Nothing is guesswork', desc: 'Stock, orders and machine status are the same number for everyone.', metric: 'One source of truth' },
  { icon: LuIndianRupee, title: 'Money is visible', desc: 'Stock valuation and credit overdue update as material and payments move.', metric: 'Live valuation' },
  { icon: LuTrendingUp, title: 'Shortages become actions', desc: 'Below minimum stock, the system raises and routes the shortage itself.', metric: 'Raised automatically' },
  { icon: LuShieldCheck, title: 'Every role is scoped', desc: 'A gate guard never sees the sales pipeline; a checker never sees payroll.', metric: '16 role workspaces' },
];

export const WHY_US = [
  'Built for drag chain manufacturing, not adapted from generic ERP',
  'Multi-tenant — every company data is isolated at the database layer',
  'Works on the shop floor: tablet-friendly gate entry and QC screens',
  'OCR reads vendor bills and pre-fills the gate entry for you',
  'Real-time updates over sockets — no refreshing to see a status change',
  'Branding, menus and permissions configured per company, not per release',
];

/* --------------------------------------------------------- deep dives --- */

export const DEEP_DIVE = [
  {
    kicker: 'Inventory',
    title: 'Your stock knows what it is worth',
    lead: 'Every item carries a unit rate, so the value of the floor is a number you can read at any moment — not something accounts reconstructs at month end.',
    points: [
      'Available quantity multiplied by unit rate, recalculated live',
      'Total valuation banner above the inventory table',
      'The same figure on the admin KPI card',
      'Down to the rack, in your own currency',
    ],
    panel: 'valuation',
  },
  {
    kicker: 'Gate Entry',
    title: 'The bill fills in the gate entry',
    lead: 'A guard photographs the vendor bill at the gate. OCR reads it and pre-fills the entry, so material is logged in seconds and accounts never re-types it.',
    points: [
      'Vendor, invoice number, amount and tax extracted',
      'Works from a photo, a PDF or a scanned file',
      'GRN generated the moment material is received',
      'Accounts notified with the bill attached',
    ],
    panel: 'scan',
  },
  {
    kicker: 'Receivables',
    title: 'Overdue payments turn red on their own',
    lead: 'Credit days go on the PI. From there the due date is the system problem, not a reminder someone has to remember to set.',
    points: [
      'Credit days recorded on the PI or order',
      'Due date calculated and shown on the pipeline',
      'Past due, the row turns red automatically',
      'A live overdue counter for sales and finance',
    ],
    panel: 'credit',
  },
];

/* --------------------------------------------------------------- roles --- */

export const ROLES = [
  { icon: LuBuilding2, tone: 'slate', title: 'Super Admin', desc: 'Every workspace, and every tenant on the platform.' },
  { icon: LuUserCheck, tone: 'primary', title: 'Admin', desc: 'Full company access, users and settings.' },
  { icon: LuScanLine, tone: 'cyan', title: 'Gate Guard', desc: 'Inward and outward gate passes — nothing else.' },
  { icon: LuHardHat, tone: 'blue', title: 'Supervisor', desc: 'Build jobs, machines and the production lines.' },
  { icon: LuCog, tone: 'indigo', title: 'Production Manager', desc: 'Planning, line allocation and machine status.' },
  { icon: LuClipboardCheck, tone: 'green', title: 'Quality Checker', desc: 'Inspections, outcomes and rework logs.' },
  { icon: LuWarehouse, tone: 'amber', title: 'Store Manager', desc: 'Inventory, racks, shortages and assembly handover.' },
  { icon: LuWrench, tone: 'orange', title: 'Assembly User', desc: 'WIP batches and assembly proof.' },
  { icon: LuTruck, tone: 'teal', title: 'Dispatch', desc: 'Packing, courier, LR copy and proof of delivery.' },
  { icon: LuShoppingCart, tone: 'pink', title: 'Sales', desc: 'Pipeline, quotations, orders and follow-ups.' },
  { icon: LuClipboardList, tone: 'violet', title: 'Purchase Manager', desc: 'Vendors, quotations and purchase orders.' },
  { icon: LuBadgeCheck, tone: 'red', title: 'Custom User', desc: 'Exactly the permissions you tick, nothing more.' },
];

/* ------------------------------------------------------------- process --- */

export const PROCESS = [
  { icon: LuSearch, step: '01', title: 'Requirement Analysis', desc: 'We map your floor — stages, roles, racks and the products you actually make.', out: 'A written scope you sign off' },
  { icon: LuSettings2, step: '02', title: 'Customization & Setup', desc: 'Schemas, catalogues and role permissions configured to your operation.', out: 'Your data, your fields, your branding' },
  { icon: LuGraduationCap, step: '03', title: 'Training & Implementation', desc: 'Each team is trained on their own workspace, not the whole system.', out: 'Role-wise sessions, on your floor' },
  { icon: LuHeadset, step: '04', title: 'Support & Optimization', desc: 'We stay on after go-live and tune the setup as you grow.', out: 'A named contact, not a ticket queue' },
];

/* ------------------------------------------------- manufacturing/compare --- */

export const MFG_TILES = [
  { icon: LuWorkflow, v: '9', l: 'Order stages' },
  { icon: LuQrCode, v: 'OCR', l: 'Bill scanning' },
  { icon: LuIndianRupee, v: 'Live', l: 'Stock value' },
  { icon: LuClipboardList, v: '260+', l: 'Chain models' },
  { icon: LuLayers, v: '12', l: 'Modules' },
  { icon: LuUsersRound, v: '16', l: 'Roles' },
];

export const MANUFACTURING = [
  'Live production tracking with machine status per line',
  'Material requirement planning driven by real stock levels',
  'Quality checks at first and final inspection, with rework logged',
  'Rack-level inventory with live valuation in your own currency',
];

export const COMPARE = [
  { what: 'The stock figure', before: 'Three registers, three answers', after: 'One live number every team reads' },
  { what: 'Vendor bill entry', before: 'Typed at the gate, typed again in accounts', after: 'Scanned once, GRN raised from it' },
  { what: 'A shortage', before: 'Noticed when production stops', after: 'Raised the moment stock hits minimum' },
  { what: 'Order status', before: 'A phone call down to the floor', after: 'Nine stages, visible to sales' },
  { what: 'Payment follow-up', before: 'Remembered — or not', after: 'The due date turns red by itself' },
  { what: 'Month-end reporting', before: 'A night of spreadsheet work', after: 'Filter, then export to Excel' },
  { what: 'Who sees what', before: 'Everyone can open everything', after: 'Each role sees only its own work' },
];

/* ----------------------------------------------------------------- faq --- */

export const FAQ = [
  {
    q: 'Is this only for drag chain factories?',
    a: 'No. The drag chain catalogue and configurator are built in because that is where the product started, but the Domain Builder lets you define your own modules, fields and forms for any manufacturing sector — without code, and without waiting for a release.',
  },
  {
    q: 'How is our data kept separate from other companies?',
    a: 'Every record carries an organization id, and every single database query is scoped to it automatically at the data layer rather than in screen code. A user can only ever read their own company rows, even if a screen asks for something else.',
  },
  {
    q: 'Can our team use it on the shop floor?',
    a: 'Yes. Gate entry, quality and store screens are built for tablets, there is a phone-based QR scanner mode that pairs with a desktop session, and mobile access can be switched off entirely per company if your policy requires it.',
  },
  {
    q: 'Do we have to change our stage names and roles?',
    a: 'No. Menu labels, visibility and role permissions are configured per company from Settings, so the system is renamed to match your plant instead of your plant learning a new vocabulary.',
  },
  {
    q: 'Can it read our vendor bills?',
    a: 'Yes. Upload or photograph a bill and OCR extracts the vendor, invoice number, total and tax, then pre-fills the gate entry. Images, PDFs and scanned documents are all supported.',
  },
  {
    q: 'What documents can it generate?',
    a: 'Tax invoice, standard and non-GST bill, delivery challan, quotation and proforma invoice — each as a branded PDF with your logo. HSN code, tax rate and interstate handling are configurable.',
  },
  {
    q: 'We operate outside India. Does that work?',
    a: 'Yes. Country, currency, currency symbol, tax name and tax rate are all set per company, so amounts and tax labels follow your jurisdiction rather than a hardcoded default.',
  },
  {
    q: 'What does onboarding actually look like?',
    a: 'Four stages: a requirement study of your floor, configuration of your schemas and roles, role-wise training with your own teams, then ongoing support after go-live. The timeline depends on plant size and is confirmed after the requirement study — we do not quote it blind.',
  },
];

export const DEMO_PROMISES = [
  'A 30-minute walkthrough',
  'No obligation, no scripted deck',
  'Run on your own product data',
];
