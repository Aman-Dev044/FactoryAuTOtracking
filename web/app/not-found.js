import { LuArrowLeft } from 'react-icons/lu';

export const metadata = {
  title: 'Page not found',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <section className="sec">
      <div
        className="wrap"
        style={{
          minHeight: '52vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: 8,
        }}
      >
        <p style={{ fontSize: '3.4rem' }} aria-hidden="true">🔍</p>
        <h1 style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)' }}>404</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-lg)', marginBottom: 22 }}>
          That page does not exist.
        </p>
        <a href="/" className="btn btn-primary btn-lg" style={{ gap: 9 }}>
          <LuArrowLeft /> Back to home
        </a>
      </div>
    </section>
  );
}
