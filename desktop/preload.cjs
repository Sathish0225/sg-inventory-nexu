// Runs in the sandboxed renderer before the page. Exposes the minimum the web app needs.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("inventrackDesktop", {
  version: process.versions.electron,
  os: process.platform,
  store: {
    get: (key) => ipcRenderer.invoke("store:get", key),
    set: (key, value) => ipcRenderer.invoke("store:set", key, value),
    remove: (key) => ipcRenderer.invoke("store:remove", key),
  },
});
