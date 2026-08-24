"use client";

type ToggleProps = {
  checked: boolean;
  description?: string;
  disabled?: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
};

export function Toggle({
  checked,
  description,
  disabled,
  label,
  onCheckedChange,
}: ToggleProps) {
  return (
    <button
      aria-checked={checked}
      className="ui-toggle-row"
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      role="switch"
      type="button"
    >
      <span className="ui-toggle-copy">
        <strong>{label}</strong>
        {description ? <small>{description}</small> : null}
      </span>
      <span aria-hidden="true" className="ui-toggle-track">
        <span className="ui-toggle-thumb" />
      </span>
    </button>
  );
}