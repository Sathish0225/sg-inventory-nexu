import { useEffect, type ReactNode } from "react";
import { Loader2, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiBaseUrl } from "@/lib/api";
import LoginPage from "@/pages/LoginPage";
import { useStore } from "@/store/useStore";

/** Shows the login screen until there's a session, then keeps data fresh while the app is open. */
const AuthGate = ({ children }: { children: ReactNode }) => {
  const status = useStore((s) => s.status);
  const bootstrap = useStore((s) => s.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  // Pick up changes other users made: refresh when the tab regains focus and every 2 minutes.
  useEffect(() => {
    if (status !== "ready") return;
    const refresh = () => {
      if (document.visibilityState === "visible") void useStore.getState().refresh().catch(() => undefined);
    };
    window.addEventListener("focus", refresh);
    const timer = setInterval(refresh, 120_000);
    return () => {
      window.removeEventListener("focus", refresh);
      clearInterval(timer);
    };
  }, [status]);

  if (status === "signed-out") return <LoginPage />;
  if (status === "unreachable") return <Unreachable onRetry={() => void bootstrap()} />;
  if (status !== "ready") {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }
  return <>{children}</>;
};

/** Apps only: the saved server couldn't be reached (no signal, VPN off, server down). */
const Unreachable = ({ onRetry }: { onRetry: () => void }) => {
  const error = useStore((s) => s.connectionError);
  const logout = useStore((s) => s.logout);
  return (
    <div className="pt-safe flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="rounded-full bg-muted p-4">
        <WifiOff className="h-6 w-6 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium">Can't reach {apiBaseUrl() || "the server"}</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{error}</p>
      </div>
      <div className="flex gap-2">
        <Button onClick={onRetry}>Try again</Button>
        <Button variant="outline" onClick={() => void logout()}>
          Use another server
        </Button>
      </div>
    </div>
  );
};

export default AuthGate;
