// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import {
  Button,
  Modal,
  SegmentedControl,
  Select,
  Skeleton,
  Slider,
  Tabs,
  ToastRegion,
  Toggle,
} from "../src/components/ui";

afterEach(cleanup);

describe("accessible UI primitives", () => {
  it("gives buttons safe defaults and disabled semantics", () => {
    render(<Button disabled>Save</Button>);

    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toBeDisabled();
  });

  it("traps modal focus, closes with Escape and restores focus", async () => {
    const user = userEvent.setup();

    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open settings</button>
          <Modal onClose={() => setOpen(false)} open={open} title="Settings">
            <button>Confirm</button>
          </Modal>
        </>
      );
    }

    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Open settings" });
    await user.click(trigger);

    const close = screen.getByRole("button", { name: "Close dialog" });
    const confirm = screen.getByRole("button", { name: "Confirm" });
    expect(screen.getByRole("dialog", { name: "Settings" })).toBeVisible();
    expect(close).toHaveFocus();

    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(confirm).toHaveFocus();
    await user.keyboard("{Tab}");
    expect(close).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("supports keyboard navigation in tabs", async () => {
    const user = userEvent.setup();
    render(
      <Tabs
        ariaLabel="Reader settings"
        defaultValue="reading"
        items={[
          { content: "Reading panel", label: "Reading", value: "reading" },
          { content: "Profile panel", label: "Profile", value: "profile" },
        ]}
      />,
    );

    const reading = screen.getByRole("tab", { name: "Reading" });
    reading.focus();
    await user.keyboard("{ArrowRight}");

    expect(screen.getByRole("tab", { name: "Profile" })).toHaveFocus();
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Profile panel");
  });

  it("exposes toggle and segmented states", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const onSegment = vi.fn();

    render(
      <>
        <Toggle
          checked={false}
          label="Boost mode"
          onCheckedChange={onToggle}
        />
        <SegmentedControl
          ariaLabel="Words per block"
          onValueChange={onSegment}
          options={[
            { label: "1", value: "1" },
            { label: "2", value: "2" },
          ]}
          value="1"
        />
      </>,
    );

    const toggle = screen.getByRole("switch", { name: "Boost mode" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    await user.click(toggle);
    expect(onToggle).toHaveBeenCalledWith(true);

    const first = screen.getByRole("button", { name: "1" });
    first.focus();
    await user.keyboard("{ArrowRight}");
    expect(onSegment).toHaveBeenCalledWith("2");
  });

  it("labels form controls and status feedback", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();

    render(
      <>
        <Slider
          defaultValue={350}
          formatValue={(value) => value + " WPM"}
          label="Reading speed"
          max={1000}
          min={100}
        />
        <Select
          defaultValue="serif"
          label="Reading font"
          options={[
            { label: "Serif", value: "serif" },
            { label: "Sans", value: "sans" },
          ]}
        />
        <Skeleton label="Loading library" />
        <ToastRegion
          label="Notifications"
          onDismiss={onDismiss}
          toasts={[{ id: "saved", title: "Saved", tone: "success" }]}
        />
      </>,
    );

    expect(screen.getByRole("slider", { name: "Reading speed" })).toHaveValue("350");
    expect(screen.getByText("350 WPM")).toBeVisible();
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Reading font" }),
      "sans",
    );
    expect(screen.getByRole("combobox")).toHaveValue("sans");
    expect(screen.getByRole("status", { name: "Loading library" })).toBeVisible();
    expect(screen.getByRole("status", { name: "Saved" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalledWith("saved");
  });

  it("closes a modal when its backdrop is pressed", () => {
    const onClose = vi.fn();
    render(
      <Modal onClose={onClose} open title="Import">
        Content
      </Modal>,
    );

    fireEvent.mouseDown(screen.getByRole("dialog").parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledOnce();
  });
});