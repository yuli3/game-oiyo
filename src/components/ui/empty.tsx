import * as React from "react";

import { cn } from "@/lib/utils";

function Empty({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      data-slot="empty"
      className={cn("flex flex-col items-center justify-center gap-5 rounded-xl border border-dashed border-border bg-card px-5 py-10 text-center", className)}
      {...props}
    />
  );
}

function EmptyMedia({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="empty-media" className={cn("flex size-12 items-center justify-center rounded-full bg-primary/10 text-2xl", className)} {...props} />;
}

function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="empty-header" className={cn("max-w-md space-y-2", className)} {...props} />;
}

function EmptyTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 data-slot="empty-title" className={cn("text-lg font-black", className)} {...props} />;
}

function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="empty-description" className={cn("text-sm leading-6 text-muted-foreground", className)} {...props} />;
}

function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="empty-content" className={cn("flex items-center justify-center", className)} {...props} />;
}

export { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle };
