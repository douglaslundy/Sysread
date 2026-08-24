"use client";

import {
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

export type TabItem = {
  content: ReactNode;
  disabled?: boolean;
  label: ReactNode;
  value: string;
};

type TabsProps = {
  ariaLabel: string;
  defaultValue?: string;
  items: readonly TabItem[];
  onValueChange?: (value: string) => void;
  value?: string;
};

export function Tabs({
  ariaLabel,
  defaultValue,
  items,
  onValueChange,
  value,
}: TabsProps) {
  const id = useId();
  const firstEnabled = items.find((item) => !item.disabled)?.value ?? "";
  const [internalValue, setInternalValue] = useState(
    defaultValue ?? firstEnabled,
  );
  const selectedValue = value ?? internalValue;
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function select(nextValue: string) {
    if (value === undefined) setInternalValue(nextValue);
    onValueChange?.(nextValue);
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const enabledIndexes = items
      .map((item, itemIndex) => (item.disabled ? -1 : itemIndex))
      .filter((itemIndex) => itemIndex >= 0);
    const currentPosition = enabledIndexes.indexOf(index);
    let targetPosition = currentPosition;

    if (event.key === "ArrowRight") {
      targetPosition = (currentPosition + 1) % enabledIndexes.length;
    } else if (event.key === "ArrowLeft") {
      targetPosition =
        (currentPosition - 1 + enabledIndexes.length) % enabledIndexes.length;
    } else if (event.key === "Home") {
      targetPosition = 0;
    } else if (event.key === "End") {
      targetPosition = enabledIndexes.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const targetIndex = enabledIndexes[targetPosition];
    refs.current[targetIndex]?.focus();
    select(items[targetIndex].value);
  }

  const selectedItem =
    items.find((item) => item.value === selectedValue) ??
    items.find((item) => !item.disabled);

  return (
    <div className="ui-tabs">
      <div aria-label={ariaLabel} className="ui-tab-list" role="tablist">
        {items.map((item, index) => {
          const selected = item.value === selectedItem?.value;
          const tabId = id + "-tab-" + index;
          const panelId = id + "-panel-" + index;

          return (
            <button
              aria-controls={panelId}
              aria-selected={selected}
              disabled={item.disabled}
              id={tabId}
              key={item.value}
              onClick={() => select(item.value)}
              onKeyDown={(event) => onKeyDown(event, index)}
              ref={(element) => {
                refs.current[index] = element;
              }}
              role="tab"
              tabIndex={selected ? 0 : -1}
              type="button"
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {selectedItem ? (
        <div
          aria-labelledby={
            id + "-tab-" + items.findIndex((item) => item === selectedItem)
          }
          className="ui-tab-panel"
          key={selectedItem.value}
          id={
            id + "-panel-" + items.findIndex((item) => item === selectedItem)
          }
          role="tabpanel"
          tabIndex={0}
        >
          {selectedItem.content}
        </div>
      ) : null}
    </div>
  );
}