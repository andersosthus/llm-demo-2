import type { InputHTMLAttributes } from "react";

import { cn } from "../../lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-sm text-stone-100 outline-none transition-colors placeholder:text-stone-500 focus:border-amber-300",
        className,
      )}
      {...props}
    />
  );
}
