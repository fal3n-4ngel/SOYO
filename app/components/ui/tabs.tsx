"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/app/lib/utils";

const Tabs = TabsPrimitive.Root;

/** Underline style rather than shadcn's default pill — matches soyo's tab bar elsewhere. */
const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "scrollbar-none flex gap-1.5 overflow-x-auto border-b border-line pb-px",
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-3.5 py-2.5",
      "text-xs font-bold uppercase tracking-[0.12em] text-subtle transition-colors",
      "hover:text-fg focus-visible:outline-none",
      "data-[state=active]:border-fg data-[state=active]:text-fg",
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = TabsPrimitive.Content;

export { Tabs, TabsList, TabsTrigger, TabsContent };
