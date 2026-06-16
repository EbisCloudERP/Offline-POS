// src/splash/splash_script.js
let progress = 0;
const progressFill = document.getElementById("progressFill");
const loadingMessage = document.getElementById("loadingMessage");

function updateMessage(text, icon = "bi-arrow-repeat") {
    loadingMessage.innerHTML = `<i class="${icon} me-1"></i>${text}`;
}

const interval = setInterval(async () => {
    progress += 10;
    progressFill.style.width = progress + "%";
    progressFill.setAttribute("aria-valuenow", progress);

    if (progress === 30) {
        updateMessage("Loading settings...", "bi-gear");
    }
    if (progress === 60) {
        updateMessage("Preparing workspace...", "bi-pc-display");
    }
    if (progress === 90) {
        updateMessage("Almost ready...", "bi-hourglass-split");
    }
    if (progress >= 100) {
        clearInterval(interval);
        updateMessage("Starting application...", "bi-box-arrow-in-right");
        setTimeout(async () => {
            try {
                const result = await window.electronAPI.getNextScreen();
                if (result.screen === 'onboarding') {
                    window.electronAPI.navigateToOnboarding();
                } else if (result.screen === 'product-key') {
                    window.electronAPI.openProductKeyWindow();
                } else {
                    window.electronAPI.navigateToLogin();
                }
            } catch (e) {
                window.electronAPI.navigateToOnboarding();
            }
        }, 500);
    }
}, 200);
