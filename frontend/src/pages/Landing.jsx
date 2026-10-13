import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  LuShieldCheck, LuBoxes, LuCog, LuTruck, LuShoppingCart, LuClipboardList,
  LuArrowRight, LuLifeBuoy, LuFactory, LuScanLine, LuWarehouse,
  LuWrench, LuGauge, LuWorkflow, LuQrCode, LuIndianRupee, LuTrendingUp,
  LuCheck, LuPhone, LuMail, LuLinkedin, LuFacebook, LuInstagram, LuYoutube,
  LuSettings2, LuGraduationCap, LuHeadset, LuSearch, LuCloud, LuBlocks,
  LuChartNoAxesCombined, LuHandshake, LuUsersRound,
  LuPlus, LuFileText, LuReceipt, LuCreditCard, LuPackage, LuClipboardCheck,
  LuUserCheck, LuBellRing, LuLock, LuSmartphone, LuClock, LuDatabase,
  LuTarget, LuLayers, LuBuilding2, LuHardHat, LuBadgeCheck, LuTriangleAlert,
  LuX, LuBookOpen, LuBanknote, LuChartColumn, LuCircleCheck, LuRoute,
  LuMonitorSmartphone, LuPercent, LuTimer, LuArrowUpRight,
} from 'react-icons/lu';
import { useOrg } from '../context/OrgContext';
import { supportAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Button, Dialog, FormGrid, Field, Input, Textarea } from '../components/ui';

const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('/uploads/')) {
    const apiURL = process.env.REACT_APP_API_URL;
    if (apiURL) {
      const base = apiURL.endsWith('/api') ? apiURL : (apiURL.endsWith('/api/') ? apiURL.slice(0, -1) : `${apiURL}/api`);
      return `${base}${url}`;
    }
    if (window.location.port) {
      return `${window.location.protocol}//${window.location.hostname}:6465${url}`;
    } else {
      return `${window.location.origin}/api${url}`;
    }
  }
  return url;
};

/* ------------------------------------------------------------ scroll reveal */

/**
 * Fades content in as it scrolls into view. Falls back to visible when
 * IntersectionObserver is unavailable, so copy is never stranded hidden.
 */
