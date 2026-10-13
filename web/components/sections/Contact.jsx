import { LuPhone, LuMail, LuClock, LuLifeBuoy } from 'react-icons/lu';
import Reveal from '../Reveal';
import EnquiryForm from '../EnquiryForm';
import { SectionHead, LinkButton, IconChip, tone } from '../ui';
import { Spotlights } from '../Backdrop';
import { site } from '@/lib/site';

const CARDS = [
  { icon: LuPhone, tone: 'primary', label: 'Call us', value: site.phone, href: site.phoneHref },
  { icon: LuMail, tone: 'cyan', label: 'Email us', value: site.email, href: `mailto:${site.email}` },
  { icon: LuClock, tone: 'green', label: 'Working hours', value: site.hours },
  { icon: LuLifeBuoy, tone: 'violet', label: 'Response time', value: 'We reply within one working day' },
];

export default function Contact() {
  return (
    <section id="contact" className="band" style={{ position: 'relative', isolation: 'isolate' }}>
      <Spotlights
        items={[
          { size: 480, top: '0%', left: '-6%', color: 'var(--primary)', strength: 20 },
          { size: 400, bottom: '0%', right: '-6%', color: 'var(--c-violet)', strength: 16 },
        ]}
      />

      <div className="wrap sec">
        <SectionHead
          kicker="Contact Us"
          title="Ready to experience intelligent ERP?"
          lead={`Tell us about your plant and we will show you exactly how ${site.fullName} would run it. No obligation, no scripted demo.`}
        />

        <div className="split split-contact">
          {/* --- contact details --- */}
          <Reveal dir="from-left">
            <div style={{ display: 'grid', gap: 15 }}>
              {CARDS.map((c) => {
                const t = tone(c.tone);
                const body = (
                  <>
                    <IconChip icon={c.icon} tone={t} size={46} radius="var(--radius-lg)" fontSize="1.15rem" />
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 'var(--fs-xs)',
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: 'var(--text-ghost)',
                        }}
                      >
                        {c.label}
                      </div>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 650, fontSize: 'var(--fs-md)', overflowWrap: 'anywhere' }}>
                        {c.value}
                      </div>
                    </div>
                  </>
                );

                const style = { padding: '18px 20px', display: 'flex', gap: 15, alignItems: 'center' };

                return c.href ? (
                  <a key={c.label} href={c.href} className="card lift" style={style}>{body}</a>
                ) : (
                  <div key={c.label} className="card lift" style={style}>{body}</div>
                );
              })}

              <div
                className="card"
                style={{ padding: '22px 24px', background: 'var(--primary-soft)', borderColor: 'var(--border-primary)' }}
              >
                <h3 style={{ fontWeight: 700, fontSize: 'var(--fs-lg)', marginBottom: 8 }}>
                  Already a customer?
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-md)', lineHeight: 1.6, marginBottom: 16 }}>
                  Sign in to your workspace, or create a new company account to get started.
                </p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <LinkButton href={`${site.appUrl}/login`} variant="primary" size="sm">Sign in</LinkButton>
                  <LinkButton href={`${site.appUrl}/signup`} variant="secondary" size="sm">Create workspace</LinkButton>
                </div>
              </div>
            </div>
          </Reveal>

          {/* --- inline enquiry form --- */}
          <Reveal dir="from-right" delay={0.1}>
            <div
              className="card"
              style={{
                borderRadius: 'var(--radius-2xl)',
                padding: 'clamp(24px, 3vw, 38px)',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 8, letterSpacing: '-0.025em' }}>
                Book your walkthrough
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-md)', lineHeight: 1.6, marginBottom: 24 }}>
                Four details and we will call you back to fix a time.
              </p>

              <EnquiryForm id="contact-form" />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
