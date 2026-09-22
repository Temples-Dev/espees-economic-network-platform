import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { User } from "../../lib/auth";
import { Community } from "../Community";

const { mockList, mockGet, mockSend, mockRead } = vi.hoisted(() => ({
  mockList: vi.fn(),
  mockGet: vi.fn(),
  mockSend: vi.fn(),
  mockRead: vi.fn(),
}));

vi.mock("../../lib/community", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/community")>();
  return {
    ...actual,
    listConversations: mockList,
    getConversation: mockGet,
    sendMessage: mockSend,
    markConversationRead: mockRead,
  };
});

const me: User = {
  id: "u1",
  email: "me@example.com",
  full_name: "Ada Member",
  is_verified: true,
  is_staff: false,
  wallet: null,
};

const conversation = {
  id: "c1",
  initiator: { id: "u1", email: "me@example.com", full_name: "Ada Member" },
  other_party: { id: "u2", email: "owner@example.com", full_name: "Kofi Owner" },
  business_name: "Ama's Kitchen",
  order_id: null,
  campaign_title: null,
  last_message_at: "2026-09-22T00:00:00Z",
  last_message: "See you then!",
  last_message_sender: "u2",
  unread_count: 2,
  created_at: "2026-09-22T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockRead.mockResolvedValue({ marked_read: 2 });
});

describe("Community", () => {
  it("lists conversations with the counterpart and unread count", async () => {
    mockList.mockResolvedValue([conversation]);
    render(<Community user={me} />);

    expect(await screen.findByText(/Kofi Owner/)).toBeInTheDocument();
    expect(screen.getByText(/Ama's Kitchen/)).toBeInTheDocument();
    expect(screen.getByText("See you then!")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("opens a thread, marks it read, and sends a reply", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue([conversation]);
    mockGet.mockResolvedValue({
      ...conversation,
      messages: [
        {
          id: "m1",
          sender: "u2",
          sender_email: "owner@example.com",
          sender_full_name: "Kofi Owner",
          body: "Hey, is this still available?",
          read_at: null,
          created_at: "2026-09-22T00:00:00Z",
        },
      ],
    });
    mockSend.mockResolvedValue({
      id: "m2",
      sender: "u1",
      sender_email: "me@example.com",
      sender_full_name: "Ada Member",
      body: "Yes it is!",
      read_at: null,
      created_at: "2026-09-22T00:01:00Z",
    });
    render(<Community user={me} />);

    await user.click(await screen.findByText(/Kofi Owner/));
    expect(await screen.findByText("Hey, is this still available?")).toBeInTheDocument();
    expect(mockRead).toHaveBeenCalledWith("c1");

    await user.type(screen.getByPlaceholderText("Write a message…"), "Yes it is!");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(mockSend).toHaveBeenCalledWith("c1", "Yes it is!");
    expect(await screen.findByText("Yes it is!")).toBeInTheDocument();
  });

  it("handles an empty inbox honestly", async () => {
    mockList.mockResolvedValue([]);
    render(<Community user={me} />);
    expect(await screen.findByText("No conversations yet.")).toBeInTheDocument();
  });
});
