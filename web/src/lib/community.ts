import { api } from "./api";

export type MemberSummary = { id: string; email: string; full_name: string };

export type Conversation = {
  id: string;
  initiator: MemberSummary;
  other_party: MemberSummary;
  business_name: string | null;
  order_id: string | null;
  campaign_title: string | null;
  last_message_at: string | null;
  last_message: string | null;
  last_message_sender: string | null;
  unread_count: number;
  created_at: string;
};

export type Message = {
  id: string;
  sender: string;
  sender_email: string;
  sender_full_name: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export type ConversationDetail = Conversation & { messages: Message[] };

/** The other side of a conversation, relative to the signed-in member. */
export function counterpart(conversation: Conversation, userId: string): MemberSummary {
  return conversation.initiator.id === userId ? conversation.other_party : conversation.initiator;
}

export function listConversations(): Promise<Conversation[]> {
  return api.getList<Conversation>("/api/v1/conversations/");
}

export function getConversation(id: string): Promise<ConversationDetail> {
  return api.get<ConversationDetail>(`/api/v1/conversations/${id}/`);
}

export function sendMessage(conversationId: string, body: string): Promise<Message> {
  return api.post<Message>(`/api/v1/conversations/${conversationId}/messages/`, { body });
}

export function markConversationRead(conversationId: string): Promise<{ marked_read: number }> {
  return api.post(`/api/v1/conversations/${conversationId}/read/`, {});
}