const Reveal = ({ children, dir = '', delay = 0, as: Tag = 'div', style, ...rest }) => {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setShown(true); return undefined; }

    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setShown(true); io.disconnect(); } },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`reveal ${dir} ${shown ? 'shown' : ''}`.trim()}
      // caller styles are merged in, not spread over the delay variable
      style={{ '--reveal-delay': `${delay}s`, ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
};

/**
 * Counts up to a number once it scrolls into view. Accepts values like
 * "260+", "100%" or "9" and animates only the numeric part, preserving any
 * prefix/suffix. Falls back to the final value when motion is reduced.
 */
const CountUp = ({ value, duration = 1400 }) => {
  const ref = useRef(null);
  const [text, setText] = useState(value);

  useEffect(() => {
    const el = ref.current;
    const match = String(value).match(/^(\D*)([\d.]+)(\D*)$/);
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!el || !match || reduced || typeof IntersectionObserver === 'undefined') return undefined;

    const [, prefix, numStr, suffix] = match;
    const target = parseFloat(numStr);
    const decimals = (numStr.split('.')[1] || '').length;
    let raf;

    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();

      const start = performance.now();
      const tick = (now) => {
        const t = Math.min((now - start) / duration, 1);
        // ease-out cubic, so it decelerates into the final value
        const eased = 1 - Math.pow(1 - t, 3);
        setText(`${prefix}${(target * eased).toFixed(decimals)}${suffix}`);
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.4 });

    io.observe(el);
    return () => { io.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, [value, duration]);

  return <span ref={ref}>{text}</span>;
};

/* ------------------------------------------------------------------- data */

const NAV = [
  { label: 'About', href: '#about' },
  { label: 'Solution', href: '#solution' },
  { label: 'Modules', href: '#modules' },
  { label: 'Workflow', href: '#workflow' },
  { label: 'Why Us', href: '#why-us' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Contact', href: '#contact' },
];

/**
 * Social profiles. Drop the real profile URLs in here and the icons become
 * links; while a url is empty the icon renders as plain decoration rather
 * than a control that goes nowhere.
 */
const SOCIALS = [
  { icon: <LuLinkedin />, label: 'LinkedIn', url: '' },
  { icon: <LuFacebook />, label: 'Facebook', url: '' },
  { icon: <LuInstagram />, label: 'Instagram', url: '' },
  { icon: <LuYoutube />, label: 'YouTube', url: '' },
];

const HERO_TAGS = [
  { icon: <LuCloud />, label: 'Cloud-Based' },
  { icon: <LuBlocks />, label: 'Customizable' },
  { icon: <LuChartNoAxesCombined />, label: 'Scalable' },
];

/** Short proof points sitting under the hero call to action. */
const HERO_PROOF = [
  { icon: <LuLock />, text: 'Data isolated per company' },
  { icon: <LuMonitorSmartphone />, text: 'Desktop, tablet & phone' },
  { icon: <LuHeadset />, text: 'Training & support included' },
];

/** Capability strip that scrolls under the stats band. */
const MARQUEE = [
  'Gate Entry & GRN', 'Vendor Purchase Orders', 'Production Planning', 'Machine Status',
  'First & Final Inspection', 'Rack-Level Inventory', 'Live Stock Valuation', 'Assembly Batches',
  'Packing & LR Copy', 'Courier Tracking & POD', 'Lead to Sales Order', 'Proforma & Tax Invoice',
  'Credit Overdue Alerts', 'Payroll & Attendance', 'OCR Bill Scanning', 'Role-Based Access',
];

/** The four things the product does, mirroring the brand site's card grid. */
const SOLUTIONS = [
  {
    icon: <LuFactory />, tone: 'primary',
    title: 'Factory ERP',
    desc: 'Gate entry, purchase, production, quality, store, assembly and dispatch on one connected floor.',
    points: ['One stock figure for every team', 'Machine and line status live', 'Nothing re-typed between departments'],
  },
  {
    icon: <LuWrench />, tone: 'violet',
    title: 'Drag Chain Manufacturing',
    desc: 'A built-in catalogue of 260+ series with pitch, links-per-metre and rate, so every order is specified correctly.',
    points: ['Model, width, radius and bracket', 'Links calculated from pitch & length', 'Rate per metre with discount'],
  },
  {
    icon: <LuShieldCheck />, tone: 'green',
    title: 'Quality & Dispatch',
    desc: 'First and final inspection, four outcomes, then packing, courier, LR copy and proof of delivery.',
    points: ['Pass, Hold, Reject or Rework', 'Photo proof at every stage', 'POD filed against the order'],
  },
  {
    icon: <LuBlocks />, tone: 'cyan',
    title: 'Custom Industry Schemas',
    desc: 'Forms and fields adapt to your sector — build your own schema without touching code.',
    points: ['Your fields, your labels', 'Menus shown per role', 'Currency and tax per country'],
  },
];

/** Every module in the product, as the shop floor meets them. */
const MODULES = [
  {
    icon: <LuScanLine />, tone: 'primary', title: 'Gate Management',
    desc: 'Every vehicle and every bill logged at the boundary.',
    points: ['Vehicle, driver and bill capture', 'GRN raised on material receipt', 'Outward approval before dispatch'],
  },
  {
    icon: <LuClipboardList />, tone: 'violet', title: 'Purchase & Procurement',
    desc: 'From vendor quotation to received material.',
    points: ['Quotation compared, then converted to PO', 'Branded purchase order PDF', 'Purchase store inward & outward ledger'],
  },
  {
    icon: <LuCog />, tone: 'blue', title: 'Production Floor',
    desc: 'Build jobs assigned to machines and lines.',
    points: ['Shot count and material consumption', 'Countdown timer on every job', 'Handover to store on completion'],
  },
  {
    icon: <LuClipboardCheck />, tone: 'green', title: 'Quality Control',
    desc: 'Two inspection stages, four honest outcomes.',
    points: ['First and final inspection', 'Pass, Hold, Reject, Rework', 'Rework reason logged on the batch'],
  },
  {
    icon: <LuWarehouse />, tone: 'cyan', title: 'Store & Inventory',
    desc: 'Stock you can find and stock you can value.',
    points: ['Warehouse → almirah → rack location', 'Shortage raised at minimum stock', 'Live valuation in your currency'],
  },
  {
    icon: <LuWrench />, tone: 'amber', title: 'Assembly Line',
    desc: 'Chains built to the exact ordered specification.',
    points: ['WIP batches pulled from store', 'Assembled against order specs', 'Photo proof before packing'],
  },
  {
    icon: <LuTruck />, tone: 'teal', title: 'Dispatch & Logistics',
    desc: 'Four stages from assembled to delivered.',
    points: ['Assemble → Hold → Packing → Dispatched', 'Courier, AWB and LR copy', 'Proof of delivery on the order'],
  },
  {
    icon: <LuHandshake />, tone: 'pink', title: 'Sales & CRM',
    desc: 'The whole funnel, not just the closed order.',
    points: ['Lead → Quotation → PI → PO → SO', 'Chain configurator with live rate', 'Follow-ups, visits and complaints'],
  },
  {
    icon: <LuIndianRupee />, tone: 'indigo', title: 'Finance & Invoicing',
    desc: 'Every document your buyer actually asks for.',
    points: ['Tax invoice, bill, challan, quotation, PI', 'Credit days with red overdue alert', 'Invoice PDF generated in-app'],
  },
  {
    icon: <LuUsersRound />, tone: 'orange', title: 'HR & Payroll',
    desc: 'The people side of the same plant.',
    points: ['Employee master and attendance', 'Monthly payroll generation', 'Department-wise headcount'],
  },
  {
    icon: <LuChartColumn />, tone: 'red', title: 'Reports & Analytics',
    desc: 'Answers without a night of spreadsheet work.',
    points: ['Cross-module report builder', 'Export to Excel in one click', 'Live KPI tracker for management'],
  },
  {
    icon: <LuBuilding2 />, tone: 'slate', title: 'Admin & Tenants',
    desc: 'Your company, shaped the way you run it.',
    points: ['Brand name, logo and theme colour', 'Menu visibility per role', 'Isolated at the database layer'],
  },
];

/** The nine stages an order passes through, exactly as the app tracks them. */
const WORKFLOW = [
  { n: '01', icon: <LuTarget />, tone: 'primary', title: 'Lead', desc: 'Inquiry captured with its source, rating and owner, so nothing sits in an inbox.' },
  { n: '02', icon: <LuFileText />, tone: 'blue', title: 'Quotation', desc: 'Chain specs configured, rate per metre applied, discount recorded against the deal.' },
  { n: '03', icon: <LuBookOpen />, tone: 'violet', title: 'Customer PO', desc: 'The buyer’s purchase order attached to the same record the quote came from.' },
  { n: '04', icon: <LuReceipt />, tone: 'amber', title: 'Proforma Invoice', desc: 'PI raised with credit days, and the due date calculated from that day forward.' },
  { n: '05', icon: <LuBanknote />, tone: 'cyan', title: 'Invoice', desc: 'Tax invoice, standard bill or delivery challan — branded, numbered and downloadable.' },
  { n: '06', icon: <LuCreditCard />, tone: 'green', title: 'Payment', desc: 'Payment logged against the order; anything past its credit date turns red by itself.' },
  { n: '07', icon: <LuWrench />, tone: 'amber', title: 'Assembly', desc: 'Store assembles the chain to the ordered spec and attaches proof of what was built.' },
  { n: '08', icon: <LuPackage />, tone: 'primary', title: 'Packing', desc: 'Box count, total weight and packing photos recorded before anything leaves.' },
  { n: '09', icon: <LuTruck />, tone: 'green', title: 'Dispatch', desc: 'Courier, AWB, LR copy and finally the POD, all filed on the same order.' },
];

const WHY_ERP = [
  { icon: <LuSearch />, title: 'Nothing is guesswork', desc: 'Stock, orders and machine status are the same number for everyone.', metric: 'One source of truth' },
  { icon: <LuIndianRupee />, title: 'Money is visible', desc: 'Stock valuation and credit overdue update as material and payments move.', metric: 'Live valuation' },
  { icon: <LuTrendingUp />, title: 'Shortages become actions', desc: 'Below minimum stock, the system raises and routes the shortage itself.', metric: 'Raised automatically' },
  { icon: <LuShieldCheck />, title: 'Every role is scoped', desc: 'A gate guard never sees the sales pipeline; a checker never sees payroll.', metric: '16 role workspaces' },
];

/** Three capabilities worth showing rather than listing. */
const DEEP_DIVE = [
  {
    kicker: 'Inventory',
    title: 'Your stock knows what it is worth',
    lead: 'Every item carries a unit rate, so the value of the floor is a number you can read at any moment — not something accounts reconstructs at month end.',
    points: [
      'Available quantity × unit rate, recalculated live',
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
    lead: 'Credit days go on the PI. From there the due date is the system’s problem, not a reminder someone has to remember to set.',
    points: [
      'Credit days recorded on the PI or order',
      'Due date calculated and shown on the pipeline',
      'Past due, the row turns red automatically',
      'A live overdue counter for sales and finance',
    ],
    panel: 'credit',
  },
];

const WHY_US = [
  'Built for drag chain manufacturing, not adapted from generic ERP',
  'Multi-tenant — every company’s data is isolated at the database layer',
  'Works on the shop floor: tablet-friendly gate entry and QC screens',
  'OCR reads vendor bills and pre-fills the gate entry for you',
  'Real-time updates over sockets — no refreshing to see a status change',
  'Branding, menus and permissions configured per company, not per release',
];

/** Who gets which workspace. */
const ROLES = [
  { icon: <LuBuilding2 />, tone: 'slate', title: 'Super Admin', desc: 'Every workspace, and every tenant on the platform.' },
  { icon: <LuUserCheck />, tone: 'primary', title: 'Admin', desc: 'Full company access, users and settings.' },
  { icon: <LuScanLine />, tone: 'cyan', title: 'Gate Guard', desc: 'Inward and outward gate passes — nothing else.' },
  { icon: <LuHardHat />, tone: 'blue', title: 'Supervisor', desc: 'Build jobs, machines and the production lines.' },
  { icon: <LuCog />, tone: 'indigo', title: 'Production Manager', desc: 'Planning, line allocation and machine status.' },
  { icon: <LuClipboardCheck />, tone: 'green', title: 'Quality Checker', desc: 'Inspections, outcomes and rework logs.' },
  { icon: <LuWarehouse />, tone: 'amber', title: 'Store Manager', desc: 'Inventory, racks, shortages and assembly handover.' },
  { icon: <LuWrench />, tone: 'orange', title: 'Assembly User', desc: 'WIP batches and assembly proof.' },
  { icon: <LuTruck />, tone: 'teal', title: 'Dispatch', desc: 'Packing, courier, LR copy and proof of delivery.' },
  { icon: <LuShoppingCart />, tone: 'pink', title: 'Sales', desc: 'Pipeline, quotations, orders and follow-ups.' },
  { icon: <LuClipboardList />, tone: 'violet', title: 'Purchase Manager', desc: 'Vendors, quotations and purchase orders.' },
  { icon: <LuBadgeCheck />, tone: 'red', title: 'Custom User', desc: 'Exactly the permissions you tick, nothing more.' },
];

const PROCESS = [
  { icon: <LuSearch />, step: '01', title: 'Requirement Analysis', desc: 'We map your floor — stages, roles, racks and the products you actually make.', out: 'A written scope you sign off' },
  { icon: <LuSettings2 />, step: '02', title: 'Customization & Setup', desc: 'Schemas, catalogues and role permissions configured to your operation.', out: 'Your data, your fields, your branding' },
  { icon: <LuGraduationCap />, step: '03', title: 'Training & Implementation', desc: 'Each team is trained on their own workspace, not the whole system.', out: 'Role-wise sessions, on your floor' },
  { icon: <LuHeadset />, step: '04', title: 'Support & Optimization', desc: 'We stay on after go-live and tune the setup as you grow.', out: 'A named contact, not a ticket queue' },
];

/** What a plant usually looks like before, and after. */
const COMPARE = [
  { what: 'The stock figure', before: 'Three registers, three answers', after: 'One live number every team reads' },
  { what: 'Vendor bill entry', before: 'Typed at the gate, typed again in accounts', after: 'Scanned once, GRN raised from it' },
  { what: 'A shortage', before: 'Noticed when production stops', after: 'Raised the moment stock hits minimum' },
  { what: 'Order status', before: 'A phone call down to the floor', after: 'Nine stages, visible to sales' },
  { what: 'Payment follow-up', before: 'Remembered — or not', after: 'The due date turns red by itself' },
  { what: 'Month-end reporting', before: 'A night of spreadsheet work', after: 'Filter, then export to Excel' },
  { what: 'Who sees what', before: 'Everyone can open everything', after: 'Each role sees only its own work' },
];

const FAQ = [
  {
    q: 'Is this only for drag chain factories?',
    a: 'No. The drag chain catalogue and configurator are built in because that is where the product started, but the Domain Builder lets you define your own modules, fields and forms for any manufacturing sector — without code, and without waiting for a release.',
  },
  {
    q: 'How is our data kept separate from other companies?',
    a: 'Every record carries an organization id, and every single database query is scoped to it automatically at the data layer rather than in screen code. A user can only ever read their own company’s rows, even if a screen is asked for something else.',
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

const MANUFACTURING = [
  'Live production tracking with machine status per line',
  'Material requirement planning driven by real stock levels',
  'Quality checks at first and final inspection, with rework logged',
  'Rack-level inventory with live valuation in your own currency',
];

const toneVars = (tone) =>
  tone === 'primary'
    ? { fg: 'var(--primary)', bg: 'var(--primary-soft)' }
    : { fg: `var(--c-${tone})`, bg: `var(--c-${tone}-soft)` };


/* ---------------------------------------------------------- background art */

/**
 * One continuous ribbon layer behind the entire page. The viewBox is tall and
 * `preserveAspectRatio="none"` stretches it to whatever the document height
 * turns out to be; `vector-effect="non-scaling-stroke"` keeps the stroke an
 * even width despite that non-uniform scaling.
 */
const PageRibbons = () => (
  <div className="page-ribbons" aria-hidden="true">
    <svg viewBox="0 0 1200 4000" preserveAspectRatio="none" fill="none">
      {[
        { d: 'M1180 -40 C 820 420, 1180 900, 840 1380 C 520 1840, 1080 2260, 820 2760 C 600 3180, 1060 3500, 900 4040', stroke: 'var(--c-cyan)',  w: 150, o: 0.13 },
        { d: 'M1320 140 C 980 620, 1300 1060, 980 1560 C 700 2000, 1220 2420, 960 2920 C 760 3320, 1180 3640, 1040 4060', stroke: 'var(--c-pink)',  w: 110, o: 0.10 },
        { d: 'M-120 -60 C 240 400, -80 880, 300 1340 C 620 1760, 60 2220, 340 2700 C 560 3100, 100 3460, 260 4040', stroke: 'var(--primary)', w: 130, o: 0.11 },
        { d: 'M-260 220 C 120 700, -180 1120, 200 1600 C 500 2000, -60 2440, 220 2900 C 420 3260, 40 3620, 180 4060', stroke: 'var(--c-green)', w: 90,  o: 0.10 },
      ].map((r, i) => (
        <path
          key={i}
          d={r.d}
          stroke={r.stroke}
          strokeWidth={r.w}
          strokeOpacity={r.o}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  </div>
);

/** Small confetti dots over the hero, echoing the brand site's accents. */
const Specks = () => (
  <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: -1, overflow: 'hidden' }}>
    {[
      { t: '12%', l: '8%',  s: 8,  c: 'var(--primary)',  d: '0s' },
      { t: '26%', l: '92%', s: 6,  c: 'var(--c-cyan)',   d: '1.2s' },
      { t: '68%', l: '5%',  s: 10, c: 'var(--c-amber)',  d: '2.1s' },
      { t: '80%', l: '88%', s: 7,  c: 'var(--c-green)',  d: '0.6s' },
      { t: '45%', l: '48%', s: 5,  c: 'var(--c-pink)',   d: '1.8s' },
    ].map((d, i) => (
      <span
        key={i}
        className="speck"
        style={{
          top: d.t, left: d.l, width: d.s, height: d.s,
          background: d.c, opacity: 0.5, animationDelay: d.d,
        }}
      />
    ))}
  </div>
);

/* ------------------------------------------------------- module wheel */

/** The eight modules, alternating tone the way the brand diagram does. */
const WHEEL = [
  { icon: <LuShoppingCart />,   label: 'Sales & Orders',    tone: 'var(--primary)' },
  { icon: <LuHandshake />,      label: 'CRM & Pipeline',    tone: 'var(--c-green)' },
  { icon: <LuClipboardList />,  label: 'Purchase & Material', tone: 'var(--primary)' },
  { icon: <LuCog />,            label: 'Production & Quality', tone: 'var(--c-green)' },
  { icon: <LuBoxes />,          label: 'Inventory Control', tone: 'var(--primary)' },
  { icon: <LuIndianRupee />,    label: 'Finance & Accounts', tone: 'var(--c-green)' },
  { icon: <LuUsersRound />,     label: 'Payroll & HR',      tone: 'var(--primary)' },
  { icon: <LuScanLine />,       label: 'Gate Management',   tone: 'var(--c-green)' },
];

/**
 * Modules orbiting a static brand hub. The ring rotates; each item's content
 * counter-rotates at the same duration, so a label is never upside down.
 */
const ModuleWheel = ({ brandName, logoSrc }) => (
  <div className="wheel" role="img" aria-label={`${brandName} modules: ${WHEEL.map(w => w.label).join(', ')}`}>
    <div className="wheel-ring">
      {WHEEL.map((w, i) => (
        <div
          key={w.label}
          className="wheel-item"
          style={{ '--angle': `${(360 / WHEEL.length) * i}deg`, '--tone': w.tone }}
        >
          {/* the arm rotates; this box un-rotates so it stays upright */}
          <div className="wheel-item-pos">
            <div className="wheel-item-inner">
              <span className="wheel-num">{i + 1}</span>
              <span className="wheel-icon">{w.icon}</span>
              <span className="wheel-label">{w.label}</span>
            </div>
          </div>
        </div>
      ))}
    </div>

    <div className="wheel-hub">
      {logoSrc ? (
        <img src={logoSrc} alt={brandName} />
      ) : (
        <span
          style={{
            fontFamily: 'var(--font-display)', fontWeight: 800,
            fontSize: 'clamp(1rem, 2.6vw, 1.5rem)', letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
          }}
        >
          {brandName}
        </span>
      )}
      <span
        style={{
          fontSize: 'clamp(8px, 1.4vw, 10px)', fontWeight: 700,
          letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-ghost)',
        }}
      >
        Factory ERP
      </span>
    </div>
  </div>
);

/* --------------------------------------------------------------- styling */

const SHELL = {
  background: 'var(--bg-primary)',
  minHeight: '100vh',
  color: 'var(--text-primary)',
  overflowX: 'hidden',
  fontFamily: 'var(--font-body)',
  // stacking context for the page-wide ribbon layer
  position: 'relative',
  isolation: 'isolate',
};

// Full width: runs nearly edge to edge (matches web/ --page-max). Prose stays
// readable because LEAD and H2 carry their own max-width caps.
const WRAP = { maxWidth: 2100, margin: '0 auto', width: '100%' };

const SECTION = {
  ...WRAP,
  padding: 'clamp(48px, 5.2vw, 76px) clamp(16px, 2.6vw, 60px)',
};

const KICKER = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  padding: '5px 14px',
  borderRadius: 'var(--radius-control)',
  border: '1px solid var(--border-primary)',
  background: 'var(--primary-soft)',
  color: 'var(--primary)',
  fontSize: 'var(--fs-xs)',
  fontWeight: 800,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
};

const H2 = {
  fontFamily: 'var(--font-display)',
  fontSize: 'clamp(2rem, 4vw, 3rem)',
  fontWeight: 800,
  letterSpacing: '-0.035em',
  lineHeight: 1.08,
  color: 'var(--text-primary)',
  margin: '14px 0 12px',
};

const LEAD = {
  color: 'var(--text-muted)',
  fontSize: 'clamp(1rem, 1.35vw, 1.15rem)',
  lineHeight: 1.62,
  maxWidth: 640,
};

const CARD = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-xl)',
  boxShadow: 'var(--shadow-sm)',
};

/** Section heading block used by every centred section. */
const SectionHead = ({ kicker, title, lead, children }) => (
  <Reveal style={{ textAlign: 'center' }}>
    <span style={KICKER}>{kicker}</span>
    <h2 style={{ ...H2, margin: '14px auto 10px', maxWidth: 820 }}>{title}</h2>
    {lead && <p style={{ ...LEAD, margin: '0 auto 30px', textAlign: 'center' }}>{lead}</p>}
    {children}
  </Reveal>
);

/** A ticked bullet, used in every list on the page. */
const Tick = ({ children, solid = false, size = 22 }) => (
  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
    <span
      style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0, marginTop: 1,
        background: solid ? 'var(--primary)' : 'var(--primary-soft)',
        color: solid ? 'var(--on-primary)' : 'var(--primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size > 22 ? 13 : 11,
      }}
    >
      <LuCheck />
    </span>
    <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--fs-md)', lineHeight: 1.55 }}>
      {children}
    </span>
  </div>
);

