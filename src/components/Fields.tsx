import { ManualMeters } from './ManualMeters';
import type { Field, Fields } from '../adapters/contracts';

type Props = {
  fields: Field[];
  values: Fields;
  change: (values: Fields) => void;
  disabled?: boolean;
};
export function FieldsForm({ fields, values, change, disabled }: Props) {
  const render = (field: Field) => (
    <ConnectionField
      key={field.key}
      field={field}
      value={values[field.key] ?? ''}
      change={(value) => change({ ...values, [field.key]: value })}
      disabled={disabled}
    />
  );
  return (
    <div className="fields">
      {fields.filter((field) => !field.advanced).map(render)}
      {fields.some((field) => field.advanced) && (
        <details>
          <summary>Advanced connection options</summary>
          {fields.filter((field) => field.advanced).map(render)}
        </details>
      )}
    </div>
  );
}

function ConnectionField({
  field,
  value,
  change,
  disabled,
}: {
  field: Field;
  value: string;
  change: (value: string) => void;
  disabled?: boolean;
}) {
  const props = {
    id: field.key,
    name: field.key,
    value,
    disabled,
    required: field.required,
    'aria-describedby': `${field.key}-help`,
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
    ) => change(event.target.value),
  };
  let control;
  if (field.type === 'meters') {
    return (
      <fieldset>
        <legend>{field.label}</legend>
        <ManualMeters value={value} change={change} disabled={disabled} />
        <small>{field.help}</small>
      </fieldset>
    );
  }
  if (field.type === 'textarea') {
    control = <textarea {...props} rows={3} autoComplete="off" spellCheck={false} />;
  } else if (field.type === 'select') {
    control = (
      <select {...props}>
        {field.options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  } else {
    control = <input {...props} type={field.type} autoComplete="off" spellCheck={false} />;
  }
  return (
    <div className="field">
      <label htmlFor={field.key}>{field.label}</label>
      {control}
      <small id={`${field.key}-help`}>{field.help}</small>
    </div>
  );
}
