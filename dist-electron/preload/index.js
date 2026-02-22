"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("quit", {
  auth: {
    requestOtp: (email) => electron.ipcRenderer.invoke("auth:request-otp", email),
    verifyOtp: (email, code) => electron.ipcRenderer.invoke("auth:verify-otp", { email, code }),
    me: () => electron.ipcRenderer.invoke("auth:me"),
    logout: () => electron.ipcRenderer.invoke("auth:logout")
  },
  challenge: {
    create: (durationDays, reason) => electron.ipcRenderer.invoke("challenge:create", { durationDays, reason }),
    active: () => electron.ipcRenderer.invoke("challenge:active"),
    cancel: (id) => electron.ipcRenderer.invoke("challenge:cancel", id),
    history: () => electron.ipcRenderer.invoke("challenge:history")
  }
});
//# sourceMappingURL=index.js.map
