import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { can, type Permission, type Role } from "@/lib/permissions";
import { ApiError, api, configureApi, normaliseServerUrl, probeServer } from "./api";
import { secureStorage } from "./storage";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

type Status = "checking" | "signed-out" | "ready" | "unreachable";

interface Session {
  status: Status;
  user: SessionUser | null;
  server: string;
  error: string | null;
  /** Show the (normally hidden) server field on the login screen. */
  serverChangeRequested: boolean;
  /** Sign out and open the login screen with the server field showing. */
  switchServer: () => Promise<void>;
  signIn: (server: string, email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  retry: () => Promise<void>;
  changePassword: (current: string, next: string) => Promise<string | null>;
}

const SERVER_KEY = "inventrack.server";
const TOKEN_KEY = "inventrack.token";

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>("checking");
  const [user, setUser] = useState<SessionUser | null>(null);
  const [server, setServer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [serverChangeRequested, setServerChangeRequested] = useState(false);

  const clearSession = useCallback(async () => {
    configureApi({ token: null });
    await secureStorage.remove(TOKEN_KEY);
    queryClient.clear();
    setUser(null);
    setStatus("signed-out");
  }, [queryClient]);

  // Any 401 (token revoked, user disabled, password changed elsewhere) signs the app out.
  useEffect(() => {
    configureApi({ onUnauthorized: () => void clearSession() });
  }, [clearSession]);

  const restore = useCallback(async () => {
    setStatus("checking");
    const [savedServer, token] = await Promise.all([secureStorage.get(SERVER_KEY), secureStorage.get(TOKEN_KEY)]);
    setServer(savedServer ?? "");
    if (!savedServer || !token) return setStatus("signed-out");
    configureApi({ baseUrl: savedServer, token });
    try {
      const { user } = await api.get<{ user: SessionUser }>("/auth/me");
      setUser(user);
      setError(null);
      setStatus("ready");
    } catch (err) {
      // No signal at launch: keep the saved sign-in and offer a retry instead of signing out.
      if (err instanceof ApiError && err.status === 401) return clearSession();
      setError(err instanceof Error ? err.message : "Can't reach the server.");
      setStatus("unreachable");
    }
  }, [clearSession]);

  useEffect(() => {
    void restore();
  }, [restore]);

  const value = useMemo<Session>(
    () => ({
      status,
      user,
      server,
      error,
      retry: restore,
      signIn: async (serverInput, email, password) => {
        const baseUrl = normaliseServerUrl(serverInput);
        if (!baseUrl) return "Enter your company's server address.";
        if (!(await probeServer(baseUrl))) return `No InvenTrack server found at ${baseUrl}. Check the address and your connection.`;
        configureApi({ baseUrl, token: null });
        try {
          const res = await api.post<{ user: SessionUser; token: string }>("/auth/login", {
            email: email.trim(),
            password,
            client: "app",
          });
          configureApi({ token: res.token });
          await Promise.all([secureStorage.set(SERVER_KEY, baseUrl), secureStorage.set(TOKEN_KEY, res.token)]);
          setServer(baseUrl);
          setUser(res.user);
          setServerChangeRequested(false);
          setStatus("ready");
          return null;
        } catch (err) {
          return err instanceof Error ? err.message : "Sign-in failed.";
        }
      },
      signOut: async () => {
        await api.post("/auth/logout").catch(() => undefined);
        await clearSession();
      },
      serverChangeRequested,
      switchServer: async () => {
        await api.post("/auth/logout").catch(() => undefined);
        await clearSession();
        setServerChangeRequested(true);
      },
      changePassword: async (currentPassword, newPassword) => {
        try {
          // Signs out every other device; this device receives a fresh token.
          const res = await api.post<{ ok: true; token?: string }>("/auth/password", { currentPassword, newPassword });
          if (res.token) {
            configureApi({ token: res.token });
            await secureStorage.set(TOKEN_KEY, res.token);
          }
          return null;
        } catch (err) {
          return err instanceof Error ? err.message : "Couldn't change the password.";
        }
      },
    }),
    [status, user, server, error, serverChangeRequested, restore, clearSession],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export const useSession = () => {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used inside SessionProvider");
  return session;
};

export const useCan = (permission: Permission) => can(useSession().user?.role, permission);
