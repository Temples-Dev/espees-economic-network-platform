import { Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { api, errorMessage } from "../lib/api";
import type { Category } from "./types";
import { slugify } from "./types";

export function Categories() {
  const [cats, setCats] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<Category | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function refresh() {
    setCats(await api.getList<Category>("/api/v1/categories/"));
  }

  useEffect(() => {
    refresh().catch((err: unknown) => setError(errorMessage(err, "Could not load categories.")));
  }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await api.post("/api/v1/categories/", { name: name.trim(), slug: slugify(name) });
      setName("");
      setNotice("Category created.");
      await refresh();
    } catch (err) {
      setError(errorMessage(err, "Category creation failed."));
    } finally {
      setBusy(false);
    }
  }

  async function rename(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setError(null);
    setBusy(true);
    try {
      await api.patch(`/api/v1/categories/${editing.id}/`, { name: editing.name });
      setEditing(null);
      setNotice("Category renamed.");
      await refresh();
    } catch (err) {
      setError(errorMessage(err, "Rename failed."));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this category?")) return;
    setError(null);
    try {
      await api.del(`/api/v1/categories/${id}/`);
      setNotice("Category deleted.");
      await refresh();
    } catch (err) {
      setError(errorMessage(err, "Delete failed."));
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={(e) => void create(e)} className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name" />
        <Button disabled={busy}>Add</Button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {notice && <p className="text-sm text-emerald-600">{notice}</p>}
      {editing && (
        <Card className="border-royal/30 bg-surface-selected/40">
          <form onSubmit={(e) => void rename(e)} className="flex gap-2">
            <Input
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              className="flex-1"
            />
            <Button disabled={busy}>Save</Button>
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </form>
        </Card>
      )}
      <div className="space-y-2">
        {cats.map((c) => (
          <Card key={c.id} className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-ink">{c.name}</p>
              <p className="text-xs text-body">{c.slug}</p>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => setEditing(c)} aria-label="Rename">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => void remove(c.id)} aria-label="Delete">
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          </Card>
        ))}
        {cats.length === 0 && <p className="text-sm text-body">No categories yet.</p>}
      </div>
    </div>
  );
}
