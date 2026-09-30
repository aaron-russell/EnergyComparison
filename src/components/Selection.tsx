import { useId } from 'react';
type Option = { value: string; label: string; disabled?: boolean };
type Props = {
  label: string;
  value: string;
  change: (value: string) => void;
  options: Option[];
  disabled?: boolean;
};
export function Selection({ label, value, change, options, disabled }: Props) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => change(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
