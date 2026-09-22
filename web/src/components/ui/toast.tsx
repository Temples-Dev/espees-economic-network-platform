import * as ToastPrimitive from "@radix-ui/react-toast";
import { X } from "lucide-react";
import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type ToastTone = "default" | "success" | "error";
type ToastItem = { id: number; title: string; description?: string; tone: ToastTone };

const ToastContext = createContext<((title: string, description?: string, tone?: ToastTone) => void) | null>(null);

export function useToast() {
  const notify = useContext(ToastContext);
  if (!notify) throw new Error("useToast must be used within ToastProvider");
  return {
    toast: (title: string, description?: string) => notify(title, description, "default"),
    success: (title: string, description?: string) => notify(title, description, "success"),
    error: (title: string, description?: string) => notify(title, description, "error"),
  };
}

const TONE_ACCENT: Record<ToastTone, string> = {
  default: "border-l-royal",
  success: "border-l-emerald-500",
  error: "border-l-red-500",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const notify = useCallback((title: string, description?: string, tone: ToastTone = "default") => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, title, description, tone }]);
  }, []);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}
        {items.map((item) => (
          <ToastPrimitive.Root
            key={item.id}
            duration={4000}
            onOpenChange={(open) => {
              if (!open) remove(item.id);
            }}
            className={cn(
              "flex items-start gap-3 rounded-xl border border-l-4 border-border bg-surface p-4 shadow-[var(--shadow-panel)]",
              "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out",
              TONE_ACCENT[item.tone],
            )}
          >
            <div className="flex-1">
              <ToastPrimitive.Title className="text-sm font-medium text-ink">{item.title}</ToastPrimitive.Title>
              {item.description && (
                <ToastPrimitive.Description className="mt-0.5 text-sm text-body">
                  {item.description}
                </ToastPrimitive.Description>
              )}
            </div>
            <ToastPrimitive.Close className="text-body hover:text-ink">
              <X className="h-4 w-4" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed bottom-0 right-0 z-[100] flex w-full max-w-sm flex-col gap-2 p-4 outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
