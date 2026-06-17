import React from "react";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import BackToTopButton from "../../src/components/BackToTopButton";

describe("BackToTopButton", () => {
  beforeEach(() => {
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    Object.defineProperty(window, "scrollY", { value: 0, writable: true, configurable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not render when scroll Y is 0", () => {
    render(<BackToTopButton />);
    expect(screen.queryByRole("button", { name: "Back to top" })).not.toBeInTheDocument();
  });

  it("does not render when scroll Y is exactly 400px", () => {
    Object.defineProperty(window, "scrollY", { value: 400, writable: true, configurable: true });
    render(<BackToTopButton />);
    fireEvent.scroll(window);
    expect(screen.queryByRole("button", { name: "Back to top" })).not.toBeInTheDocument();
  });

  it("renders when scroll Y is greater than 400px", () => {
    Object.defineProperty(window, "scrollY", { value: 401, writable: true, configurable: true });
    render(<BackToTopButton />);
    fireEvent.scroll(window);
    expect(screen.getByRole("button", { name: "Back to top" })).toBeInTheDocument();
  });

  it("calls window.scrollTo with smooth behavior when clicked", () => {
    Object.defineProperty(window, "scrollY", { value: 500, writable: true, configurable: true });
    render(<BackToTopButton />);
    fireEvent.scroll(window);

    fireEvent.click(screen.getByRole("button", { name: "Back to top" }));

    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: "smooth",
    });
  });

  it("calls window.scrollTo when Enter or Space is pressed", () => {
    Object.defineProperty(window, "scrollY", { value: 500, writable: true, configurable: true });
    render(<BackToTopButton />);
    fireEvent.scroll(window);

    const button = screen.getByRole("button", { name: "Back to top" });

    fireEvent.keyDown(button, { key: "Enter" });
    expect(window.scrollTo).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(button, { key: " " });
    expect(window.scrollTo).toHaveBeenCalledTimes(2);
  });
});
