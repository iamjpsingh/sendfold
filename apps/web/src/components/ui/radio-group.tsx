import * as React from "react";
import { RadioGroup as Primitive } from "radix-ui";
import { Circle } from "lucide-react";
import { cn } from "@/lib/utils";
export function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Root>) {
  return (
    <Primitive.Root
      data-slot="radio-group"
      className={cn("grid gap-2", className)}
      {...props}
    />
  );
}
export function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Item>) {
  return (
    <Primitive.Item
      data-slot="radio-group-item"
      className={cn(
        "size-4 shrink-0 rounded-full border border-input text-link outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <Primitive.Indicator className="flex items-center justify-center">
        <Circle className="size-2.5 fill-current" />
      </Primitive.Indicator>
    </Primitive.Item>
  );
}
