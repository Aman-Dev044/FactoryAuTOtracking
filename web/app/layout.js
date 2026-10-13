import { Plus_Jakarta_Sans, Wix_Madefor_Text } from 'next/font/google';
import './globals.css';
import { site } from '@/lib/site';
import { BackdropLayers, Ribbons } from '@/components/Backdrop';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import DemoDialog from '@/components/DemoDialog';
import Toaster from '@/components/Toaster';

/**
 * Fonts are self-hosted by next/font rather than pulled from the Google CDN at
 * runtime. That removes a render-blocking third-party request, and the
 * generated @font-face carries size-adjust metrics so swapping in the real
 * face does not shift the layout.
 */
const display = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

const body = Wix_Madefor_Text({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.title,
    template: `%s | ${site.fullName}`,
  },
  description: site.description,
  keywords: site.keywords,
  applicationName: site.fullName,
  authors: [{ name: site.fullName }],
  creator: site.fullName,
  publisher: site.fullName,
  alternates: { canonical: '/' },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  openGraph: {
    type: 'website',
    siteName: site.fullName,
    title: site.title,
    description: site.description,
    url: site.url,
    locale: 'en_IN',
    images: [{ url: site.ogImage, width: 512, height: 512, alt: `${site.fullName} — factory automation` }],
  },
  twitter: {
    card: 'summary_large_image',
    title: site.title,
    description: site.description,
    images: [site.ogImage],
  },
  category: 'technology',
  formatDetection: { telephone: true, email: true, address: false },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f58220' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0f19' },
  ],
};

/**
 * Structured data.
 *
 * Organization and WebSite describe the company; SoftwareApplication
 * describes the product itself. All three are facts a crawler cannot infer
 * from the prose, which is what schema is for.
 */
function JsonLd() {
  const graph = [
    {
      '@type': 'Organization',
      '@id': `${site.url}/#organization`,
      name: site.fullName,
      url: site.url,
      logo: { '@type': 'ImageObject', url: `${site.url}/logo.png` },
      description: site.description,
      contactPoint: [{
        '@type': 'ContactPoint',
        telephone: site.phone,
        email: site.email,
        contactType: 'sales',
        areaServed: site.country,
        availableLanguage: ['en', 'hi'],
      }],
    },
    {
      '@type': 'WebSite',
      '@id': `${site.url}/#website`,
      url: site.url,
      name: site.fullName,
      publisher: { '@id': `${site.url}/#organization` },
      inLanguage: 'en-IN',
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${site.url}/#software`,
      name: site.fullName,
      applicationCategory: 'BusinessApplication',
      applicationSubCategory: 'Manufacturing ERP',
      operatingSystem: 'Web browser',
      url: site.url,
      publisher: { '@id': `${site.url}/#organization` },
      description: site.description,
      featureList: [
        'Gate entry with vendor bill OCR and GRN generation',
        'Purchase orders and vendor quotation management',
        'Production build jobs with machine and line tracking',
        'First and final quality inspection with rework logging',
        'Rack-level inventory with live stock valuation',
        'Assembly batches and dispatch with LR copy and POD',
        'Sales CRM from lead to sales order',
        'GST tax invoice, delivery challan and proforma invoice',
        'Role-based access across 16 workspaces',
        'Multi-tenant data isolation per company',
      ],
    },
  ];

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }),
      }}
    />
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="en-IN" className={`${display.variable} ${body.variable}`}>
      <body>
        <a className="skip-link" href="#main">Skip to content</a>

        <BackdropLayers />
        <Ribbons />

        <Nav />
        <main id="main">{children}</main>
        <Footer />

        <DemoDialog />
        <Toaster />
        <JsonLd />
      </body>
    </html>
  );
}
