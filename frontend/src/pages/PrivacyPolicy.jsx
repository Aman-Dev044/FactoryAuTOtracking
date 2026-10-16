import React from 'react';
import { Link } from 'react-router-dom';
import { LuArrowLeft } from 'react-icons/lu';

/* ---------------------------------------------------------------- styling */

const NAV = {
  position: 'sticky',
  top: 0,
  zIndex: 900,
  padding: '12px clamp(16px, 4vw, 40px)',
  background: 'color-mix(in srgb, var(--bg-card) 80%, transparent)',
  backdropFilter: 'saturate(180%) blur(16px)',
  WebkitBackdropFilter: 'saturate(180%) blur(16px)',
  borderBottom: '1px solid var(--border)',
  display: 'flex',
  alignItems: 'center',
};

const BACK_LINK = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  textDecoration: 'none',
  color: 'var(--text-secondary)',
  fontWeight: 600,
  fontSize: 'var(--fs-base)',
};

const DOC = {
  maxWidth: 760,
  margin: '0 auto',
  padding: 'clamp(28px, 6vw, 56px) clamp(16px, 5vw, 24px) 72px',
  width: '100%',
};

const H1 = {
  fontFamily: 'var(--font-display)',
  fontSize: 'clamp(1.75rem, 5vw, 2.4rem)',
  fontWeight: 800,
  letterSpacing: '-0.025em',
  lineHeight: 1.15,
  color: 'var(--text-primary)',
  margin: '0 0 12px',
};

const META = {
  color: 'var(--text-muted)',
  fontSize: 'var(--fs-base)',
  lineHeight: 1.9,
  margin: '0 0 28px',
  paddingBottom: 24,
  borderBottom: '1px solid var(--border)',
};

const H2 = {
  fontFamily: 'var(--font-display)',
  fontSize: 'clamp(1.15rem, 3vw, 1.35rem)',
  fontWeight: 700,
  letterSpacing: '-0.015em',
  color: 'var(--text-primary)',
  margin: '36px 0 12px',
};

const H3 = {
  fontFamily: 'var(--font-display)',
  fontSize: 'var(--fs-md)',
  fontWeight: 700,
  color: 'var(--text-primary)',
  margin: '24px 0 8px',
};

const P = {
  fontSize: 'var(--fs-md)',
  lineHeight: 1.8,
  color: 'var(--text-secondary)',
  margin: '0 0 18px',
};

const UL = {
  paddingLeft: 22,
  margin: '0 0 18px',
  fontSize: 'var(--fs-md)',
  lineHeight: 1.8,
  color: 'var(--text-secondary)',
};

const LI = { marginBottom: 10 };

const PrivacyPolicy = () => {
  return (
    <div style={{
      background: 'var(--bg-primary)',
      minHeight: '100vh',
      color: 'var(--text-primary)',
      overflowX: 'hidden',
      fontFamily: 'var(--font-body)',
    }}>
      {/* Header */}
      <nav style={NAV}>
        <Link to="/" style={BACK_LINK}>
          <LuArrowLeft size={18} /> Back to Home
        </Link>
      </nav>

      {/* Content */}
      <article style={DOC}>
        <h1 style={H1}>Privacy Policy for TrackBells ERP</h1>
        <p style={META}>
          <strong style={{ color: 'var(--text-primary)' }}>Effective Date:</strong> August 7, 2026<br />
          <strong style={{ color: 'var(--text-primary)' }}>Company:</strong> Cyberbells ITES Services Pvt Ltd<br />
          <strong style={{ color: 'var(--text-primary)' }}>Product:</strong> TrackBells Factory Automation ERP
        </p>

        <p style={P}>
          This Privacy Policy describes how Cyberbells ITES Services Pvt Ltd ("we", "our", or "us") collects, uses, and protects your information when you use the TrackBells Factory Automation ERP platform (the "Service"). By using the Service, you agree to the collection and use of information in accordance with this policy.
        </p>

        <h2 style={H2}>1. Information We Collect</h2>

        <h3 style={H3}>1.1 Information You Provide to Us</h3>
        <ul style={UL}>
          <li style={LI}><strong>Account Information:</strong> When you register for an organization workspace, we collect your name, email address, phone number, and password.</li>
          <li style={LI}><strong>Business Data:</strong> Data entered into the ERP, including but not limited to inventory, machine logs, sales, vendor information, and employee records.</li>
          <li style={LI}><strong>Support Communications:</strong> Information you provide when contacting us for support or inquiries.</li>
        </ul>

        <h3 style={H3}>1.2 Information Automatically Collected</h3>
        <ul style={UL}>
          <li style={LI}><strong>Usage Data:</strong> Information on how the Service is accessed and used (e.g., login timestamps, feature usage, IP addresses, browser types).</li>
          <li style={LI}><strong>Device Information:</strong> We may collect information about the device you use to access our Service.</li>
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
          TrackBells ERP employs a strict Multi-Tenant SaaS architecture. We use robust security measures, including Database-level Data Isolation (via `organizationId`), role-based access control (RBAC), and encryption to protect your data. Your organization's data is completely isolated and cannot be accessed by other tenants on the platform.
        </p>

        <h2 style={H2}>4. Account Deletion and Data Removal</h2>
        <p style={P}>
          We understand your right to control your personal and organizational data. If you wish to delete your account or organization workspace from TrackBells ERP, please follow the process below:
        </p>
        <ul style={UL}>
          <li style={LI}><strong>How to Request Deletion:</strong> Send an email from your registered admin email address to <strong>info.cyberbells@gmail.com</strong> with the subject line "Account Deletion Request".</li>
          <li style={LI}><strong>Processing Time:</strong> Once we receive your request, your account and all associated data will be permanently deleted from our servers <strong>within 24 hours</strong>.</li>
          <li style={LI}><strong>Impact of Deletion:</strong> Please note that account deletion is irreversible. Once deleted, you will lose access to all inventory, production, sales, and employee data associated with your workspace.</li>
        </ul>

        <h2 style={H2}>5. Third-Party Services</h2>
        <p style={P}>
          We do not sell, trade, or rent your personal identification information to others. We may share generic aggregated demographic information not linked to any personal identification information regarding visitors and users with our business partners and trusted affiliates for the purposes outlined above.
        </p>

        <h2 style={H2}>6. Changes to This Privacy Policy</h2>
        <p style={P}>
          We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Effective Date" at the top. You are advised to review this Privacy Policy periodically for any changes.
        </p>

        <h2 style={H2}>7. Contact Us</h2>
        <p style={P}>
          If you have any questions about this Privacy Policy, your data, or if you need assistance, please contact us:
        </p>
        <ul style={{ ...UL, listStyle: 'none', paddingLeft: 0 }}>
          <li style={LI}><strong>Email:</strong> <a href="mailto:info.cyberbells@gmail.com" style={{ color: 'var(--primary)' }}>info.cyberbells@gmail.com</a></li>
          <li style={LI}><strong>Phone:</strong> +91-7009496097</li>
          <li style={LI}><strong>Company:</strong> Cyberbells ITES Services Pvt Ltd</li>
        </ul>
      </article>
    </div>
  );
};

export default PrivacyPolicy;
