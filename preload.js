const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld("electronAPI", {
    // Navigation
    navigateToOnboarding: () => ipcRenderer.invoke("navigate-to-onboarding"),
    navigateToLogin: () => ipcRenderer.invoke('navigate-to-login'),
    closeCurrentWindow: () => ipcRenderer.invoke('close-current-window'),

    // Onboarding
    isOnboardingDone: () => ipcRenderer.invoke('is-onboarding-done'),
    getNextScreen: () => ipcRenderer.invoke('get-next-screen'),
    completeOnboarding: () => ipcRenderer.invoke('complete-onboarding'),
    saveOnboardingPreferences: (prefs) => ipcRenderer.invoke('save-onboarding-preferences', prefs),

    // Auth
    getCachedUsers: () => ipcRenderer.invoke('get-cached-users'),
    loginUser: (credentials) => ipcRenderer.invoke('login-user', credentials),
    getCurrentUser: () => ipcRenderer.invoke('get-current-user'),
    clearCurrentUser: () => ipcRenderer.invoke('clear-current-user'),
    openProductKeyWindow: () => ipcRenderer.invoke('open-product-key-window'),
    validateProductKey: (productKey) => ipcRenderer.invoke('validate-product-key', productKey),
    hasValidProductKey: () => ipcRenderer.invoke('has-valid-product-key'),
    activateAndOpenPOS: (productKey) => ipcRenderer.invoke('activate-and-open-pos', productKey),
    openPOSWindow: () => ipcRenderer.invoke('open-pos-window'),

    // Products
    getProducts: (warehouseId) => ipcRenderer.invoke('get-products', warehouseId),
    searchProducts: (query, warehouseId) => ipcRenderer.invoke('search-products', query, warehouseId),
    getProductByCode: (code, warehouseId) => ipcRenderer.invoke('get-product-by-code', code, warehouseId),
    getProductByBarcode: (barcode, warehouseId) => ipcRenderer.invoke('get-product-by-barcode', barcode, warehouseId),
    getProductByName: (query, warehouseId) => ipcRenderer.invoke('get-product-by-name', query, warehouseId),

    // Sales
    createSale: (saleData) => ipcRenderer.invoke('create-sale', saleData),
    getSalesHistory: (limit) => ipcRenderer.invoke('get-sales-history', limit),
    voidSale: (saleId, adminPassword) => ipcRenderer.invoke('void-sale', saleId, adminPassword),
    verifyAdminPassword: (password) => ipcRenderer.invoke('verify-admin-password', password),
    getDaySummary: () => ipcRenderer.invoke('get-day-summary'),
    getCompanyName: () => ipcRenderer.invoke('get-company-name'),

    // Held Sales
    holdSale: (saleData) => ipcRenderer.invoke('hold-sale', saleData),
    getHeldSales: () => ipcRenderer.invoke('get-held-sales'),
    getHeldSaleItems: (heldSaleId) => ipcRenderer.invoke('get-held-sale-items', heldSaleId),
    deleteHeldSale: (heldSaleId) => ipcRenderer.invoke('delete-held-sale', heldSaleId),

    // Tax
    calculateTax: (price, taxMethod) => ipcRenderer.invoke('calculate-tax', price, taxMethod),

    // Sync
    syncNow: () => ipcRenderer.invoke('sync-now'),
    getSyncStatus: () => ipcRenderer.invoke('get-sync-status'),
    getTerminalInfo: () => ipcRenderer.invoke('get-terminal-info'),

    // Sync events from main process
    onSyncStatusChanged: (callback) => {
        ipcRenderer.on('sync-status-changed', (event, status) => callback(status));
    },
    onSyncCompleted: (callback) => {
        ipcRenderer.on('sync-completed', (event, result) => callback(result));
    },
    onForceLogout: (callback) => {
        ipcRenderer.on('force-logout', (event, reason) => callback(reason));
    },

    // Platform
    platform: process.platform,
});
