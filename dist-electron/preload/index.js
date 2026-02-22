"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("quit", {
  auth: {
    requestOtp: (email) => electron.ipcRenderer.invoke("auth:request-otp", email),
    verifyOtp: (email, code) => electron.ipcRenderer.invoke("auth:verify-otp", { email, code }),
    me: () => electron.ipcRenderer.invoke("auth:me"),
    logout: () => electron.ipcRenderer.invoke("auth:logout")
  }
});
//# sourceMappingURL=index.js.map
