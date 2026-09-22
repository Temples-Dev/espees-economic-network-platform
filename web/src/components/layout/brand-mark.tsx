import logo from "@/assets/eenp-logo.png";
import { cn } from "@/lib/cn";

export function BrandMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <img
      src={logo}
      alt="EENP"
      width={size}
      height={size}
      className={cn("rounded-lg object-cover", className)}
      style={{ width: size, height: size }}
    />
  );
}
