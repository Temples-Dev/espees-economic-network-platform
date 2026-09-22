import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Discover } from "../Discover";

const { mockListBusinesses, mockListOfferings } = vi.hoisted(() => ({
  mockListBusinesses: vi.fn(),
  mockListOfferings: vi.fn(),
}));

vi.mock("../../lib/catalog", () => ({
  listBusinesses: mockListBusinesses,
  listOfferings: mockListOfferings,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockListOfferings.mockResolvedValue([]);
  mockListBusinesses.mockResolvedValue([
    {
      id: "b1",
      name: "Ama's Kitchen",
      category: "Food",
      description: "Local dishes.",
      location: "Accra",
      verification_status: "verified",
      average_rating: 4.5,
      review_count: 12,
      created_at: "2026-09-22T00:00:00Z",
    },
  ]);
});

describe("Discover", () => {
  it("lists businesses and opens detail with offerings", async () => {
    const user = userEvent.setup();
    mockListOfferings.mockResolvedValue([
      { id: "o1", name: "Jollof", kind: "product", price: "15.00" },
    ]);
    render(<Discover />);

    expect(await screen.findByText("Ama's Kitchen")).toBeInTheDocument();
    expect(screen.getByText("verified")).toBeInTheDocument();

    await user.click(screen.getByText("Ama's Kitchen"));
    expect(await screen.findByText("Jollof")).toBeInTheDocument();
    expect(screen.getByText("15.00 ESP")).toBeInTheDocument();
    expect(mockListOfferings).toHaveBeenCalledWith("b1");
  });

  it("searches with the entered query", async () => {
    const user = userEvent.setup();
    render(<Discover />);
    await screen.findByText("Ama's Kitchen");

    await user.type(screen.getByPlaceholderText("Search businesses…"), "kitchen");
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(mockListBusinesses).toHaveBeenCalledWith("kitchen");
  });

  it("handles an empty directory honestly", async () => {
    mockListBusinesses.mockResolvedValue([]);
    render(<Discover />);
    expect(await screen.findByText("No businesses found.")).toBeInTheDocument();
  });
});
