import { Send, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { Avatar, AvatarFallback, initials } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

import { errorMessage } from "../lib/api";
import type { User } from "../lib/auth";
import type { Conversation, ConversationDetail, Message } from "../lib/community";
import { counterpart, getConversation, listConversations, markConversationRead, sendMessage } from "../lib/community";
import { Card, ErrorText, Muted } from "./ui";

function relativeLabel(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString();
}

export function Community({ user }: { user: User }) {
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [thread, setThread] = useState<ConversationDetail | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function refreshList() {
    return listConversations()
      .then(setConversations)
      .catch((err: unknown) => setError(errorMessage(err, "Could not load conversations.")));
  }

  useEffect(() => {
    void refreshList();
  }, []);

  function open(id: string) {
    setSelectedId(id);
    setError(null);
    getConversation(id)
      .then((data) => {
        setThread(data);
        void markConversationRead(id).then(() => void refreshList());
      })
      .catch((err: unknown) => setError(errorMessage(err, "Could not load conversation.")));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!selectedId || !draft.trim()) return;
    setError(null);
    setSending(true);
    try {
      const message = await sendMessage(selectedId, draft.trim());
      setDraft("");
      setThread((prev) => (prev ? { ...prev, messages: [...prev.messages, message] } : prev));
      void refreshList();
    } catch (err) {
      setError(errorMessage(err, "Message failed to send."));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-ink">Community</h2>
        <p className="mt-1 text-sm text-body">Conversations with businesses and members.</p>
      </div>

      {conversations === null ? (
        <Muted>Loading…</Muted>
      ) : conversations.length === 0 ? (
        <Card>
          <Muted>No conversations yet.</Muted>
        </Card>
      ) : (
        <div className="space-y-2">
          {conversations.map((c) => {
            const other = counterpart(c, user.id);
            return (
              <button key={c.id} onClick={() => open(c.id)} className="block w-full text-left">
                <Card className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{initials(other.full_name || other.email)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-medium text-ink">
                        {other.full_name || other.email}
                        {c.business_name ? ` · ${c.business_name}` : ""}
                      </p>
                      {c.unread_count > 0 && <Badge tone="brand">{c.unread_count}</Badge>}
                    </div>
                    <p className="truncate text-sm text-body">{c.last_message || "No messages yet."}</p>
                  </div>
                </Card>
              </button>
            );
          })}
        </div>
      )}

      <ErrorText message={conversations !== null ? error : null} />

      {selectedId && thread && (
        <Card className="flex h-[520px] flex-col">
          <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback>
                  {initials(counterpart(thread, user.id).full_name || counterpart(thread, user.id).email)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-ink">
                  {counterpart(thread, user.id).full_name || counterpart(thread, user.id).email}
                </p>
                {thread.business_name && <p className="text-xs text-body">{thread.business_name}</p>}
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedId(null);
                setThread(null);
              }}
              aria-label="Close conversation"
              className="rounded-lg p-1.5 text-body hover:bg-paper hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto py-3">
            {thread.messages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <Muted>Say hello — this thread is empty.</Muted>
              </div>
            ) : (
              thread.messages.map((m: Message) => {
                const mine = m.sender === user.id;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                        mine ? "bg-royal text-white" : "bg-paper text-ink"
                      }`}
                    >
                      <p>{m.body}</p>
                      <p className={`mt-1 text-[11px] ${mine ? "text-white/60" : "text-body/70"}`}>
                        {relativeLabel(m.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <ErrorText message={error} />
          <form onSubmit={(e) => void submit(e)} className="mt-2 flex items-center gap-2 border-t border-border pt-3">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write a message…"
              className="h-11 flex-1 rounded-lg border border-border bg-surface px-3.5 text-sm text-ink placeholder:text-body/60 focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/15"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              aria-label="Send message"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-royal text-white hover:bg-deep disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </Card>
      )}
    </div>
  );
}
