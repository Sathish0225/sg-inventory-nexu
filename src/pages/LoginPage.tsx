import { useEffect, useRef, useState } from "react";
import { Loader2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSecretGesture } from "@/hooks/use-secret-gesture";
import { appStorage, isApp } from "@/lib/platform";
import { SERVER_KEY, useStore } from "@/store/useStore";

const LoginPage = () => {
  const login = useStore((s) => s.login);
  const changeRequested = useStore((s) => s.serverChangeRequested);
  const [server, setServer] = useState("");
  // Apps show the server field on first sign-in only; afterwards it's hidden behind a gesture
  // on the logo (hold, or tap 5 times) or Ctrl/Cmd+Shift+S.
  const [savedServer, setSavedServer] = useState<string | null>(null);
  const [showServer, setShowServer] = useState(false);
  const serverInput = useRef<HTMLInputElement>(null);
  const revealServer = () => {
    setShowServer(true);
    setTimeout(() => serverInput.current?.focus(), 0);
  };
  const gesture = useSecretGesture(revealServer);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Apps: prefill the server used last time; with none saved, this is the first sign-in.
  useEffect(() => {
    if (!isApp) return;
    void appStorage.get(SERVER_KEY).then((saved) => {
      setSavedServer(saved ?? "");
      if (saved) setServer(saved);
      if (!saved || changeRequested) setShowServer(true);
    });
  }, [changeRequested]);

  useEffect(() => {
    if (!isApp) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        revealServer();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const r = await login(email.trim(), password, server);
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      // The saved server can't be reached: let the user correct it instead of getting stuck.
      if (r.error.startsWith("No InvenTrack server found")) setShowServer(true);
    }
  };

  return (
    <div className="pt-safe flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div
            {...(isApp ? gesture : {})}
            className="mb-2 flex h-11 w-11 select-none items-center justify-center rounded-xl bg-primary text-primary-foreground"
          >
            <Package className="h-5 w-5" />
          </div>
          <CardTitle>InvenTrack SG</CardTitle>
          <CardDescription>Sign in to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4">
            {isApp && showServer && (
              <div className="grid gap-1.5">
                <Label htmlFor="login-server">Company server</Label>
                <Input
                  id="login-server"
                  ref={serverInput}
                  inputMode="url"
                  autoCapitalize="none"
                  autoCorrect="off"
                  placeholder="inventrack.yourcompany.sg"
                  value={server}
                  onChange={(e) => setServer(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">Ask your administrator for this address.</p>
              </div>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus={!isApp || Boolean(savedServer)}
                autoCapitalize="none"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
