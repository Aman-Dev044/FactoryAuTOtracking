/**
 * Single source of truth for everything that names, describes or links the
 * site. Metadata, JSON-LD, the nav, the footer and the sitemap all read from
 * here, so a change lands everywhere at once.
 */

export const site = {
  name: 'TrackBells',
  fullName: 'TrackBells ERP',
  tagline: 'Factory Automation',

  /** Canonical origin. Override per environment with NEXT_PUBLIC_SITE_URL. */
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'https://trackbells.com').replace(/\/$/, ''),

  /** Where the ERP application itself lives — every Sign in link points here. */
  appUrl: (process.env.NEXT_PUBLIC_APP_URL || 'https://app.trackbells.com').replace(/\/$/, ''),

  /** Backend that receives the demo enquiry form. */
  apiUrl: (process.env.NEXT_PUBLIC_API_URL || 'https://api.trackbells.com').replace(/\/$/, ''),

  title: 'TrackBells ERP — Factory Automation from Gate to Godown',

  description:
    'Multi-tenant manufacturing ERP for drag chain and engineering plants. Gate entry with bill OCR, production, quality inspection, rack-level inventory with live valuation, assembly, dispatch with POD, sales CRM and GST invoicing — one connected system.',

  /** Used as the og:image. Replace with a purpose-made 1200x630 artwork. */
  ogImage: '/logo-mark.png',

  phone: '+91 99158 65939',
  phoneHref: 'tel:+919915865939',
  email: 'info.cyberbells@gmail.com',
  hours: 'Mon – Sat, 9:30am – 6:30pm IST',
  country: 'IN',

  keywords: [
    'factory ERP',
    'manufacturing ERP',
    'drag chain manufacturing software',
    'production tracking software',
    'gate entry GRN software',
    'inventory management ERP India',
    'quality inspection software',
    'dispatch and POD tracking',
    'GST invoice software manufacturing',
    'multi-tenant ERP',
  ],
};

/**
 * Social profiles. Fill a url in and the icon becomes a link; while it is
 * empty the icon renders as plain decoration rather than a control that goes
 * nowhere.
 */
export const socials = [
  { key: 'linkedin', label: 'LinkedIn', url: '' },
  { key: 'facebook', label: 'Facebook', url: '' },
  { key: 'instagram', label: 'Instagram', url: '' },
  { key: 'youtube', label: 'YouTube', url: '' },
];

export const NAV = [
  { label: 'About', href: '/#about' },
  { label: 'Solution', href: '/#solution' },
  { label: 'Modules', href: '/#modules' },
  { label: 'Workflow', href: '/#workflow' },
  { label: 'Why Us', href: '/#why-us' },
  { label: 'FAQ', href: '/#faq' },
  { label: 'Contact', href: '/#contact' },
];
