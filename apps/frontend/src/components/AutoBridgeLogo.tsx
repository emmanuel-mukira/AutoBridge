import { cn } from "@/lib/utils";
import { CarFront } from "lucide-react";

export function AutoBridgeLogo({ className, showName = true, name = "AutoBridge" }: { className?: string; showName?: boolean; name?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
        <CarFront className="h-5 w-5" aria-hidden="true" />
      </span>
      {showName && <span className="text-lg font-bold tracking-tight">{name}</span>}
    </span>
  );
}
