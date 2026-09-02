import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "success";
  size?: "sm" | "md" | "lg";
};

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-brand-600 hover:bg-brand-500 text-white shadow-sm focus-visible:ring-brand-500",
  secondary:
    "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-400",
  danger: "bg-rose-600 hover:bg-rose-500 text-white focus-visible:ring-rose-500",
  success: "bg-emerald-600 hover:bg-emerald-500 text-white focus-visible:ring-emerald-500",
  ghost: "text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-300",
};

const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}