const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

process.env.NODE_ENV = "production";

const isMac = process.platform === 'darwin';
const isDev = process.env.NODE_ENV !== 'production';

let splashWindow = null;
let onboardingWindow = null;
let authWindow = null;
let productKeyWindow = null;
let posWindow = null;

// Splash screen window
function createSplashWindow() {
    splashWindow = new BrowserWindow({
        width: isDev ? 1000 : 430,
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

    if (isDev) {
        splashWindow.webContents.openDevTools();
    }

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
        show: false,  // Show after ready to prevent flicker
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    if (isDev) {
        onboardingWindow.webContents.openDevTools();
    }

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

// Auth window na Pages
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

    if (isDev) {
        authWindow.webContents.openDevTools();
    }

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
        parent: authWindow, // Make it modal to login window
        modal: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    productKeyWindow.loadFile('src/auth/product_key.html');
    productKeyWindow.setMenu(null);

    if (isDev) {
        productKeyWindow.webContents.openDevTools();
    }

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

    if (isDev) {
        posWindow.webContents.openDevTools();  
    }

    posWindow.once('ready-to-show', () => {
        posWindow.show();
        posWindow.maximize();
        
        // Close auth window if it exists
        if (authWindow) {
            authWindow.close();
        }
        // Close product key window if it exists
        if (productKeyWindow) {
            productKeyWindow.close();
        }
    });

    posWindow.on('closed', () => {
        posWindow = null;
    });
}

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

// Add product key window
ipcMain.handle("open-product-key-window", () => {
    createProductKeyWindow();
    return { success: true };
});

// Add POS window creator
ipcMain.handle("open-pos-window", () => {
    createPOSWindow();
    return { success: true };
});

ipcMain.handle("activate-and-open-pos", async (event, productKey) => {
    // TODO: Backend team - Save product key validation
    console.log("Activating with key:", productKey);

    // Close product key window
    if (productKeyWindow) {
        productKeyWindow.close();
    }

    // Open POS window
    createPOSWindow();

    return { success: true };
});

ipcMain.handle("close-current-window", (event) => {
    const currentWindow = BrowserWindow.getFocusedWindow();
    if (currentWindow) {
        currentWindow.close();
    }
    return { success: true };
});

app.whenReady().then(() => {
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