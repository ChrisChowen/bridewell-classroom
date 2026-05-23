// @vitest-environment happy-dom
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { AccessibilityMenu } from "./AccessibilityMenu";

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-font-scale");
  document.documentElement.removeAttribute("data-reading");
  document.documentElement.removeAttribute("data-reduce-motion");
});
afterEach(() => cleanup());

describe("AccessibilityMenu", () => {
  it("opens the menu and shows the controls", () => {
    render(<AccessibilityMenu />);
    fireEvent.click(screen.getByLabelText("Settings"));
    expect(screen.getByText(/Text size/i)).toBeTruthy();
    expect(screen.getByText(/Dyslexia-friendly/i)).toBeTruthy();
    expect(screen.getByText(/Reduce motion/i)).toBeTruthy();
    expect(screen.getByText(/Dark mode/i)).toBeTruthy();
  });

  it("persists a text-size choice and applies it to <html>", () => {
    render(<AccessibilityMenu />);
    fireEvent.click(screen.getByLabelText("Settings"));
    // Three size buttons labelled "A"; the third is xlarge.
    const sizes = screen.getAllByRole("button", { name: "A" });
    fireEvent.click(sizes[2]);
    expect(window.localStorage.getItem("bw-a11y-font-scale")).toBe("xlarge");
    expect(document.documentElement.getAttribute("data-font-scale")).toBe("xlarge");
  });

  it("toggles dyslexia-friendly reading and persists it", () => {
    render(<AccessibilityMenu />);
    fireEvent.click(screen.getByLabelText("Settings"));
    const dyslexia = screen.getByText(/Dyslexia-friendly/i).closest("button")!;
    fireEvent.click(dyslexia);
    expect(window.localStorage.getItem("bw-a11y-reading")).toBe("friendly");
    expect(document.documentElement.getAttribute("data-reading")).toBe("friendly");
  });

  it("toggles dark mode and persists it to <html>", () => {
    render(<AccessibilityMenu />);
    fireEvent.click(screen.getByLabelText("Settings"));
    fireEvent.click(screen.getByText(/Dark mode/i).closest("button")!);
    expect(window.localStorage.getItem("bw-theme")).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("hides Switch class without a class href", () => {
    render(<AccessibilityMenu />);
    fireEvent.click(screen.getByLabelText("Settings"));
    expect(screen.queryByText(/Switch class/i)).toBeNull();
  });

  it("shows Switch class when a class href is given", () => {
    render(<AccessibilityMenu switchClassHref="/join" />);
    fireEvent.click(screen.getByLabelText("Settings"));
    expect(screen.getByText(/Switch class/i)).toBeTruthy();
  });
});
