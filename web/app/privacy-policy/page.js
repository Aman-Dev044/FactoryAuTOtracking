import { site } from '@/lib/site';

export const metadata = {
  title: 'Privacy Policy',
  description:
    `How ${site.fullName} collects, uses and protects your information — including multi-tenant data isolation and how to request account deletion.`,
  alternates: { canonical: '/privacy-policy' },
  openGraph: {
    title: `Privacy Policy | ${site.fullName}`,
    description: `How ${site.fullName} collects, uses and protects your information.`,
    url: `${site.url}/privacy-policy`,
  },
};

/* The policy is a document, so it keeps a reading measure rather than the
   full-width grid the marketing page uses. */
const DOC = { maxWidth: 800, marginInline: 'auto' };
const P = { color: 'var(--text-secondary)', fontSize: 'var(--fs-md)', lineHeight: 1.85, marginBottom: 18 };
const H2 = { fontSize: 'clamp(1.2rem, 2.4vw, 1.45rem)', fontWeight: 700, margin: '38px 0 14px' };
const H3 = { fontSize: 'var(--fs-lg)', fontWeight: 700, margin: '24px 0 10px', color: 'var(--text-primary)' };
const UL = { display: 'grid', gap: 11, paddingLeft: 22, marginBottom: 18, listStyle: 'disc' };
const LI = { color: 'var(--text-secondary)', fontSize: 'var(--fs-md)', lineHeight: 1.75 };
const STRONG = { color: 'var(--text-primary)' };

export default function PrivacyPolicyPage() {
  return (
    <section className="sec">
      <article className="wrap" style={DOC}>
        <h1 style={{ fontSize: 'clamp(1.9rem, 4.4vw, 2.7rem)', marginBottom: 16 }}>
          Privacy Policy for {site.fullName}
        </h1>

        <p style={{ ...P, paddingBottom: 26, marginBottom: 30, borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
          <strong style={STRONG}>Effective Date:</strong> August 7, 2026<br />
          <strong style={STRONG}>Company:</strong> Cyberbells ITES Services Pvt Ltd<br />
          <strong style={STRONG}>Product:</strong> TrackBells Factory Automation ERP
        </p>

        <p style={P}>
          This Privacy Policy describes how Cyberbells ITES Services Pvt Ltd (&quot;we&quot;, &quot;our&quot;, or
          &quot;us&quot;) collects, uses, and protects your information when you use the TrackBells Factory
          Automation ERP platform (the &quot;Service&quot;). By using the Service, you agree to the collection
          and use of information in accordance with this policy.
        </p>

        <h2 style={H2}>1. Information We Collect</h2>

        <h3 style={H3}>1.1 Information You Provide to Us</h3>
        <ul style={UL}>
          <li style={LI}><strong style={STRONG}>Account Information:</strong> When you register for an organization workspace, we collect your name, email address, phone number, and password.</li>
          <li style={LI}><strong style={STRONG}>Business Data:</strong> Data entered into the ERP, including but not limited to inventory, machine logs, sales, vendor information, and employee records.</li>
          <li style={LI}><strong style={STRONG}>Support Communications:</strong> Information you provide when contacting us for support or inquiries.</li>
        </ul>

        <h3 style={H3}>1.2 Information Automatically Collected</h3>
        <ul style={UL}>
          <li style={LI}><strong style={STRONG}>Usage Data:</strong> Information on how the Service is accessed and used (e.g. login timestamps, feature usage, IP addresses, browser types).</li>
          <li style={LI}><strong style={STRONG}>Device Information:</strong> We may collect information about the device you use to access our Service.</li>
        </ul>

        <h2 style={H2}>2. How We Use Your Information</h2>
        <ul style={UL}>
          <li style={LI}>To provide and maintain our Service.</li>
          <li style={LI}>To notify you about changes to our Service.</li>
          <li style={LI}>To provide customer support.</li>
          <li style={LI}>To ensure the security and integrity of our multi-tenant architecture.</li>
          <li style={LI}>To detect, prevent, and address technical issues.</li>
        </ul>

        <h2 style={H2}>3. Data Security and Isolation</h2>
        <p style={P}>
          TrackBells ERP employs a strict multi-tenant SaaS architecture. We use robust security
          measures, including database-level data isolation (via <code>organizationId</code>),
          role-based access control (RBAC), and encryption to protect your data. Your
          organization&apos;s data is completely isolated and cannot be accessed by other tenants on
          the platform.
        </p>

        <h2 style={H2}>4. Account Deletion and Data Removal</h2>
        <p style={P}>
          We understand your right to control your personal and organizational data. If you wish to
          delete your account or organization workspace from TrackBells ERP, please follow the
          process below:
        </p>
        <ul style={UL}>
          <li style={LI}>
            <strong style={STRONG}>How to Request Deletion:</strong> Send an email from your registered admin
            email address to <strong style={STRONG}>{site.email}</strong> with the subject line
            &quot;Account Deletion Request&quot;.
          </li>
          <li style={LI}>
            <strong style={STRONG}>Processing Time:</strong> Once we receive your request, your account and all
            associated data will be permanently deleted from our servers{' '}
            <strong style={STRONG}>within 24 hours</strong>.
          </li>
          <li style={LI}>
            <strong style={STRONG}>Impact of Deletion:</strong> Please note that account deletion is
            irreversible. Once deleted, you will lose access to all inventory, production, sales, and
            employee data associated with your workspace.
          </li>
        </ul>

        <h2 style={H2}>5. Third-Party Services</h2>
        <p style={P}>
          We do not sell, trade, or rent your personal identification information to others. We may
          share generic aggregated demographic information not linked to any personal identification
          information regarding visitors and users with our business partners and trusted affiliates
          for the purposes outlined above.
        </p>

        <h2 style={H2}>6. Changes to This Privacy Policy</h2>
        <p style={P}>
          We may update our Privacy Policy from time to time. We will notify you of any changes by
          posting the new Privacy Policy on this page and updating the &quot;Effective Date&quot; at
          the top. You are advised to review this Privacy Policy periodically for any changes.
        </p>

        <h2 style={H2}>7. Contact Us</h2>
        <p style={P}>
          If you have any questions about this Privacy Policy, your data, or if you need assistance,
          please contact us:
        </p>
        <ul style={{ ...UL, listStyle: 'none', paddingLeft: 0 }}>
          <li style={LI}>
            <strong style={STRONG}>Email:</strong>{' '}
            <a href={`mailto:${site.email}`} style={{ color: 'var(--primary)', fontWeight: 600 }}>{site.email}</a>
          </li>
          <li style={LI}><strong style={STRONG}>Phone:</strong> {site.phone}</li>
          <li style={LI}><strong style={STRONG}>Company:</strong> Cyberbells ITES Services Pvt Ltd</li>
        </ul>
      </article>
    </section>
  );
}
