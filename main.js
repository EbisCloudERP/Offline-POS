const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const crypto = require('crypto');
const LocalDB = require('./database/database');
const SyncEngine = require('./sync/sync-engine');

process.env.NODE_ENV = "production";

const isDev = process.env.DEV_MODE === '1' || require('fs').existsSync(path.join(__dirname, '.devmode'));

const isMac = process.platform === 'darwin';

let splashWindow = null;
let onboardingWindow = null;
let authWindow = null;
let productKeyWindow = null;
let posWindow = null;

let db = null;
let syncEngine = null;
let currentUser = null;

function getOrCreateTerminalId() {
    let info = db.getTerminalInfo();
    if (!info || !info.terminal_id) {
        const terminalId = crypto.randomUUID();
        db.saveTerminalInfo({ terminal_id: terminalId });
        info = db.getTerminalInfo();
    }
    return info.terminal_id;
}

// Splash screen window
function createSplashWindow() {
    splashWindow = new BrowserWindow({
        width: 430,
        height: 450,
        frame: false,
        transparent: false,
        center: true,
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    splashWindow.loadFile('src/splash/index.html');

    splashWindow.on('closed', () => {
        splashWindow = null;
    });
}

// Onboarding window
function createOnboardingWindow() {
    onboardingWindow = new BrowserWindow({
        width: 800,
        height: 750,
        center: true,
        menu: false,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    onboardingWindow.loadFile('src/onboarding/index.html');
    onboardingWindow.setMenu(null);

    onboardingWindow.once('ready-to-show', () => {
        onboardingWindow.show();
        if (splashWindow) {
            splashWindow.close();
        }
    });

    onboardingWindow.on('close', () => {
        onboardingWindow = null;
    });
}

// Auth window
function createAuthWindow() {
    authWindow = new BrowserWindow({
        width: 700,
        height: 770,
        center: true,
        show: false,
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    authWindow.loadFile("src/auth/login.html");
    authWindow.setMenu(null);

    authWindow.once("ready-to-show", () => {
        authWindow.show();
        if (splashWindow) {
            splashWindow.close();
        }
    });

    authWindow.on("closed", () => {
        authWindow = null;
    });
}

// Create Product Key Window
function createProductKeyWindow() {
    productKeyWindow = new BrowserWindow({
        width: 650,
        height: 650,
        center: true,
        show: false,
        resizable: false,
        parent: authWindow,
        modal: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    productKeyWindow.loadFile('src/auth/product_key.html');
    productKeyWindow.setMenu(null);

    productKeyWindow.once('ready-to-show', () => {
        productKeyWindow.show();
    });

    productKeyWindow.on('closed', () => {
        productKeyWindow = null;
    });
}

// Create POS Window
function createPOSWindow() {
    posWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1280,
        minHeight: 800,
        center: true,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    posWindow.loadFile('src/pos/index.html');
    posWindow.setMenu(null);

    posWindow.once('ready-to-show', () => {
        posWindow.show();
        posWindow.maximize();

        if (authWindow) {
            authWindow.close();
        }
        if (productKeyWindow) {
            productKeyWindow.close();
        }
    });

    posWindow.on('closed', () => {
        posWindow = null;
    });
}

// ========================
// IPC HANDLERS
// ========================

// Navigation
ipcMain.handle('navigate-to-onboarding', () => {
    createOnboardingWindow();
    return { success: true };
});

ipcMain.handle("navigate-to-login", () => {
    if (onboardingWindow) {
        onboardingWindow.close();
        onboardingWindow = null;
    }
    createAuthWindow();
    return { success: true };
});

ipcMain.handle("open-product-key-window", () => {
    createProductKeyWindow();
    return { success: true };
});

ipcMain.handle("open-pos-window", () => {
    createPOSWindow();
    return { success: true };
});

ipcMain.handle("close-current-window", () => {
    const currentWindow = BrowserWindow.getFocusedWindow();
    if (currentWindow) {
        currentWindow.close();
    }
    return { success: true };
});

// Check if onboarding is done
ipcMain.handle("is-onboarding-done", () => {
    return { done: db.isOnboardingDone() };
});

// Get next screen (splash routing)
ipcMain.handle("get-next-screen", () => {
    if (!db.isOnboardingDone()) {
        return { screen: 'onboarding' };
    }
    const terminalId = getOrCreateTerminalId();
    if (isDev || db.hasValidProductKey(terminalId)) {
        return { screen: 'login' };
    }
    return { screen: 'product-key' };
});

// Onboarding
ipcMain.handle("complete-onboarding", () => {
    db.setOnboardingDone();
    return { success: true };
});

// Save onboarding preferences
ipcMain.handle("save-onboarding-preferences", (event, prefs) => {
    if (prefs.language) db.setPreference('language', prefs.language);
    if (prefs.priceDisplay) db.setPreference('price_display', prefs.priceDisplay);
    if (prefs.layout) db.setPreference('layout', prefs.layout);
    return { success: true };
});

// ========================
// AUTH
// ========================

// Get cached users
ipcMain.handle("get-cached-users", () => {
    const users = db.getCachedUsers();
    return { success: true, users: users };
});

// Login
ipcMain.handle("login-user", async (event, credentials) => {
    const { email, password } = credentials;

    // Try cloud first if online
    if (syncEngine && syncEngine.isOnline) {
        try {
            const result = await syncEngine.authenticateWithCloud(email, password);
            if (result.success) {
                currentUser = result.user;
                return { success: true, user: result.user };
            }
        } catch (e) {
            // Cloud unreachable, fall through to local
        }
    }

    // Local cached authentication
    const user = db.getUserByEmail(email);
    if (!user) {
        return { success: false, error: 'No cached account found. Connect to internet for first login.' };
    }

    const valid = db.validatePassword(user.id, password);
    if (valid) {
        currentUser = {
            id: user.id,
            name: user.name,
            email: user.email,
            role_id: user.role_id,
            warehouse_id: user.warehouse_id,
            branch_id: user.branch_id,
            biller_id: user.biller_id,
            company_name: user.company_name
        };
        return { success: true, user: currentUser };
    }
    return { success: false, error: 'Invalid password' };
});

// Get current logged-in user
ipcMain.handle("get-current-user", () => {
    return currentUser;
});

// Clear current user on sign out
ipcMain.handle("clear-current-user", () => {
    currentUser = null;
    return { success: true };
});

// Validate product key
ipcMain.handle("validate-product-key", async (event, productKey) => {
    if (isDev) {
        const terminalId = getOrCreateTerminalId();
        db.saveProductKey(productKey, terminalId);
        db.setPreference('company_name', 'Ebiscloud POS (Dev)');
        return { success: true, company_name: 'Ebiscloud POS (Dev)' };
    }

    const terminalId = getOrCreateTerminalId();

    if (syncEngine && syncEngine.isOnline) {
        try {
            const result = await syncEngine.validateProductKeyOnCloud(productKey, terminalId);
            return result;
        } catch (e) {
            return { success: false, error: 'Activation failed: ' + e.message };
        }
    }

    return { success: false, error: 'Internet connection required for product activation' };
});

// Check if product key exists
ipcMain.handle("has-valid-product-key", () => {
    if (isDev) return { valid: true };
    const terminalId = getOrCreateTerminalId();
    const hasKey = db.hasValidProductKey(terminalId);
    return { valid: hasKey };
});

// ========================
// PRODUCTS
// ========================
ipcMain.handle("get-products", (event, warehouseId) => {
    const products = db.getProductsForWarehouse(warehouseId);
    return { success: true, products };
});

ipcMain.handle("search-products", (event, query, warehouseId) => {
    const products = db.searchProducts(query, warehouseId);
    return { success: true, products };
});

ipcMain.handle("get-product-by-code", (event, code, warehouseId) => {
    const product = db.getProductByCode(code, warehouseId);
    return { success: true, product };
});

ipcMain.handle("get-product-by-barcode", (event, barcode, warehouseId) => {
    const product = db.getProductByBarcode(barcode, warehouseId);
    return { success: true, product };
});

ipcMain.handle("get-product-by-name", (event, query, warehouseId) => {
    const product = db.getProductByName(query, warehouseId);
    return { success: true, product };
});

// ========================
// SALES
// ========================
ipcMain.handle("create-sale", (event, saleData) => {
    try {
        db.createSale(saleData);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle("get-sales-history", (event, limit) => {
    const sales = db.getSalesHistory(limit || 50);
    return { success: true, sales };
});

ipcMain.handle("void-sale", (event, saleId, adminPassword) => {
    if (!db.validateAdminPassword(adminPassword)) {
        return { success: false, error: 'Invalid admin password' };
    }
    const ok = db.voidSale(saleId);
    return { success: ok, error: ok ? null : 'Sale not found' };
});

ipcMain.handle("verify-admin-password", (event, password) => {
    const valid = db.validateAdminPassword(password);
    return { success: valid };
});

ipcMain.handle("get-day-summary", () => {
    const summary = db.getDaySummary();
    return { success: true, summary };
});

ipcMain.handle("get-company-name", () => {
    return { name: db.getPreference('company_name') || '' };
});

// ========================
// HELD SALES
// ========================
ipcMain.handle("hold-sale", (event, saleData) => {
    try {
        db.holdSale(saleData);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle("get-held-sales", () => {
    const heldSales = db.getHeldSales();
    return { success: true, heldSales };
});

ipcMain.handle("get-held-sale-items", (event, heldSaleId) => {
    const items = db.getHeldSaleItems(heldSaleId);
    return { success: true, items };
});

ipcMain.handle("delete-held-sale", (event, heldSaleId) => {
    db.deleteHeldSale(heldSaleId);
    return { success: true };
});

// ========================
// TAX CALCULATION
// ========================
ipcMain.handle("calculate-tax", (event, price, taxMethod) => {
    const result = db.calculateTax(price, taxMethod);
    return { success: true, ...result };
});

// ========================
// SYNC
// ========================
ipcMain.handle("sync-now", async () => {
    if (!syncEngine) return { success: false, error: 'Sync engine not initialized' };
    const result = await syncEngine.fullSync();
    return result;
});

ipcMain.handle("get-sync-status", () => {
    return {
        online: syncEngine ? syncEngine.isOnline : false,
        syncing: syncEngine ? syncEngine.isSyncing : false,
        terminal_id: getOrCreateTerminalId()
    };
});

ipcMain.handle("get-terminal-info", () => {
    return db.getTerminalInfo() || {};
});

// ========================
// APP STARTUP
// ========================
app.whenReady().then(() => {
    db = new LocalDB();
    db.seedDevData();
    getOrCreateTerminalId();

    syncEngine = new SyncEngine(db, {
        baseUrl: process.env.API_BASE_URL || 'http://localhost/api',
        apiKey: process.env.API_KEY || ''
    });

    syncEngine.onStatusChange = (status) => {
        if (posWindow && !posWindow.isDestroyed()) {
            posWindow.webContents.send('sync-status-changed', status);
        }
    };

    syncEngine.onSyncComplete = (result) => {
        if (posWindow && !posWindow.isDestroyed()) {
            posWindow.webContents.send('sync-completed', result);
        }
    };

    syncEngine.onForceLogout = (reason) => {
        if (posWindow && !posWindow.isDestroyed()) {
            posWindow.webContents.send('force-logout', reason);
        }
        currentUser = null;
        if (posWindow && !posWindow.isDestroyed()) {
            posWindow.close();
        }
        if (productKeyWindow && !productKeyWindow.isDestroyed()) {
            productKeyWindow.close();
        }
        createAuthWindow();
    };

    syncEngine.start();
    createSplashWindow();
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createSplashWindow();
    }
});

app.on('window-all-closed', () => {
    if (!isMac) {
        app.quit();
    }
});

app.on('before-quit', () => {
    if (syncEngine) {
        syncEngine.stop();
    }
    if (db) {
        db.close();
    }
});
