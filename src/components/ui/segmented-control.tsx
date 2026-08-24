"use client";

import { useRef, type KeyboardEvent } from "react";

export type SegmentedOption = {
  disabled?: boolean;
  label: string;
  value: string;
};

type SegmentedControlProps = {
  ariaLabel: string;
  onValueChange: (value: string) => void;
  options: readonly SegmentedOption[];
  value: string;
};

export function SegmentedControl({
  ariaLabel,
  onValueChange,
  options,
  value,
}: SegmentedControlProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    let target = index;

    do {
      target = (target + direction + options.length) % options.length;
    } while (options[target].disabled && target !== index);

    if (!options[target].disabled) {
      refs.current[target]?.focus();
      onValueChange(options[target].value);
    }
  }

  return (
    <div aria-label={ariaLabel} className="ui-segmented" role="group">
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            aria-pressed={selected}
            disabled={option.disabled}
            key={option.value}
            onClick={() => onValueChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            ref={(element) => {
              refs.current[index] = element;
            }}
            tabIndex={selected ? 0 : -1}
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}