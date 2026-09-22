import * as SwitchPrimitive from "@radix-ui/react-switch";
import { forwardRef } from "react";
import type { ComponentPropsWithoutRef, ElementRef } from "react";

import { cn } from "@/lib/cn";

export const Switch = forwardRef<
  ElementRef<typeof SwitchPrimitive.Root>,
  ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-6 w-11 shrink-0 rounded-full bg-border transition-colors",
      "data-[state=checked]:bg-royal",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal/30",
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[22px]" />
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";
