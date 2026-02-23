import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("quit", {
  auth: {
    requestOtp: (email: string) => ipcRenderer.invoke("auth:request-otp", email),
    verifyOtp: (email: string, code: string) => ipcRenderer.invoke("auth:verify-otp", { email, code }),
    me: () => ipcRenderer.invoke("auth:me"),
    logout: () => ipcRenderer.invoke("auth:logout"),
  },
  challenge: {
    create: (durationDays: number, reason: string) =>
      ipcRenderer.invoke("challenge:create", { durationDays, reason }),
    active: () => ipcRenderer.invoke("challenge:active"),
    cancel: (id: string) => ipcRenderer.invoke("challenge:cancel", id),
    quitRequest: {
      create: (id: string, feeling: string) =>
        ipcRenderer.invoke("challenge:quit-request:create", { id, feeling }),
      cancel: (id: string) =>
        ipcRenderer.invoke("challenge:quit-request:cancel", id),
    },
    history: () => ipcRenderer.invoke("challenge:history"),
  },
  blocker: {
    status: () => ipcRenderer.invoke("blocker:status"),
  },
});
