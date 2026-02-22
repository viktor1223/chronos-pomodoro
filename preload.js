const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    enterWorkMode: () => ipcRenderer.send('enter-work-mode'),
    enterRestMode: () => ipcRenderer.send('enter-rest-mode'),
    workComplete: () => ipcRenderer.send('work-complete'),
    restComplete: () => ipcRenderer.send('rest-complete'),
    minimizeWindow: () => ipcRenderer.send('minimize-window'),
    closeWindow: () => ipcRenderer.send('close-window'),
    returnToSetup: () => ipcRenderer.send('return-to-setup'),
    selectLogDir: () => ipcRenderer.invoke('select-log-dir'),
    saveReflection: (data) => ipcRenderer.invoke('save-reflection', data),
});
