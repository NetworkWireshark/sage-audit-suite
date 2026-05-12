const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("sageAuditDesktop", {
  platform: process.platform,
});
