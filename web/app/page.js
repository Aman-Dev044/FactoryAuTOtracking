import Hero from '@/components/sections/Hero';
import Solutions from '@/components/sections/Solutions';
import Modules from '@/components/sections/Modules';
import Workflow from '@/components/sections/Workflow';
import { About, WhyErp } from '@/components/sections/About';
import DeepDive from '@/components/sections/DeepDive';
import { WhyUs, Roles } from '@/components/sections/WhyUs';
import { Process, CtaBand } from '@/components/sections/Process';
import { Manufacturing, Compare, Faq } from '@/components/sections/Proof';
import Contact from '@/components/sections/Contact';
import { FAQ } from '@/lib/content';
import { site } from '@/lib/site';

export const metadata = {
  alternates: { canonical: '/' },
};

/**
 * FAQPage schema.
 *
 * The answers are already in the page as native <details>, so this describes
 * content a visitor can read rather than adding anything hidden — which is
 * what makes it eligible for an expandable result.
 */
function FaqJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${site.url}/#faq`,
    mainEntity: FAQ.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <Solutions />
      <Modules />
      <Workflow />
      <About />
      <WhyErp />
      <DeepDive />
      <WhyUs />
      <Roles />
      <Process />
      <CtaBand />
      <Manufacturing />
      <Compare />
      <Faq />
      <Contact />
      <FaqJsonLd />
    </>
  );
}
