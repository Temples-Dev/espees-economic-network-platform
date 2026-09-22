import { AppleIcon, GoogleIcon, XIcon } from "@/components/ui/social-icons";

const PROVIDERS = [
  { name: "Google", icon: GoogleIcon },
  { name: "Apple", icon: AppleIcon },
  { name: "X", icon: XIcon },
] as const;

/** Icons only — no social auth wired up on the backend yet (mirrors mobile). */
export function SocialAuthRow() {
  return (
    <div className="space-y-4 pt-1">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <p className="text-xs text-body">or continue with</p>
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="flex justify-center gap-3">
        {PROVIDERS.map((p) => (
          <button
            key={p.name}
            type="button"
            aria-label={`Continue with ${p.name}`}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-border text-ink transition-colors hover:border-royal/40"
          >
            <p.icon className="h-5 w-5" />
          </button>
        ))}
      </div>
    </div>
  );
}
