// InvenTrack SG desktop app (Electron main process).
// Serves the bundled web app from app://inventrack and lets it talk to the company server the
// user signs in to. The page has no Node access; the preload exposes only a tiny storage API.
const { app, BrowserWindow, ipcMain, net, protocol, safeStorage, session, shell } = require("electron");
const fs = require("fs");
const path = require("path");

const SCHEME = "app";
const HOST = "inventrack";
const ORIGIN = `${SCHEME}://${HOST}`;
const WEB_ROOT = path.join(__dirname, "web");

protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
]);

// The API server is chosen at sign-in, so connect-src can't list it in advance; everything else
// is pinned to the bundle (plus Google Fonts, which index.html loads).
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https: http://localhost:* http://127.0.0.1:*",
  "frame-src 'self' about:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

/** Serve files from ./web; unknown paths fall back to index.html for client-side routing. */
function serveApp(request) {
  const { pathname } = new URL(request.url);
  const requested = path.normalize(path.join(WEB_ROOT, decodeURIComponent(pathname)));
  const inside = requested.startsWith(WEB_ROOT + path.sep);
  const file = inside && fs.existsSync(requested) && fs.statSync(requested).isFile() ? requested : path.join(WEB_ROOT, "index.html");
  return net.fetch(`file://${file}`).then(
    (res) =>
      new Response(res.body, {
        status: res.status,
        headers: { "content-type": res.headers.get("content-type") ?? "text/html", "content-security-policy": CSP },
      }),
  );
}

// ---- Encrypted key/value store (server address, sign-in token) ------------------------------
const storeFile = () => path.join(app.getPath("userData"), "secure-store.json");
function readStore() {
  try {
    const raw = JSON.parse(fs.readFileSync(storeFile(), "utf8"));
    if (raw.encrypted && safeStorage.isEncryptionAvailable()) {
      return JSON.parse(safeStorage.decryptString(Buffer.from(raw.data, "base64")));
    }
    return raw.encrypted ? {} : raw.data;
  } catch {
    return {};
  }
}
function writeStore(values) {
  const encrypted = safeStorage.isEncryptionAvailable();
  const data = encrypted ? safeStorage.encryptString(JSON.stringify(values)).toString("base64") : values;
  fs.writeFileSync(storeFile(), JSON.stringify({ encrypted, data }), { mode: 0o600 });
}
const fromApp = (event) => event.senderFrame?.url?.startsWith(ORIGIN + "/");
const validKey = (key) => typeof key === "string" && /^[\w.-]{1,64}$/.test(key);

ipcMain.handle("store:get", (event, key) => (fromApp(event) && validKey(key) ? (readStore()[key] ?? null) : null));
ipcMain.handle("store:set", (event, key, value) => {
  if (!fromApp(event) || !validKey(key) || typeof value !== "string" || value.length > 10_000) return;
  writeStore({ ...readStore(), [key]: value });
});
ipcMain.handle("store:remove", (event, key) => {
  if (!fromApp(event) || !validKey(key)) return;
  const values = readStore();
  delete values[key];
  writeStore(values);
});

// ---- Window -----------------------------------------------------------------------------------
function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 420,
    minHeight: 560,
    title: "InvenTrack SG",
    backgroundColor: "#f8fafc",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: true,
    },
  });
  win.once("ready-to-show", () => win.show());

  // Links to other sites (maps, mailto, tel) open outside the app; the app never navigates away.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^(https?|mailto|tel):/i.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(ORIGIN + "/")) {
      event.preventDefault();
      if (/^(https?|mailto|tel):/i.test(url)) void shell.openExternal(url);
    }
  });

  void win.loadURL(`${ORIGIN}/`);
  return win;
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    protocol.handle(SCHEME, serveApp);
    // Only location (optional GPS on check-in) may be granted; camera, mic, etc. are refused.
    session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) =>
      callback(permission === "geolocation" || permission === "clipboard-sanitized-write"),
    );
    createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
