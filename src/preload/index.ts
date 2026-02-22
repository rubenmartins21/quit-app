import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("quit", {
  auth: {
    requestOtp: (email: string) => ipcRenderer.invoke("auth:request-otp", email),
    verifyOtp: (email: string, code: string) => ipcRenderer.invoke("auth:verify-otp", { email, code }),
    me: () => ipcRenderer.invoke("auth:me"),
    logout: () => ipcRenderer.invoke("auth:logout")
  }
});
