import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnimatedLogo } from "./AnimatedLogo";

describe("AnimatedLogo", () => {
  it("draws two turning hands over the logo with its hands painted out", () => {
    render(<AnimatedLogo className="h-20 w-20" />);

    expect(screen.getByAltText("Expiry Alert")).toHaveAttribute("src", "/logo-face-v1.png");
    const hands = screen.getByTestId("logo-hands");
    expect(hands).toHaveAttribute("aria-hidden", "true");
    expect(hands.querySelector(".logo-hand-long")).not.toBeNull();
    expect(hands.querySelector(".logo-hand-short")).not.toBeNull();
  });
});
