import { useId, type SelectHTMLAttributes } from "react";

export type SelectOption = {
  disabled?: boolean;
  label: string;
  value: string;
};

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  hint?: string;
  label: string;
  options: readonly SelectOption[];
};

export function Select({
  hint,
  label,
  options,
  ...props
}: SelectProps) {
  const id = useId();
  const hintId = useId();

  return (
    <label className="ui-field" htmlFor={id}>
      <span>{label}</span>
      {hint ? <small id={hintId}>{hint}</small> : null}
      <select aria-describedby={hint ? hintId : undefined} id={id} {...props}>
        {options.map((option) => (
          <option
            disabled={option.disabled}
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}