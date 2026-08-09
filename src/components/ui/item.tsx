import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const itemVariants = cva(
  "flex flex-wrap items-center gap-3 rounded-xl border border-transparent text-sm outline-none transition-colors",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        muted: "bg-muted/50",
        outline: "border-border bg-card",
      },
      size: {
        default: "p-4",
        sm: "px-3 py-2.5",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Item({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof itemVariants>) {
  return <div data-slot="item" className={cn(itemVariants({ variant, size, className }))} {...props} />;
}

function ItemGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="item-group" role="list" className={cn("flex flex-col gap-2", className)} {...props} />;
}

function ItemMedia({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="item-media" className={cn("flex size-9 shrink-0 items-center justify-center", className)} {...props} />;
}

function ItemContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="item-content" className={cn("min-w-0 flex-1", className)} {...props} />;
}

function ItemTitle({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="item-title" className={cn("font-bold leading-snug", className)} {...props} />;
}

function ItemDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="item-description" className={cn("text-xs leading-snug text-muted-foreground", className)} {...props} />;
}

function ItemActions({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="item-actions" className={cn("ml-auto shrink-0", className)} {...props} />;
}

export { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle };
