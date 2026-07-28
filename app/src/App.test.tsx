import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("./lib/pda", () => ({
  deriveDemoPdas: () => [],
}));

describe("Alliance Passport app", () => {
  it("opens an available offer and updates preview state after redemption", async () => {
    const user = userEvent.setup();
    render(<App />);

    const offerHeading = screen.getByRole("heading", {
      name: "Priority check-in + lounge",
    });
    const offerCard = offerHeading.closest("article");
    expect(offerCard).not.toBeNull();

    await user.click(
      within(offerCard as HTMLElement).getByRole("button", {
        name: "Redeem",
      }),
    );

    expect(
      screen.getByRole("dialog", { name: "Priority check-in + lounge" }),
    ).toBeInTheDocument();
    expect(screen.getByText("2,260 points")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Confirm redemption" }),
    );

    await waitFor(
      () =>
        expect(
          screen.getByText("Redemption preview created"),
        ).toBeInTheDocument(),
      { timeout: 1_500 },
    );
    expect(
      screen.getByText(
        "Priority check-in + lounge reserved in preview state",
      ),
    ).toBeInTheDocument();
  });

  it("switches to the deterministic architecture inspector", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Architecture" }));

    expect(
      screen.getByRole("heading", { name: "On-chain architecture" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Program-derived accounts")).toBeInTheDocument();
    expect(screen.getByText("NonTransferable mint")).toBeInTheDocument();
  });
});
