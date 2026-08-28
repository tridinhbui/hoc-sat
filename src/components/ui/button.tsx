import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const button = cva(
  "inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap rise disabled:opacity-50 disabled:pointer-events-none [&_svg]:size-[18px] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-white shadow-soft hover:bg-primary-hover",
        secondary:
          "bg-surface text-ink border border-line-strong shadow-soft-sm hover:border-primary",
        ghost: "text-body hover:bg-primary-soft hover:text-primary",
        accent: "bg-accent text-ink shadow-soft hover:bg-accent-warm",
        danger: "bg-danger text-white shadow-soft hover:brightness-95",
        quiet: "bg-sunken text-body hover:bg-primary-soft",
      },
      size: {
        sm: "h-9 px-4 text-[13px] rounded-full",
        md: "h-11 px-6 text-[15px] rounded-full",
        lg: "h-13 px-8 text-base rounded-full",
        icon: "size-11 rounded-full",
      },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, ...props }, ref) => (
    <button ref={ref} className={cn(button({ variant, size, block }), className)} {...props} />
  ),
);
Button.displayName = "Button";

export { button as buttonVariants };