/* ------------------------------------------------- product mock (hero art) */

const MockTile = ({ label, value, tone }) => (
  <div
    style={{
      flex: 1, minWidth: 0, background: 'var(--bg-card)',
      border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
      padding: '8px 10px',
    }}
  >
    <div
      style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: 'var(--text-ghost)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800,
        letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums',
        color: tone ? `var(--c-${tone})` : 'var(--text-primary)',
      }}
    >
      {value}
    </div>
  </div>
);

/** A miniature of the real app, so visitors see the product immediately. */
const ProductMock = () => {
  const rows = [
    ['S-45.1', '240', 'A-12', '₹2.1L'],
    ['S-35.2', '180', 'B-04', '₹1.4L'],
    ['S-25.1', '96', 'C-09', '₹0.7L'],
  ];

  return (
    <div
      aria-hidden="true"
      style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-xl)',
        overflow: 'hidden', display: 'flex', minHeight: 320, userSelect: 'none',
      }}
    >
      <div
        style={{
          width: 42, flexShrink: 0, background: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border)', padding: '10px 0',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        }}
      >
        <span
          style={{
            width: 24, height: 24, borderRadius: 'var(--radius-sm)',
            background: 'var(--primary)', color: 'var(--on-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, marginBottom: 6,
          }}
        >
          <LuFactory />
        </span>
        {[LuGauge, LuScanLine, LuCog, LuWarehouse, LuTruck].map((Ico, i) => (
          <span
            key={i}
            style={{
              width: 26, height: 24, borderRadius: 'var(--radius-sm)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
              background: i === 3 ? 'var(--primary-soft)' : 'transparent',
              color: i === 3 ? 'var(--primary)' : 'var(--text-ghost)',
            }}
          >
            <Ico />
          </span>
        ))}
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            height: 32, flexShrink: 0, borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', padding: '0 12px', gap: 6,
            fontSize: 11, color: 'var(--text-muted)',
          }}
        >
          <span>Store</span>
          <span style={{ color: 'var(--text-ghost)' }}>/</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Inventory</span>
        </div>

        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <MockTile label="Stock value" value="₹12.4L" tone="green" />
            <MockTile label="Items" value="1,240" />
            <MockTile label="Low stock" value="17" tone="red" />
          </div>

          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', flex: 1 }}>
            <div
              style={{
                display: 'grid', gridTemplateColumns: '1.3fr 0.7fr 0.8fr 1fr', gap: 8,
                padding: '6px 10px', background: 'var(--bg-subtle)',
                borderBottom: '1px solid var(--border)', fontSize: 9, fontWeight: 700,
                letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)',
              }}
            >
              <span>Model</span><span>Qty</span><span>Rack</span>
              <span style={{ textAlign: 'right' }}>Value</span>
            </div>
            {rows.map((r, i) => (
              <div
                key={r[0]}
                style={{
                  display: 'grid', gridTemplateColumns: '1.3fr 0.7fr 0.8fr 1fr', gap: 8,
                  padding: '7px 10px', fontSize: 11, color: 'var(--text-secondary)',
                  borderBottom: i < rows.length - 1 ? '1px solid var(--border-light)' : 'none',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{r[0]}</span>
                <span>{r[1]}</span>
                <span>{r[2]}</span>
                <span style={{ textAlign: 'right' }}>{r[3]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------ feature panels (mockups) */

/** Shared chrome for the three small feature screenshots. */
const Panel = ({ title, children }) => (
  <div className="mini-panel" aria-hidden="true">
    <div className="mini-panel-bar">
      <span className="mini-dot" style={{ background: 'var(--c-red)' }} />
      <span className="mini-dot" style={{ background: 'var(--c-amber)' }} />
      <span className="mini-dot" style={{ background: 'var(--c-green)' }} />
      <span style={{ marginLeft: 8 }}>{title}</span>
    </div>
    <div style={{ padding: 16 }}>{children}</div>
  </div>
);

const ValuationPanel = () => (
  <Panel title="Store • Unified Inventory">
    <div
      style={{
        borderRadius: 'var(--radius-lg)', padding: '14px 16px', marginBottom: 14,
        background: 'var(--primary-soft)', border: '1px solid var(--border-primary)',
      }}
    >
      <div style={{ fontSize: 'var(--fs-2xs)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--primary)' }}>
        Total stock valuation
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.9rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
        ₹ 12,41,820
      </div>
    </div>
    {[
      ['Chain link 45.5 OP', '2,400 pcs', 'A-12', '₹3,84,000'],
      ['Nylon granules', '860 kg', 'B-04', '₹2,15,000'],
      ['Bracket LSR(P)', '1,120 pcs', 'C-09', '₹1,34,400'],
    ].map((r, i) => (
      <div
        key={r[0]}
        style={{
          display: 'grid', gridTemplateColumns: '1.6fr 0.9fr 0.6fr 1fr', gap: 8,
          padding: '9px 0', fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)',
          borderTop: i === 0 ? 'none' : '1px solid var(--border-light)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{r[0]}</span>
        <span>{r[1]}</span>
        <span>{r[2]}</span>
        <span style={{ textAlign: 'right', fontWeight: 700, color: 'var(--c-green)' }}>{r[3]}</span>
      </div>
    ))}
  </Panel>
);

const ScanPanel = () => (
  <Panel title="Gate • Inward Entry">
    <div style={{ display: 'flex', gap: 14, alignItems: 'stretch' }}>
      <div
        style={{
          width: 96, flexShrink: 0, borderRadius: 'var(--radius-lg)',
          border: '1px dashed var(--border-strong)', background: 'var(--bg-subtle)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 6, color: 'var(--text-ghost)',
        }}
      >
        <span style={{ fontSize: '1.6rem', color: 'var(--primary)' }}><LuQrCode /></span>
        <span style={{ fontSize: 'var(--fs-2xs)', fontWeight: 700, textAlign: 'center', lineHeight: 1.3 }}>
          BILL<br />SCANNED
        </span>
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 8 }}>
        {[
          ['Vendor', 'Shakti Polymers Pvt Ltd'],
          ['Invoice no.', 'SP/2026/4417'],
          ['Total', '₹1,84,260'],
          ['Tax (18%)', '₹28,107'],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 'var(--fs-sm)' }}>
            <span style={{ color: 'var(--text-muted)' }}>{k}</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 650, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{v}</span>
          </div>
        ))}
        <div
          style={{
            marginTop: 2, display: 'inline-flex', alignItems: 'center', gap: 6,
            alignSelf: 'flex-start', padding: '5px 11px', borderRadius: 'var(--radius-control)',
            background: 'var(--c-green-soft)', color: 'var(--c-green)',
            fontSize: 'var(--fs-xs)', fontWeight: 700,
          }}
        >
          <LuCircleCheck /> GRN-2026-0184 generated
        </div>
      </div>
    </div>
  </Panel>
);

const CreditPanel = () => (
  <Panel title="Sales • Pipeline">
    {[
      { c: 'Aarav Engineering', d: 'Due 12 Mar', status: 'paid' },
      { c: 'Neelkanth Automation', d: 'Due 02 Mar', status: 'overdue' },
      { c: 'Sahyadri Machine Tools', d: 'Due 28 Mar', status: 'open' },
    ].map((r, i) => {
      const tone = r.status === 'overdue' ? 'red' : r.status === 'paid' ? 'green' : 'slate';
      const label = r.status === 'overdue' ? 'CREDIT OVERDUE' : r.status === 'paid' ? 'PAID' : 'WITHIN CREDIT';
      return (
        <div
          key={r.c}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
            padding: '11px 12px', marginBottom: i === 2 ? 0 : 8,
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${r.status === 'overdue' ? 'var(--c-red)' : 'var(--border)'}`,
            background: r.status === 'overdue' ? 'var(--c-red-soft)' : 'var(--bg-primary)',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 650, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {r.c}
            </div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{r.d}</div>
          </div>
          <span
            style={{
              flexShrink: 0, padding: '4px 9px', borderRadius: 'var(--radius-control)',
              background: `var(--c-${tone}-soft)`, color: `var(--c-${tone})`,
              fontSize: 'var(--fs-2xs)', fontWeight: 800, letterSpacing: '0.04em',
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}
          >
            {r.status === 'overdue' && <LuTriangleAlert />}
            {label}
          </span>
        </div>
      );
    })}
  </Panel>
);

const PANELS = { valuation: <ValuationPanel />, scan: <ScanPanel />, credit: <CreditPanel /> };

/* -------------------------------------------------------------- component */

const Landing = () => {
  const { settings } = useOrg();
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [supportForm, setSupportForm] = useState({
    name: '',
    email: '',
    mobile: '',
    concern: ''
  });
  const [supportLoading, setSupportLoading] = useState(false);

  // The contact section carries its own copy of the form, so a visitor who
  // scrolls to the bottom never has to open a dialog to reach us.
  const [inlineForm, setInlineForm] = useState({ name: '', email: '', mobile: '', concern: '' });
  const [inlineLoading, setInlineLoading] = useState(false);

  const submitTicket = async (payload) => {
    if (!payload.name || !payload.email || !payload.mobile || !payload.concern) {
      toast.error('Please fill in all fields');
      return false;
    }
    await supportAPI.createTicket(payload);
    return true;
  };

  const handleSupportSubmit = async (e) => {
    e.preventDefault();
    setSupportLoading(true);
    try {
      const ok = await submitTicket(supportForm);
      if (!ok) return;
      toast.success('Your concern has been submitted! Support email has been sent.');
      setSupportForm({ name: '', email: '', mobile: '', concern: '' });
      setIsSupportOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit concern');
    } finally {
      setSupportLoading(false);
    }
  };

  const handleInlineSubmit = async (e) => {
    e.preventDefault();
    setInlineLoading(true);
    try {
      const ok = await submitTicket(inlineForm);
      if (!ok) return;
      toast.success('Thank you! We will get back to you within one working day.');
      setInlineForm({ name: '', email: '', mobile: '', concern: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit your request');
    } finally {
      setInlineLoading(false);
    }
  };

  const brandName = settings?.brandName || 'TrackBells';
  // The stored brand name often already ends in "ERP" ("TrackBells ERP"), so
  // strip it before appending — otherwise headings read "TrackBells ERP ERP".
  const brandBase = brandName.replace(/\s*ERP\s*$/i, '').trim() || brandName;
  const logo = settings?.logo;
  const hasImageLogo = logo && /^(https?:|\/|data:|blob:)/.test(logo);
  // Fall back to the bundled mark, so the wheel hub, nav and footer always
  // carry the logo even before an organization uploads its own.
  const logoSrc = hasImageLogo
    ? (logo.includes('logo.png') ? '/logo.png' : getImageUrl(logo))
    : '/logo.png';

  /** Social icons: a link when a URL is configured, decoration when not. */
  const renderSocials = (opacity = 0.8) =>
    SOCIALS.map((s) =>
      s.url ? (
        <a
          key={s.label}
          href={s.url}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={s.label}
          style={{ display: 'flex', opacity }}
        >
          {s.icon}
        </a>
      ) : (
        <span key={s.label} aria-hidden="true" style={{ display: 'flex', opacity: opacity * 0.7 }}>
          {s.icon}
        </span>
      )
    );

  return (
    <div className="landing-shell" style={SHELL}>
      <PageRibbons />

      {/* ============================================== UTILITY BAR ===== */}
      {/* on-brand: dark contact strip, light text is intentional here */}
      <div style={{ background: '#131317', color: 'rgba(255,255,255,0.78)', fontSize: 'var(--fs-xs)' }}>
        <div
          style={{
            ...WRAP, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 12, flexWrap: 'wrap', padding: '8px clamp(16px, 2.6vw, 60px)',
          }}
        >
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            <a href="tel:+919915865939" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <LuPhone /> +91 99158 65939
            </a>
            <a href="mailto:info.cyberbells@gmail.com" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <LuMail /> info.cyberbells@gmail.com
            </a>
            <span className="hide-on-mobile" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, opacity: 0.8 }}>
              <LuClock /> Mon – Sat, 9:30am – 6:30pm IST
            </span>
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: '0.95rem' }}>
            {renderSocials(0.8)}
          </div>
        </div>
      </div>

      {/* ===================================================== NAV ===== */}
      <nav
        style={{
          position: 'sticky', top: 0, zIndex: 900,
          background: 'color-mix(in srgb, var(--bg-card) 86%, transparent)',
          backdropFilter: 'saturate(180%) blur(16px)',
          WebkitBackdropFilter: 'saturate(180%) blur(16px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            ...WRAP, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 16, padding: '12px clamp(16px, 2.6vw, 60px)',
          }}
        >
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            {logoSrc ? (
              <img
                src={logoSrc}
                alt={brandName}
                style={{ height: 48, width: 'auto', objectFit: 'contain', display: 'block' }}
              />
            ) : (
              <>
                <span
                  style={{
                    width: 32, height: 32, borderRadius: 'var(--radius-md)',
                    background: 'var(--primary)', color: 'var(--on-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <LuFactory />
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--fs-lg)',
                    letterSpacing: '-0.02em', color: 'var(--text-primary)', whiteSpace: 'nowrap',
                  }}
                >
                  {brandName}
                </span>
              </>
            )}
          </Link>

          <div className="hide-on-mobile" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="nav-link"
                style={{
                  fontSize: 'var(--fs-md)', fontWeight: 600,
                  color: 'var(--text-secondary)', whiteSpace: 'nowrap',
                }}
              >
                {n.label}
              </a>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link to="/login" className="hide-on-mobile">
              <Button variant="secondary" size="sm">Sign in</Button>
            </Link>
            <Button variant="primary" size="sm" onClick={() => setIsSupportOpen(true)}>
              Request a Demo
            </Button>
          </div>
        </div>
      </nav>

      {/* ==================================================== HERO ===== */}
      <section style={{ position: 'relative', isolation: 'isolate' }}>
        <Specks />
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: -1, overflow: 'hidden' }}>
          <span
            className="blob"
            style={{
              width: 420, height: 420, top: '-14%', right: '-6%',
              background: 'color-mix(in srgb, var(--primary) 26%, transparent)',
            }}
          />
          <span
            className="blob b2"
            style={{
              width: 340, height: 340, bottom: '-18%', left: '-8%',
              background: 'color-mix(in srgb, var(--c-cyan) 20%, transparent)',
            }}
          />
          <span
            className="blob b3"
            style={{
              width: 280, height: 280, top: '32%', left: '38%',
              background: 'color-mix(in srgb, var(--c-amber) 16%, transparent)',
            }}
          />
        </div>
        <div
          style={{
            ...SECTION,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px, 100%), 1fr))',
            gap: 'clamp(32px, 5vw, 60px)',
            alignItems: 'center',
          }}
        >
          <Reveal dir="from-left">
            <span style={KICKER} className="pulse-ring"><LuFactory /> Factory Automation</span>

            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.6rem, 5.6vw, 4.4rem)',
                fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 1.02,
                color: 'var(--text-primary)', margin: '20px 0 18px',
              }}
            >
              Grow your factory with{' '}
              <span className="grad-text">{brandBase} ERP</span>
            </h1>

            <p style={{ ...LEAD, marginBottom: 26, fontSize: 'clamp(1.05rem, 1.5vw, 1.25rem)' }}>
              From the moment a vehicle reaches your gate to the day the order ships &mdash;
              production, quality, stock and dispatch run on one connected system that
              the whole plant can see.
            </p>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 22 }}>
              <Button variant="primary" size="lg" iconRight={<LuArrowRight />} onClick={() => setIsSupportOpen(true)}>
                Register for Demo
              </Button>
              <a href="#solution">
                <Button variant="secondary" size="lg">Explore Solutions</Button>
              </a>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
              {HERO_TAGS.map((t) => (
                <span
                  key={t.label}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    padding: '7px 14px', borderRadius: 'var(--radius-control)',
                    border: '1px solid var(--border)', background: 'var(--bg-card)',
                    color: 'var(--text-secondary)', fontSize: 'var(--fs-md)', fontWeight: 600,
                  }}
                >
                  <span style={{ color: 'var(--primary)', display: 'flex' }}>{t.icon}</span>
                  {t.label}
                </span>
              ))}
            </div>

            <div
              style={{
                display: 'flex', gap: 'clamp(12px, 2.4vw, 24px)', flexWrap: 'wrap',
                paddingTop: 18, borderTop: '1px solid var(--border)',
              }}
            >
              {HERO_PROOF.map((p) => (
                <span
                  key={p.text}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', fontWeight: 600,
                  }}
                >
                  <span style={{ color: 'var(--c-green)', display: 'flex' }}>{p.icon}</span>
                  {p.text}
                </span>
              ))}
            </div>
          </Reveal>

          <Reveal dir="from-right" delay={0.12}>
            <ModuleWheel brandName={brandBase} logoSrc={logoSrc} />
          </Reveal>
        </div>
      </section>

      {/* ================================================= CLIENTS ===== */}
      <section className="band" style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', position: 'relative' }}>
        <div style={{ ...WRAP, padding: 'clamp(30px, 4vw, 44px) 0 clamp(22px, 3vw, 30px)', textAlign: 'center' }}>
          <Reveal>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', fontWeight: 600, letterSpacing: '0.04em', padding: '0 clamp(16px, 2.6vw, 60px)' }}>
              Trusted across Manufacturing, Retail &amp; Services
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 45%), 1fr))',
                gap: 'clamp(16px, 3vw, 28px)',
                marginTop: 22, padding: '0 clamp(16px, 2.6vw, 60px)',
              }}
            >
              {[
                { icon: <LuLayers />, v: '260+', l: 'Chain models' },
                { icon: <LuRoute />, v: '9', l: 'Order stages' },
                { icon: <LuUsersRound />, v: '16', l: 'Role workspaces' },
                { icon: <LuBoxes />, v: '12', l: 'Connected modules' },
                { icon: <LuLock />, v: '100%', l: 'Tenant isolation' },
              ].map((s) => (
                <div
                  key={s.l}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    padding: '4px 8px',
                  }}
                >
                  <span style={{ color: 'var(--primary)', fontSize: '1.15rem', display: 'flex', marginBottom: 4, opacity: 0.85 }}>
                    {s.icon}
                  </span>
                  <div
                    style={{
                      fontFamily: 'var(--font-display)', fontSize: 'clamp(1.7rem, 3.2vw, 2.4rem)',
                      fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.03em',
                      fontVariantNumeric: 'tabular-nums', lineHeight: 1.1,
                    }}
                  >
                    <CountUp value={s.v} />
                  </div>
                  <div style={{ fontSize: 'var(--fs-md)', color: 'var(--text-muted)' }}>{s.l}</div>
                </div>
              ))}
            </div>
          </Reveal>

          {/* scrolling capability strip */}
          <div className="marquee-mask" style={{ marginTop: 26, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
            <div className="marquee-track" style={{ gap: 10 }}>
              {[...MARQUEE, ...MARQUEE].map((m, i) => (
                <span
                  key={`${m}-${i}`}
                  style={{
                    flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 7,
                    padding: '7px 15px', marginRight: 10, borderRadius: 'var(--radius-control)',
                    border: '1px solid var(--border)', background: 'var(--bg-card)',
                    color: 'var(--text-secondary)', fontSize: 'var(--fs-sm)',
                    fontWeight: 600, whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ color: 'var(--primary)', display: 'flex', fontSize: 12 }}><LuCheck /></span>
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================ SOLUTION ===== */}
      <section id="solution" style={SECTION}>
        <SectionHead
          kicker="What We Do"
          title="One platform for the whole operation"
          lead="Each module is built for the people who actually use it — and they all share the same data, so nobody reconciles spreadsheets at the end of the day."
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(250px, 100%), 1fr))',
            gap: 18,
          }}
        >
          {SOLUTIONS.map((s, i) => {
            const t = toneVars(s.tone);
            return (
              <Reveal key={s.title} delay={i * 0.08}>
                <div
                  className="lift mod-card"
                  style={{ ...CARD, height: '100%', padding: 24, display: 'flex', flexDirection: 'column', '--tone': t.fg }}
                >
                  <span
                    className="chip-icon"
                    style={{
                      width: 46, height: 46, borderRadius: 'var(--radius-lg)',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      background: t.bg, color: t.fg, fontSize: '1.3rem', marginBottom: 16,
                    }}
                  >
                    {s.icon}
                  </span>
                  <h3
                    style={{
                      fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 700,
                      color: 'var(--text-primary)', marginBottom: 8, letterSpacing: '-0.015em',
                    }}
                  >
                    {s.title}
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-md)', lineHeight: 1.6, marginBottom: 14 }}>
                    {s.desc}
                  </p>

                  <div style={{ display: 'grid', gap: 8, marginTop: 'auto', paddingTop: 14, borderTop: '1px solid var(--border-light)' }}>
                    {s.points.map((p) => (
                      <div key={p} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <span style={{ color: t.fg, display: 'flex', marginTop: 3, fontSize: 11, flexShrink: 0 }}>
                          <LuCheck />
                        </span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--fs-sm)', lineHeight: 1.5 }}>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ================================================= MODULES ===== */}
      <section
        id="modules"
        className="band grid-bg"
        style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', position: 'relative' }}
      >
        <div style={SECTION}>
          <SectionHead
            kicker="Modules"
            title="Twelve modules, one shared record"
            lead="Turn on what your plant needs and leave the rest off. Whatever is on, it reads and writes the same data — so a gate entry becomes stock, and stock becomes an invoice, without anyone re-typing it."
          />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(310px, 100%), 1fr))',
              gap: 16,
            }}
          >
            {MODULES.map((m, i) => {
              const t = toneVars(m.tone);
              return (
                <Reveal key={m.title} delay={(i % 3) * 0.06}>
                  <div
                    className="lift mod-card"
                    style={{ ...CARD, height: '100%', padding: '22px 20px', '--tone': t.fg }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <span
                        className="chip-icon"
                        style={{
                          width: 40, height: 40, borderRadius: 'var(--radius-lg)', flexShrink: 0,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          background: t.bg, color: t.fg, fontSize: '1.15rem',
                        }}
                      >
                        {m.icon}
                      </span>
                      <h3
                        style={{
                          fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700,
                          color: 'var(--text-primary)', letterSpacing: '-0.015em', lineHeight: 1.25,
                        }}
                      >
                        {m.title}
                      </h3>
                    </div>

                    <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', lineHeight: 1.55, marginBottom: 14 }}>
                      {m.desc}
                    </p>

                    <div style={{ display: 'grid', gap: 7 }}>
                      {m.points.map((p) => (
                        <div key={p} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <span style={{ color: t.fg, display: 'flex', marginTop: 4, fontSize: 10, flexShrink: 0 }}>
                            <LuCheck />
                          </span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--fs-sm)', lineHeight: 1.5 }}>{p}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>

          <Reveal style={{ textAlign: 'center', marginTop: 34 }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-md)', marginBottom: 14 }}>
              Need a module that is not on this list? The Domain Builder adds it without a code change.
            </p>
            <Button variant="primary" iconRight={<LuArrowUpRight />} onClick={() => setIsSupportOpen(true)}>
              Talk to us about your modules
            </Button>
          </Reveal>
        </div>
      </section>

      {/* ================================================ WORKFLOW ===== */}
      <section id="workflow" style={SECTION}>
        <SectionHead
          kicker="Order Lifecycle"
          title="Nine stages from first call to proof of delivery"
          lead="Every order carries its own stage. Sales can see where it is without walking to the floor, and the floor can see what is coming without waiting for an email."
        >
          {/* compact flow rail */}
          <div
            className="hide-on-mobile"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 6, flexWrap: 'wrap', marginBottom: 34,
            }}
          >
            {WORKFLOW.map((w, i) => (
              <React.Fragment key={w.n}>
                <span
                  style={{
                    padding: '6px 12px', borderRadius: 'var(--radius-control)',
                    border: '1px solid var(--border)', background: 'var(--bg-card)',
                    fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {w.title}
                </span>
                {i < WORKFLOW.length - 1 && (
                  <span style={{ color: 'var(--text-ghost)', display: 'flex', fontSize: 11 }}>
                    <LuArrowRight />
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        </SectionHead>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(290px, 100%), 1fr))',
            gap: 16,
          }}
        >
          {WORKFLOW.map((w, i) => {
            const t = toneVars(w.tone);
            return (
              <Reveal key={w.n} delay={(i % 3) * 0.07}>
                <div
                  className="lift"
                  style={{
                    ...CARD, height: '100%', padding: '22px 20px', position: 'relative',
                    overflow: 'hidden', borderLeft: `3px solid ${t.fg}`, '--tone': t.fg,
                  }}
                >
                  <span className="ghost-num" style={{ '--tone': t.fg }}>{w.n}</span>

                  <span
                    className="chip-icon"
                    style={{
                      width: 42, height: 42, borderRadius: '50%',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      background: t.bg, color: t.fg, fontSize: '1.15rem', marginBottom: 14,
                    }}
                  >
                    {w.icon}
                  </span>

                  <div
                    style={{
                      fontSize: 'var(--fs-2xs)', fontWeight: 800, letterSpacing: '0.12em',
                      color: t.fg, marginBottom: 4, textTransform: 'uppercase',
                    }}
                  >
                    Stage {w.n}
                  </div>
                  <h3
                    style={{
                      fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700,
                      color: 'var(--text-primary)', marginBottom: 7, letterSpacing: '-0.015em',
                    }}
                  >
                    {w.title}
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', lineHeight: 1.6 }}>
                    {w.desc}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* =================================================== ABOUT ===== */}
      <section id="about" className="band" style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', position: 'relative' }}>
        <div
          style={{
            ...SECTION,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(380px, 100%), 1fr))',
            gap: 'clamp(28px, 5vw, 56px)',
            alignItems: 'center',
          }}
        >
          <Reveal dir="from-left">
            <span style={KICKER}>About Us</span>
            <h2 style={H2}>Built on the shop floor, not in a boardroom</h2>
            <p style={{ ...LEAD, marginBottom: 16 }}>
              {brandName} began with a simple observation: most factory software is written
              for accountants, then handed to operators. So we built the opposite &mdash; a system
              designed around the person doing the job, whether that is a guard logging a
              truck at 6am or a checker rejecting a batch at the final inspection.
            </p>
            <p style={{ ...LEAD, marginBottom: 22 }}>
              Today {brandName} runs the full manufacturing cycle for drag chain and allied
              engineering plants &mdash; gate to godown, lead to dispatch &mdash; with each company&apos;s
              data isolated at the database layer.
            </p>

            <div style={{ display: 'grid', gap: 12 }}>
              {[
                'Domain-built for manufacturing, not a generic ERP with a factory skin',
                'Role-based workspaces so every team sees only their own work',
                'Deployed, trained and supported by the team that built it',
              ].map((t) => <Tick key={t}>{t}</Tick>)}
            </div>
          </Reveal>

          <Reveal dir="from-right" delay={0.1}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
              {[
                { icon: <LuWorkflow />, v: 'Gate → Godown', l: 'Full cycle coverage', tone: 'primary' },
                { icon: <LuDatabase />, v: 'Multi-tenant', l: 'Isolated per company', tone: 'violet' },
                { icon: <LuBellRing />, v: 'Real-time', l: 'Socket-driven updates', tone: 'green' },
                { icon: <LuBlocks />, v: 'Configurable', l: 'Schemas per industry', tone: 'cyan' },
              ].map((c) => {
                const t = toneVars(c.tone);
                return (
                  <div
                    key={c.l}
                    className="lift"
                    style={{
                      background: 'var(--bg-primary)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-xl)', padding: '22px 16px', textAlign: 'center',
                    }}
                  >
                    <span
                      className="chip-icon"
                      style={{
                        width: 38, height: 38, borderRadius: '50%', margin: '0 auto 10px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: t.bg, color: t.fg, fontSize: '1.05rem',
                      }}
                    >
                      {c.icon}
                    </span>
                    <div
                      style={{
                        fontFamily: 'var(--font-display)', fontWeight: 800,
                        fontSize: 'var(--fs-md)', color: t.fg, letterSpacing: '-0.02em',
                      }}
                    >
                      {c.v}
                    </div>
                    <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', marginTop: 4 }}>{c.l}</div>
                  </div>
                );
              })}

              <div
                style={{
                  gridColumn: '1 / -1', background: 'var(--bg-primary)',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)',
                  padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14,
                }}
              >
                <span
                  style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--primary-soft)', color: 'var(--primary)', fontSize: '1.1rem',
                  }}
                >
                  <LuSmartphone />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--fs-md)' }}>
                    Runs where the work happens
                  </div>
                  <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Desk, tablet at the gate, or a phone used as a barcode scanner.
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================================================= WHY ERP ===== */}
      <section id="why-erp" style={SECTION}>
        <SectionHead
          kicker="Why ERP"
          title="What changes when the floor shares one system"
          lead="Not features — outcomes. These are the four things plants notice in the first month."
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(250px, 100%), 1fr))',
            gap: 18,
          }}
        >
          {WHY_ERP.map((w, i) => (
            <Reveal key={w.title} delay={i * 0.08}>
              <div className="lift" style={{ ...CARD, height: '100%', padding: 22, display: 'flex', flexDirection: 'column' }}>
                <span
                  className="chip-icon"
                  style={{
                    width: 44, height: 44, borderRadius: '50%', display: 'inline-flex',
                    alignItems: 'center', justifyContent: 'center', background: 'var(--primary-soft)',
                    color: 'var(--primary)', fontSize: '1.2rem', marginBottom: 14,
                  }}
                >
                  {w.icon}
                </span>
                <h3
                  style={{
                    fontFamily: 'var(--font-display)', fontSize: '1.1rem',
                    fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6,
                    letterSpacing: '-0.015em',
                  }}
                >
                  {w.title}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-md)', lineHeight: 1.6, marginBottom: 14 }}>
                  {w.desc}
                </p>
                <span
                  style={{
                    marginTop: 'auto', alignSelf: 'flex-start', padding: '4px 11px',
                    borderRadius: 'var(--radius-control)', background: 'var(--primary-soft)',
                    color: 'var(--primary)', fontSize: 'var(--fs-xs)', fontWeight: 700,
                  }}
                >
                  {w.metric}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============================================== DEEP DIVE ===== */}
      <section className="band" style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', position: 'relative' }}>
        <div style={SECTION}>
          <SectionHead
            kicker="In Detail"
            title="Three things you will feel in week one"
            lead="Small pieces of the product, shown rather than described."
          />

          <div style={{ display: 'grid', gap: 'clamp(40px, 6vw, 72px)' }}>
            {DEEP_DIVE.map((d, i) => {
              const flip = i % 2 === 1;
              return (
                <div
                  key={d.title}
                  // .row-flip swaps the two columns from 900px up; below that
                  // the copy always comes first, whichever way the row reads.
                  className={flip ? 'row-flip' : undefined}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(360px, 100%), 1fr))',
                    gap: 'clamp(28px, 5vw, 56px)',
                    alignItems: 'center',
                  }}
                >
                  <Reveal dir={flip ? 'from-right' : 'from-left'}>
                    <span style={KICKER}>{d.kicker}</span>
                    <h3
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 'clamp(1.5rem, 2.8vw, 2.1rem)', fontWeight: 800,
                        letterSpacing: '-0.03em', lineHeight: 1.15,
                        color: 'var(--text-primary)', margin: '14px 0 12px',
                      }}
                    >
                      {d.title}
                    </h3>
                    <p style={{ ...LEAD, marginBottom: 20, fontSize: 'var(--fs-md)' }}>{d.lead}</p>
                    <div style={{ display: 'grid', gap: 12 }}>
                      {d.points.map((p) => <Tick key={p}>{p}</Tick>)}
                    </div>
                  </Reveal>

                  <Reveal dir={flip ? 'from-left' : 'from-right'} delay={0.1}>
                    {PANELS[d.panel]}
                  </Reveal>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================================================== WHY US ===== */}
      <section id="why-us" style={SECTION}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(380px, 100%), 1fr))',
            gap: 'clamp(28px, 5vw, 56px)',
            alignItems: 'center',
          }}
        >
          <Reveal dir="from-left">
            <span style={KICKER}>Why Us</span>
            <h2 style={H2}>Why choose {brandBase} ERP</h2>
            <p style={{ ...LEAD, marginBottom: 24 }}>
              Generic ERP asks your factory to change shape. This one already knows what a
              pitch, a bending radius and a GRN are.
            </p>
            <div style={{ display: 'grid', gap: 14 }}>
              {WHY_US.map((t) => <Tick key={t} solid size={26}>{t}</Tick>)}
            </div>
          </Reveal>

          <Reveal dir="from-right" delay={0.1}>
            <div className="float-slow"><ProductMock /></div>
          </Reveal>
        </div>
      </section>

      {/* =================================================== ROLES ===== */}
      <section
        id="roles"
        className="band grid-bg"
        style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', position: 'relative' }}
      >
        <div style={SECTION}>
          <SectionHead
            kicker="Role Workspaces"
            title="Everyone gets their own screen, not the whole system"
            lead="A guard opens the app and sees gate passes. A checker sees inspections. Nobody scrolls past nine modules to reach the one they need — and nobody sees what they should not."
          />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(250px, 100%), 1fr))',
              gap: 14,
            }}
          >
            {ROLES.map((r, i) => {
              const t = toneVars(r.tone);
              return (
                <Reveal key={r.title} delay={(i % 4) * 0.05}>
                  <div
                    className="role-card"
                    style={{
                      height: '100%', background: 'var(--bg-primary)',
                      border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
                      padding: '16px 16px', display: 'flex', gap: 12, alignItems: 'flex-start',
                    }}
                  >
                    <span
                      style={{
                        width: 36, height: 36, borderRadius: 'var(--radius-md)', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: t.bg, color: t.fg, fontSize: '1rem',
                      }}
                    >
                      {r.icon}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--fs-md)', marginBottom: 3 }}>
                        {r.title}
                      </div>
                      <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        {r.desc}
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================================================= PROCESS ===== */}
      <section style={SECTION}>
        <SectionHead
          kicker="Work Process"
          title="Our simple, efficient work process"
          lead="Four stages from the first conversation to a plant running on it — with a named person on our side at every one."
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(230px, 100%), 1fr))',
            gap: 18,
          }}
        >
          {PROCESS.map((p, i) => (
            <Reveal key={p.step} delay={i * 0.1}>
              <div className="lift" style={{ position: 'relative', textAlign: 'center', padding: '0 6px', background: 'transparent', border: 'none' }}>
                {/* connector to the next step, hidden on the last and on small screens */}
                {i < PROCESS.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="hide-on-mobile connector"
                    style={{
                      position: 'absolute', top: 34, left: 'calc(50% + 44px)', right: -20,
                      height: 2, background: 'var(--border)',
                    }}
                  />
                )}
                <span
                  className="chip-icon"
                  style={{
                    position: 'relative', zIndex: 1,
                    width: 68, height: 68, borderRadius: '50%',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--primary-soft)', color: 'var(--primary)',
                    border: '2px solid var(--bg-primary)', fontSize: '1.6rem', marginBottom: 14,
                  }}
                >
                  {p.icon}
                </span>
                <div
                  style={{
                    fontSize: 'var(--fs-2xs)', fontWeight: 800, letterSpacing: '0.12em',
                    color: 'var(--primary)', marginBottom: 4,
                  }}
                >
                  STEP {p.step}
                </div>
                <h3
                  style={{
                    fontFamily: 'var(--font-display)', fontSize: '1.1rem',
                    fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6,
                    letterSpacing: '-0.015em',
                  }}
                >
                  {p.title}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-md)', lineHeight: 1.55, marginBottom: 10 }}>
                  {p.desc}
                </p>
                <span
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '4px 11px', borderRadius: 'var(--radius-control)',
                    background: 'var(--bg-subtle)', border: '1px solid var(--border)',
                    color: 'var(--text-secondary)', fontSize: 'var(--fs-xs)', fontWeight: 600,
                  }}
                >
                  <LuBadgeCheck style={{ color: 'var(--c-green)' }} /> {p.out}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============================================== DEMO BAND ===== */}
      <section style={{ padding: '0 clamp(16px, 2.6vw, 60px)' }}>
        <Reveal style={WRAP}>
          {/* on-brand: solid primary fill, so white text and white rules are correct */}
          <div
            style={{
              position: 'relative', overflow: 'hidden', isolation: 'isolate',
              borderRadius: 'var(--radius-2xl)', background: 'var(--primary)',
              padding: 'clamp(32px, 6vw, 56px) clamp(20px, 5vw, 48px)', textAlign: 'center',
            }}
          >
            {/* on-brand: blueprint rules on the solid primary fill */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute', inset: 0, zIndex: -1,
                // on-brand: rules drawn on the solid primary fill
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
                backgroundSize: '32px 32px',
                maskImage: 'radial-gradient(ellipse at 50% 50%, #000 20%, transparent 72%)',
                WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%, #000 20%, transparent 72%)',
              }}
            />
            <h2
              style={{
                fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 3.4vw, 2.2rem)',
                fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', marginBottom: 12,
              }}
            >
              Get your free demo today
            </h2>
            <p
              style={{
                color: 'rgba(255,255,255,0.9)', fontSize: 'var(--fs-md)',
                maxWidth: 540, margin: '0 auto 24px', lineHeight: 1.65,
              }}
            >
              We will walk you through your own floor &mdash; gate, production, quality, store
              and dispatch &mdash; using your products and your racks.
            </p>
            {/* on-brand: inverted button on the primary fill */}
            <Button
              size="lg"
              iconRight={<LuArrowRight />}
              onClick={() => setIsSupportOpen(true)}
              style={{ background: '#fff', color: 'var(--primary)', borderColor: '#fff' }}
            >
              Register for Demo
            </Button>

            <div
              style={{
                display: 'flex', gap: 'clamp(14px, 3vw, 34px)', justifyContent: 'center',
                flexWrap: 'wrap', marginTop: 26, paddingTop: 22,
                borderTop: '1px solid rgba(255,255,255,0.18)',
              }}
            >
              {[
                { icon: <LuTimer />, t: 'A 30-minute walkthrough' },
                { icon: <LuPercent />, t: 'No obligation, no scripted deck' },
                { icon: <LuUserCheck />, t: 'Run on your own product data' },
              ].map((x) => (
                <span
                  key={x.t}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    color: 'rgba(255,255,255,0.92)', fontSize: 'var(--fs-sm)', fontWeight: 600,
                  }}
                >
                  <span style={{ display: 'flex' }}>{x.icon}</span> {x.t}
                </span>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ========================================== MANUFACTURING ===== */}
      <section style={SECTION}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(380px, 100%), 1fr))',
            gap: 'clamp(28px, 5vw, 56px)',
            alignItems: 'center',
          }}
        >
          <Reveal dir="from-left">
            <div style={{ ...CARD, borderRadius: 'var(--radius-2xl)', padding: 24, boxShadow: 'var(--shadow-md)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                {[
                  { icon: <LuWorkflow />, v: '9', l: 'Order stages' },
                  { icon: <LuQrCode />, v: 'OCR', l: 'Bill scanning' },
                  { icon: <LuIndianRupee />, v: 'Live', l: 'Stock value' },
                  { icon: <LuClipboardList />, v: '260+', l: 'Chain models' },
                  { icon: <LuLayers />, v: '12', l: 'Modules' },
                  { icon: <LuUsersRound />, v: '16', l: 'Roles' },
                ].map((x) => (
                  <div
                    key={x.l}
                    style={{
                      background: 'var(--bg-primary)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-lg)', padding: '16px 12px', textAlign: 'center',
                    }}
                  >
                    <span style={{ color: 'var(--primary)', fontSize: '1.2rem', display: 'block', marginBottom: 6 }}>
                      {x.icon}
                    </span>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--text-primary)' }}>{x.v}</div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{x.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal dir="from-right" delay={0.1}>
            <span style={KICKER}>Manufacturing</span>
            <h2 style={H2}>{brandBase} ERP for manufacturing</h2>
            <p style={{ ...LEAD, marginBottom: 22 }}>
              Built around how a plant actually runs &mdash; machines, batches, racks and
              inspections &mdash; rather than around a chart of accounts.
            </p>
            <div style={{ display: 'grid', gap: 14 }}>
              {MANUFACTURING.map((t) => <Tick key={t} size={26}>{t}</Tick>)}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================================================ COMPARE ===== */}
      <section className="band" style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', position: 'relative' }}>
        <div style={SECTION}>
          <SectionHead
            kicker="Before & After"
            title="The same plant, six weeks apart"
            lead="Nothing here is exotic. It is the ordinary friction of running a factory on registers and WhatsApp, removed."
          />

          <Reveal>
            <div style={{ ...CARD, borderRadius: 'var(--radius-2xl)', overflow: 'hidden' }}>
              {/* header */}
              <div
                className="hide-on-mobile"
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 1.3fr 1.3fr', gap: 12,
                  padding: '14px 20px', background: 'var(--bg-subtle)',
                  borderBottom: '1px solid var(--border)',
                  fontSize: 'var(--fs-xs)', fontWeight: 800,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>What</span>
                <span style={{ color: 'var(--c-red)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <LuX /> Before
                </span>
                <span style={{ color: 'var(--c-green)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <LuCheck /> With {brandBase}
                </span>
              </div>

              {COMPARE.map((c, i) => (
                <div
                  key={c.what}
                  className="cmp-row"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))',
                    gap: 10, padding: '14px 20px',
                    borderBottom: i < COMPARE.length - 1 ? '1px solid var(--border-light)' : 'none',
                  }}
                >
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--fs-md)' }}>
                    {c.what}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: 'var(--text-muted)', fontSize: 'var(--fs-md)' }}>
                    <span style={{ color: 'var(--c-red)', display: 'flex', marginTop: 4, fontSize: 11, flexShrink: 0 }}><LuX /></span>
                    {c.before}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: 'var(--text-secondary)', fontSize: 'var(--fs-md)', fontWeight: 600 }}>
                    <span style={{ color: 'var(--c-green)', display: 'flex', marginTop: 4, fontSize: 11, flexShrink: 0 }}><LuCheck /></span>
                    {c.after}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===================================================== FAQ ===== */}
      <section id="faq" style={SECTION}>
        <SectionHead
          kicker="FAQ"
          title="Questions we are asked before every demo"
          lead="If yours is not here, the form below reaches a person, not a queue."
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px, 100%), 1fr))',
            gap: 14, alignItems: 'start',
          }}
        >
          {FAQ.map((f, i) => (
            <Reveal key={f.q} delay={(i % 2) * 0.06}>
              <details className="faq-item" open={i === 0}>
                <summary>
                  <span style={{ fontSize: 'var(--fs-md)', lineHeight: 1.45 }}>{f.q}</span>
                  <span className="faq-plus"><LuPlus /></span>
                </summary>
                <div className="faq-answer">{f.a}</div>
              </details>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ================================================= CONTACT ===== */}
      <section
        id="contact"
        className="band"
        style={{ borderTop: '1px solid var(--border)', position: 'relative' }}
      >
        <div style={SECTION}>
          <SectionHead
            kicker="Contact Us"
            title="Ready to experience intelligent ERP?"
            lead={`Tell us about your plant and we will show you exactly how ${brandName} would run it. No obligation, no scripted demo.`}
          />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px, 100%), 1fr))',
              gap: 'clamp(22px, 4vw, 40px)',
              alignItems: 'start',
            }}
          >
            {/* --- contact details --- */}
            <Reveal dir="from-left">
              <div style={{ display: 'grid', gap: 14 }}>
                {[
                  { icon: <LuPhone />, tone: 'primary', label: 'Call us', value: '+91 99158 65939', href: 'tel:+919915865939' },
                  { icon: <LuMail />, tone: 'cyan', label: 'Email us', value: 'info.cyberbells@gmail.com', href: 'mailto:info.cyberbells@gmail.com' },
                  { icon: <LuClock />, tone: 'green', label: 'Working hours', value: 'Monday – Saturday, 9:30am – 6:30pm IST' },
                  { icon: <LuLifeBuoy />, tone: 'violet', label: 'Response time', value: 'We reply within one working day' },
                ].map((c) => {
                  const t = toneVars(c.tone);
                  const body = (
                    <>
                      <span
                        style={{
                          width: 42, height: 42, borderRadius: 'var(--radius-lg)', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: t.bg, color: t.fg, fontSize: '1.1rem',
                        }}
                      >
                        {c.icon}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-ghost)' }}>
                          {c.label}
                        </div>
                        <div style={{ color: 'var(--text-primary)', fontWeight: 650, fontSize: 'var(--fs-md)', overflowWrap: 'anywhere' }}>
                          {c.value}
                        </div>
                      </div>
                    </>
                  );

                  return c.href ? (
                    <a
                      key={c.label}
                      href={c.href}
                      className="lift"
                      style={{ ...CARD, padding: '16px 18px', display: 'flex', gap: 14, alignItems: 'center' }}
                    >
                      {body}
                    </a>
                  ) : (
                    <div
                      key={c.label}
                      className="lift"
                      style={{ ...CARD, padding: '16px 18px', display: 'flex', gap: 14, alignItems: 'center' }}
                    >
                      {body}
                    </div>
                  );
                })}

                <div
                  style={{
                    ...CARD, padding: '18px 20px', background: 'var(--primary-soft)',
                    borderColor: 'var(--border-primary)',
                  }}
                >
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                    Already a customer?
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', lineHeight: 1.6, marginBottom: 14 }}>
                    Sign in to your workspace, or create a new company account to get started.
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Link to="/login"><Button variant="primary" size="sm">Sign in</Button></Link>
                    <Link to="/signup"><Button variant="secondary" size="sm">Create workspace</Button></Link>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* --- inline enquiry form --- */}
            <Reveal dir="from-right" delay={0.1}>
              <div style={{ ...CARD, borderRadius: 'var(--radius-2xl)', padding: 'clamp(20px, 3vw, 30px)', boxShadow: 'var(--shadow-md)' }}>
                <h3
                  style={{
                    fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 800,
                    letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: 6,
                  }}
                >
                  Book your walkthrough
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-md)', lineHeight: 1.6, marginBottom: 20 }}>
                  Four details and we will call you back to fix a time.
                </p>

                <form onSubmit={handleInlineSubmit}>
                  <FormGrid>
                    <Field label="Your name" required>
                      <Input
                        value={inlineForm.name}
                        onChange={(e) => setInlineForm({ ...inlineForm, name: e.target.value })}
                        placeholder="Full name"
                      />
                    </Field>
                    <Field label="Mobile" required>
                      <Input
                        value={inlineForm.mobile}
                        onChange={(e) => setInlineForm({ ...inlineForm, mobile: e.target.value })}
                        placeholder="Contact number"
                      />
                    </Field>
                    <Field label="Email" required span="all">
                      <Input
                        type="email"
                        value={inlineForm.email}
                        onChange={(e) => setInlineForm({ ...inlineForm, email: e.target.value })}
                        placeholder="you@company.com"
                      />
                    </Field>
                    <Field label="Tell us about your requirement" required span="all">
                      <Textarea
                        rows={4}
                        value={inlineForm.concern}
                        onChange={(e) => setInlineForm({ ...inlineForm, concern: e.target.value })}
                        placeholder="Industry, plant size, and what you want to automate&hellip;"
                      />
                    </Field>
                  </FormGrid>

                  <div style={{ marginTop: 18 }}>
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      block
                      loading={inlineLoading}
                      iconRight={!inlineLoading ? <LuArrowRight /> : undefined}
                    >
                      {inlineLoading ? 'Sending…' : 'Request my demo'}
                    </Button>
                  </div>

                  <p
                    style={{
                      marginTop: 12, display: 'flex', alignItems: 'center', gap: 7,
                      color: 'var(--text-ghost)', fontSize: 'var(--fs-xs)', lineHeight: 1.5,
                    }}
                  >
                    <LuLock style={{ flexShrink: 0 }} />
                    Your details reach our team only. See our{' '}
                    <Link to="/privacy-policy" style={{ color: 'var(--primary)', fontWeight: 600 }}>privacy policy</Link>.
                  </p>
                </form>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ================================================== FOOTER ===== */}
      {/* on-brand: dark footer, light text throughout is intentional */}
      <footer style={{ background: '#131317', color: 'rgba(255,255,255,0.72)' }}>
        <div
          style={{
            ...WRAP,
            padding: 'clamp(40px, 6vw, 64px) clamp(16px, 2.6vw, 60px) 24px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))',
            gap: 'clamp(24px, 4vw, 44px)',
          }}
        >
          <div style={{ gridColumn: 'span 1', minWidth: 0 }}>
            {logoSrc ? (
              <img
                src={logoSrc}
                alt={brandName}
                style={{ height: 46, width: 'auto', objectFit: 'contain', filter: 'brightness(0) invert(1)', marginBottom: 14 }}
              />
            ) : (
              <div
                style={{
                  fontFamily: 'var(--font-display)', fontWeight: 800,
                  fontSize: 'var(--fs-lg)', color: '#fff', marginBottom: 14,
                }}
              >
                {brandName}
              </div>
            )}
            <p style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.7, maxWidth: 300 }}>
              Factory automation from gate to godown &mdash; production, quality, inventory and
              dispatch on one connected system.
            </p>
            <div style={{ display: 'flex', gap: 14, marginTop: 18, fontSize: '1rem' }}>
              {renderSocials(0.75)}
            </div>
          </div>

          <div className="link-col">
            <h4 style={{ color: '#fff', fontSize: 'var(--fs-base)', fontWeight: 700, marginBottom: 14 }}>Modules</h4>
            <div style={{ display: 'grid', gap: 10, fontSize: 'var(--fs-sm)' }}>
              {['Gate Management', 'Production Floor', 'Quality Control', 'Store & Inventory', 'Dispatch & Logistics', 'Sales & CRM'].map((m) => (
                <a key={m} href="#modules">{m}</a>
              ))}
            </div>
          </div>

          <div className="link-col">
            <h4 style={{ color: '#fff', fontSize: 'var(--fs-base)', fontWeight: 700, marginBottom: 14 }}>Company</h4>
            <div style={{ display: 'grid', gap: 10, fontSize: 'var(--fs-sm)' }}>
              {NAV.map((n) => <a key={n.href} href={n.href}>{n.label}</a>)}
              <Link to="/privacy-policy">Privacy Policy</Link>
            </div>
          </div>

          <div className="link-col">
            <h4 style={{ color: '#fff', fontSize: 'var(--fs-base)', fontWeight: 700, marginBottom: 14 }}>Contact Info</h4>
            <div style={{ display: 'grid', gap: 10, fontSize: 'var(--fs-sm)' }}>
              <a href="tel:+919915865939" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <LuPhone /> +91 99158 65939
              </a>
              <a href="mailto:info.cyberbells@gmail.com" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <LuMail /> info.cyberbells@gmail.com
              </a>
              <span style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 8, lineHeight: 1.5 }}>
                <LuClock style={{ marginTop: 3, flexShrink: 0 }} /> Mon &ndash; Sat, 9:30am &ndash; 6:30pm IST
              </span>
            </div>
          </div>

          <div>
            <h4 style={{ color: '#fff', fontSize: 'var(--fs-base)', fontWeight: 700, marginBottom: 14 }}>Get in touch</h4>
            <p style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.7, marginBottom: 14 }}>
              Send us your requirement and we will get back within one working day.
            </p>
            <Button variant="primary" icon={<LuLifeBuoy />} onClick={() => setIsSupportOpen(true)}>
              Contact Us
            </Button>
          </div>
        </div>

        {/* on-brand: divider on the dark footer */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
          <div
            style={{
              ...WRAP, padding: '16px clamp(16px, 2.6vw, 60px)',
              fontSize: 'var(--fs-xs)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 12, flexWrap: 'wrap',
            }}
          >
            <span>&copy; {new Date().getFullYear()} {brandName}. All rights reserved.</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, opacity: 0.85 }}>
              <LuShieldCheck /> Multi-tenant &middot; Role-based access &middot; Data isolated per company
            </span>
          </div>
        </div>
      </footer>

      {/* ============================================ SUPPORT DIALOG ===== */}
      <Dialog
        open={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        title="Register for a Demo"
        subtitle="Tell us about your plant and we will get back to you."
        footer={
          <>
            <Button variant="cancel" onClick={() => setIsSupportOpen(false)}>Cancel</Button>
            <Button type="submit" form="landing-support-form" variant="primary" loading={supportLoading}>
              {supportLoading ? 'Submitting…' : 'Submit request'}
            </Button>
          </>
        }
      >
        <form id="landing-support-form" onSubmit={handleSupportSubmit}>
          <FormGrid>
            <Field label="Your name" required>
              <Input
                value={supportForm.name}
                onChange={(e) => setSupportForm({ ...supportForm, name: e.target.value })}
                placeholder="Full name"
              />
            </Field>
            <Field label="Mobile" required>
              <Input
                value={supportForm.mobile}
                onChange={(e) => setSupportForm({ ...supportForm, mobile: e.target.value })}
                placeholder="Contact number"
              />
            </Field>
            <Field label="Email" required span="all">
              <Input
                type="email"
                value={supportForm.email}
                onChange={(e) => setSupportForm({ ...supportForm, email: e.target.value })}
                placeholder="you@company.com"
              />
            </Field>
            <Field label="Tell us about your requirement" required span="all">
              <Textarea
                rows={4}
                value={supportForm.concern}
                onChange={(e) => setSupportForm({ ...supportForm, concern: e.target.value })}
                placeholder="Industry, plant size, and what you want to automate&hellip;"
              />
            </Field>
          </FormGrid>
        </form>
      </Dialog>
    </div>
  );
};

export default Landing;
