const { contextBridge, ipcRenderer } = require('electron');

// console.info('Preload Script Loaded')

contextBridge.exposeInMainWorld("electronAPI", {
    
    // Onboarding Manenos
     navigateToOnboarding: () => ipcRenderer.invoke("navigate-to-onboarding"),

    // Auth stuff
     navigateToLogin: () => ipcRenderer.invoke('navigate-to-login'),

    // Product key stuff
     openProductKeyWindow: () => ipcRenderer.invoke('open-product-key-window'),
     activateAndOpenPOS: (productKey) => ipcRenderer.invoke('activate-and-open-pos', productKey),

    // POS
    openPOSWindow: () => ipcRenderer.invoke('open-pos-window'),
    
    // Login
    loginUser: (credentials) => ipcRenderer.invoke('login-user', credentials),

    // Utility
    closeCurrentWindow: () => ipcRenderer.invoke('close-current-window'),

    // Platform thingy (hapana shika!!)
    platform: process.platform,
});