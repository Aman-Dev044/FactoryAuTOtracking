'use client';

import { useId, useState } from 'react';
import { LuArrowRight, LuLock } from 'react-icons/lu';
import { Button, Field, Input, Textarea } from './ui';
import { submitEnquiry, validateEnquiry } from '@/lib/api';
import { toast } from '@/lib/demo';

const EMPTY = { name: '', email: '', mobile: '', concern: '' };

/**
 * The demo enquiry form.
 *
 * Used twice — inline in the contact section, and inside the dialog — so the
 * fields, validation and submit handling live in one place. `onDone` lets the
 * dialog close itself once a submission succeeds.
 */
export default function EnquiryForm({ onDone, submitLabel = 'Request my demo', showNote = true, id }) {
  const uid = useId();
  const formId = id || `enquiry-${uid}`;
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();

    const problem = validateEnquiry(form);
    if (problem) {
      toast(problem, 'err');
      return;
    }

    setLoading(true);
    try {
      await submitEnquiry(form);
      toast('Thank you! We will get back to you within one working day.');
      setForm(EMPTY);
      onDone?.();
    } catch (err) {
      toast(err.message || 'Failed to send your request.', 'err');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form id={formId} onSubmit={onSubmit} noValidate>
      <div className="form-grid">
        <Field label="Your name" required htmlFor={`${formId}-name`}>
          <Input
            id={`${formId}-name`}
            name="name"
            autoComplete="name"
            value={form.name}
            onChange={set('name')}
            placeholder="Full name"
          />
        </Field>

        <Field label="Mobile" required htmlFor={`${formId}-mobile`}>
          <Input
            id={`${formId}-mobile`}
            name="mobile"
            type="tel"
            autoComplete="tel"
            value={form.mobile}
            onChange={set('mobile')}
            placeholder="Contact number"
          />
        </Field>

        <Field label="Email" required span="all" htmlFor={`${formId}-email`}>
          <Input
            id={`${formId}-email`}
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={set('email')}
            placeholder="you@company.com"
          />
        </Field>

        <Field label="Tell us about your requirement" required span="all" htmlFor={`${formId}-concern`}>
          <Textarea
            id={`${formId}-concern`}
            name="concern"
            rows={4}
            value={form.concern}
            onChange={set('concern')}
            placeholder="Industry, plant size, and what you want to automate…"
          />
        </Field>
      </div>

      {submitLabel && (
        <div style={{ marginTop: 18 }}>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            block
            loading={loading}
            iconRight={!loading ? <LuArrowRight /> : undefined}
          >
            {loading ? 'Sending…' : submitLabel}
          </Button>
        </div>
      )}

      {showNote && (
        <p
          style={{
            marginTop: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: 'var(--text-ghost)',
            fontSize: 'var(--fs-xs)',
            lineHeight: 1.5,
          }}
        >
          <LuLock style={{ flexShrink: 0 }} />
          <span>
            Your details reach our team only. See our{' '}
            <a href="/privacy-policy/" style={{ color: 'var(--primary)', fontWeight: 600 }}>
              privacy policy
            </a>.
          </span>
        </p>
      )}
    </form>
  );
}
