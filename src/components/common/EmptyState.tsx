import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

const EmptyState = ({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: ReactNode }) => (
  <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
    <div className="rounded-full bg-muted p-3">
      <Icon className="h-6 w-6 text-muted-foreground" />
    </div>
    <p className="font-medium">{title}</p>
    {children && <div className="text-sm text-muted-foreground">{children}</div>}
  </div>
);

export default EmptyState;
