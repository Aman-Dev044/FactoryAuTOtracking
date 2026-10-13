import React from 'react';
import { Field, Input, Select, Textarea, Checkbox, FormGrid } from '../ui';

/**
 * DynamicFormEngine
 * Renders a set of form fields from a dynamic JSON schema, using the shared
 * design-system controls so generated forms match hand-written ones.
 *
 * Props:
 * @param {Array}    fields   - [{ key, label, type, options, required, placeholder, hint, span }]
 * @param {Object}   data     - current values, keyed by field key
 * @param {Function} onChange - (key, value) => void
 * @param {Boolean}  readOnly - render the form disabled
 */
const DynamicFormEngine = ({ fields = [], data = {}, onChange, readOnly = false }) => {
  if (!fields || fields.length === 0) return null;

  const set = (key) => (e) => onChange && onChange(key, e.target.value);

  return (
    <FormGrid className="dynamic-form-engine">
      {fields.map((field) => {
        const { key, label, type, options, required, placeholder, hint, span } = field;
        const value = data[key] ?? '';
        const common = {
          value,
          onChange: set(key),
          required,
          disabled: readOnly,
          placeholder: placeholder || '',
        };

        let control;
        switch (type) {
          case 'number':
            control = <Input type="number" {...common} />;
            break;
          case 'select':
            control = (
              <Select {...common} placeholder={placeholder || 'Select…'}>
                {(options || []).map((opt) => {
                  const v = typeof opt === 'object' ? opt.value : opt;
                  const l = typeof opt === 'object' ? opt.label : opt;
                  return <option key={v} value={v}>{l}</option>;
                })}
              </Select>
            );
            break;
          case 'textarea':
            control = <Textarea rows={3} {...common} />;
            break;
          case 'checkbox':
            control = (
              <Checkbox
                label={placeholder || label}
                checked={Boolean(data[key])}
                disabled={readOnly}
                onChange={(e) => onChange && onChange(key, e.target.checked)}
              />
            );
            break;
          case 'time':
          case 'date':
          case 'datetime-local':
            control = <Input type={type} {...common} />;
            break;
          default:
            control = <Input type="text" {...common} />;
        }

        return (
          <Field
            key={key}
            // A checkbox carries its own label, so don't repeat it above.
            label={type === 'checkbox' ? undefined : label}
            required={required}
            hint={hint}
            span={span}
          >
            {control}
          </Field>
        );
      })}
    </FormGrid>
  );
};

export default DynamicFormEngine;
