'use client';

import { useEffect, useState } from 'react';
import { LuMenu, LuX, LuPhone, LuMail, LuClock } from 'react-icons/lu';
import { LinkButton } from './ui';
import DemoButton from './DemoButton';
import { NAV, site, socials } from '@/lib/site';
import Socials from './Socials';

/**
 * Utility strip plus the sticky header.
 *
 * The header gains a stronger surface once the page scrolls, and collapses to
 * a disclosure menu below 1100px. Both the desktop and the mobile link lists
 * render in the HTML, so the internal links are always crawlable.
 */
export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the menu when the viewport grows past the breakpoint, so the page is
  // never left with an open panel and a visible desktop nav at once.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1100px)');
    const onChange = (e) => { if (e.matches) setMenuOpen(false); };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return (
    <>
      {/* ------------------------------------------------ utility strip --- */}
      {/* on-brand: dark contact strip, light text is intentional here */}
      <div style={{ background: 'var(--ink)', color: 'rgba(255,255,255,0.78)', fontSize: 'var(--fs-xs)' }}>
        <div
          className="wrap"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
            flexWrap: 'wrap',
            paddingBlock: 9,
          }}
        >
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <a href={site.phoneHref} style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <LuPhone /> {site.phone}
            </a>
            <a href={`mailto:${site.email}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <LuMail /> {site.email}
            </a>
            <span className="hide-narrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, opacity: 0.8 }}>
              <LuClock /> {site.hours}
            </span>
          </div>
          <Socials items={socials} opacity={0.8} />
        </div>
      </div>

      {/* ------------------------------------------------------- header --- */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 900,
          background: scrolled
            ? 'color-mix(in srgb, var(--bg-card) 92%, transparent)'
            : 'color-mix(in srgb, var(--bg-card) 72%, transparent)',
          backdropFilter: 'saturate(180%) blur(18px)',
          WebkitBackdropFilter: 'saturate(180%) blur(18px)',
          borderBottom: '1px solid var(--border)',
          boxShadow: scrolled ? 'var(--shadow-sm)' : 'none',
          transition: 'background 0.25s ease, box-shadow 0.25s ease',
        }}
      >
        <nav
          className="wrap"
          aria-label="Main"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 18,
            paddingBlock: 12,
          }}
        >
          <a
            href="/"
            style={{ display: 'flex', alignItems: 'center', minWidth: 0, marginRight: 'clamp(12px, 2vw, 40px)' }}
            aria-label={`${site.fullName} home`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt={site.fullName}
              width={360}
              height={233}
              style={{ height: 50, width: 'auto', objectFit: 'contain' }}
            />
          </a>

          {/* Desktop links sit next to the logo rather than centred — on a wide
              header, space-between strands them in the middle of the bar. */}
          <ul className="nav-desktop" style={{ alignItems: 'center', gap: 'clamp(18px, 1.6vw, 34px)', marginRight: 'auto' }}>
            {NAV.map((n) => (
              <li key={n.href}>
                <a
                  href={n.href}
                  className="nav-link"
                  style={{ fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}
                >
                  {n.label}
                </a>
              </li>
            ))}
          </ul>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LinkButton href={`${site.appUrl}/login`} variant="secondary" size="sm" className="nav-signin">
              Sign in
            </LinkButton>
            <DemoButton variant="primary" size="sm">Request a Demo</DemoButton>

            <button
              type="button"
              className="nav-toggle btn btn-ghost btn-sm"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              style={{ padding: 8 }}
            >
              {menuOpen ? <LuX size={20} /> : <LuMenu size={20} />}
            </button>
          </div>
        </nav>

        {/* mobile disclosure */}
        <div
          id="mobile-menu"
          className="nav-mobile"
          hidden={!menuOpen}
          style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}
        >
          <ul className="wrap" style={{ display: 'grid', gap: 2, paddingBlock: 12 }}>
            {NAV.map((n) => (
              <li key={n.href}>
                <a
                  href={n.href}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: 'block',
                    padding: '11px 12px',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 600,
                    fontSize: 'var(--fs-md)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {n.label}
                </a>
              </li>
            ))}
            <li style={{ paddingTop: 8 }}>
              <LinkButton href={`${site.appUrl}/login`} variant="secondary" block>
                Sign in to your workspace
              </LinkButton>
            </li>
          </ul>
        </div>
      </header>
    </>
  );
}
