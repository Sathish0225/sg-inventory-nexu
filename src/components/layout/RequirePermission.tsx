import type { ReactNode } from "react";
import { ShieldOff } from "lucide-react";
import EmptyState from "@/components/common/EmptyState";
import type { Permission } from "@/lib/permissions";
import { useCan } from "@/store/useStore";

/** Route-level guard; the API enforces the same rule, this just explains it. */
const RequirePermission = ({ permission, children }: { permission: Permission; children: ReactNode }) =>
  useCan(permission) ? (
    <>{children}</>
  ) : (
    <EmptyState icon={ShieldOff} title="You don't have access to this page">
      Ask an administrator if you need it.
    </EmptyState>
  );

export default RequirePermission;
