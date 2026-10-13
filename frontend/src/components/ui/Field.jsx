import React from 'react';

/**
 * Wraps a control with its label, hint and error.
 * `span` widens the field inside a FormGrid: 2 | 'all'.
 */
export const Field = ({ label, required, hint, error, span, className = '', children }) => (
  <div
    className={`field${span === 2 ? ' span-2' : span === 'all' ? ' span-all' : ''} ${className}`.trim()}
  >
    {label && (
      <label className="field-label">
        {label}
        {required && <span className="req">*</span>}
      </label>
    )}
    {children}
    {error ? <div className="field-error">{error}</div> : hint ? <div className="field-hint">{hint}</div> : null}
  </div>
);

export const Input = ({ invalid, className = '', ...rest }) => (
  <input className={`field-control${invalid ? ' invalid' : ''} ${className}`.trim()} {...rest} />
);

export const Textarea = ({ invalid, className = '', ...rest }) => (
  <textarea className={`field-control${invalid ? ' invalid' : ''} ${className}`.trim()} {...rest} />
);

/** options: [{ value, label }] — or pass <option> children directly. */
export const Select = ({ invalid, options, placeholder, className = '', children, ...rest }) => (
  <select className={`field-control${invalid ? ' invalid' : ''} ${className}`.trim()} {...rest}>
    {placeholder && <option value="">{placeholder}</option>}
    {options
      ? options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))
      : children}
  </select>
);

/** Text + label pair used for boolean settings. */
export const Checkbox = ({ label, className = '', ...rest }) => (
  <label
    className={className}
    style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', fontSize: 'var(--fs-base)', color: 'var(--text-secondary)' }}
  >
    <input type="checkbox" style={{ width: 15, height: 15, accentColor: 'var(--primary)', cursor: 'pointer' }} {...rest} />
    {label}
  </label>
);
