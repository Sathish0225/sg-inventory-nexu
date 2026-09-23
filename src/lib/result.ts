import { toast } from "sonner";
import type { Result } from "@/store/useStore";

/** Show a toast for a store Result; returns true on success. */
export const notify = <T,>(result: Result<T>, success?: string): result is { ok: true; value: T } => {
  if (!result.ok) {
    toast.error(result.error);
    return false;
  }
  if (success) toast.success(success);
  return true;
};
