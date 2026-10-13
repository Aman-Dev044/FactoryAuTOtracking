import { site } from './site';

/**
 * Posts a demo enquiry to the ERP backend.
 *
 * This is the same public endpoint the in-app landing form uses — it stores a
 * SupportTicket and emails the platform admin. The backend must list this
 * site's origin in CORS_ALLOWED_ORIGINS for the browser to allow the call.
 */
export async function submitEnquiry({ name, email, mobile, concern }) {
  const res = await fetch(`${site.apiUrl}/api/support/ticket`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, mobile, concern }),
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // a non-JSON error page — fall through to the generic message below
  }

  if (!res.ok || (data && data.success === false)) {
    throw new Error(data?.message || 'Could not send your request. Please try again.');
  }

  return data;
}

/** Shared client-side validation, so both forms reject the same things. */
export function validateEnquiry(form) {
  if (!form.name.trim()) return 'Please tell us your name.';
  if (!form.mobile.trim()) return 'Please add a contact number.';
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return 'Please enter a valid email address.';
  if (!form.concern.trim()) return 'Please tell us a little about your requirement.';
  return null;
}
