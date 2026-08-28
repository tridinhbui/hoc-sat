import * as React from "react";
import { cn } from "@/lib/utils/cn";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full resize-y rounded-[var(--radius-md)] bg-sunken px-4 py-3 text-[15px] text-ink",
      "placeholder:text-muted border border-transparent focus:bg-surface focus:border-line-strong",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
