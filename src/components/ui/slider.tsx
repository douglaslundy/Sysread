import { useId, type InputHTMLAttributes } from "react";

type SliderProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "id" | "type"
> & {
  formatValue?: (value: number) => string;
  label: string;
};

export function Slider({
  formatValue = String,
  label,
  value,
  defaultValue,
  ...props
}: SliderProps) {
  const id = useId();
  const displayedValue = Number(value ?? defaultValue ?? props.min ?? 0);

  return (
    <div className="ui-field">
      <div className="ui-field-heading">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>{formatValue(displayedValue)}</output>
      </div>
      <input
        defaultValue={defaultValue}
        id={id}
        type="range"
        value={value}
        {...props}
      />
    </div>
  );
}