import { LuPhone, LuMail, LuClock, LuShieldCheck, LuLifeBuoy } from 'react-icons/lu';
import DemoButton from './DemoButton';
import Socials from './Socials';
import { NAV, site, socials } from '@/lib/site';
import { MODULES } from '@/lib/content';

/* on-brand: dark footer, light text throughout is intentional */

const heading = {
  color: '#fff',
  fontSize: 'var(--fs-base)',
  fontWeight: 700,
  marginBottom: 16,
  letterSpacing: 0,
};

const linkList = { display: 'grid', gap: 11, fontSize: 'var(--fs-sm)' };

export default function Footer() {
  return (
    <footer style={{ background: 'var(--ink)', color: 'rgba(255,255,255,0.72)' }}>
      <div
        className="wrap"
        style={{
          paddingTop: 'clamp(44px, 5vw, 72px)',
          paddingBottom: 28,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(210px, 100%), 1fr))',
          gap: 'clamp(26px, 3.4vw, 52px)',
        }}
      >
        <div style={{ minWidth: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt={site.fullName}
            width={360}
            height={233}
            style={{
              height: 48,
              width: 'auto',
              objectFit: 'contain',
              filter: 'brightness(0) invert(1)',
              marginBottom: 16,
            }}
          />
          <p style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.75, maxWidth: 320 }}>
            Factory automation from gate to godown — production, quality, inventory and
            dispatch on one connected system.
          </p>
          <div style={{ marginTop: 20 }}>
            <Socials items={socials} opacity={0.75} />
          </div>
        </div>

        <div className="link-col">
          <h2 style={heading}>Modules</h2>
          <ul style={linkList}>
            {MODULES.slice(0, 6).map((m) => (
              <li key={m.title}>
                <a href="/#modules">{m.title}</a>
              </li>
            ))}
          </ul>
        </div>

        <div className="link-col">
          <h2 style={heading}>Company</h2>
          <ul style={linkList}>
            {NAV.map((n) => (
              <li key={n.href}>
                <a href={n.href}>{n.label}</a>
              </li>
            ))}
            <li><a href="/privacy-policy/">Privacy Policy</a></li>
          </ul>
        </div>

        <div className="link-col">
          <h2 style={heading}>Contact Info</h2>
          <ul style={linkList}>
            <li>
              <a href={site.phoneHref} style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
                <LuPhone /> {site.phone}
              </a>
            </li>
            <li>
              <a href={`mailto:${site.email}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
                <LuMail /> {site.email}
              </a>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: 9, lineHeight: 1.55 }}>
              <LuClock style={{ marginTop: 3, flexShrink: 0 }} /> {site.hours}
            </li>
          </ul>
        </div>

        <div>
          <h2 style={heading}>Get in touch</h2>
          <p style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.75, marginBottom: 16 }}>
            Send us your requirement and we will get back within one working day.
          </p>
          <DemoButton variant="primary" icon={<LuLifeBuoy />}>Contact Us</DemoButton>
        </div>
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
        <div
          className="wrap"
          style={{
            paddingBlock: 18,
            fontSize: 'var(--fs-xs)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <span>&copy; {new Date().getFullYear()} {site.fullName}. All rights reserved.</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, opacity: 0.85 }}>
            <LuShieldCheck /> Multi-tenant &middot; Role-based access &middot; Data isolated per company
          </span>
        </div>
      </div>
    </footer>
  );
}
