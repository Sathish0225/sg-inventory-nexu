import { useEffect, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
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
  if (status !== "ready") {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }
  return <>{children}</>;
};

export default AuthGate;
