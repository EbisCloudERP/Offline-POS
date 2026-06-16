// src/auth/login_script.js
let selectedAccount = null;
let rememberDevice = false;

// DOM Elements
const accountSelectionView = document.getElementById("accountSelectionView");
const passwordView = document.getElementById("passwordView");
const accountsList = document.getElementById("accountsList");
const selectedAvatar = document.getElementById("selectedAvatar");
const selectedName = document.getElementById("selectedName");
const selectedEmail = document.getElementById("selectedEmail");
const passwordInput = document.getElementById("passwordInput");
const rememberDeviceCheckbox = document.getElementById("rememberDevice");
const signInBtn = document.getElementById("signInBtn");
const backToAccountsBtn = document.getElementById("backToAccountsBtn");
const forgotPasswordLink = document.getElementById("forgotPasswordLink");
const errorMessageDiv = document.getElementById("errorMessage");
const errorText = document.getElementById("errorText");

const accountAvatars = [
    'bi-person-circle',
    'bi-person-badge',
    'bi-person-square',
    'bi-person-check',
    'bi-person-workspace'
];

// Initialize
async function init() {
    await loadAccounts();
    attachEventListeners();
    checkRememberedSession();
}

// Load and display accounts from local DB
async function loadAccounts() {
    try {
        const result = await window.electronAPI.getCachedUsers();
        const accounts = result.users || [];

        if (accounts.length === 0) {
            accountsList.innerHTML = `
                <div class="text-center text-secondary py-3">
                    <i class="bi bi-emoji-frown"></i> No accounts found. Connect to internet for first login.
                </div>
            `;
            return;
        }

        accountsList.innerHTML = accounts.map((account, index) => `
            <div class="account-option d-flex align-items-center gap-3" data-account='${JSON.stringify(account)}'>
                <i class="bi ${accountAvatars[index % accountAvatars.length]} avatar-icon text-secondary"></i>
                <div class="flex-grow-1">
                    <div class="fw-semibold text-white">${account.name}</div>
                    <div class="small text-secondary">${account.email}</div>
                </div>
                <i class="bi bi-chevron-right text-secondary"></i>
            </div>
        `).join("");

        document.querySelectorAll(".account-option").forEach((option) => {
            option.addEventListener("click", () => {
                const account = JSON.parse(option.dataset.account);
                selectAccount(account);
            });
        });

        // Auto-select remembered user
        const lastUserEmail = localStorage.getItem("lastUser");
        if (lastUserEmail) {
            const rememberedAccount = accounts.find(a => a.email === lastUserEmail);
            if (rememberedAccount) {
                selectAccount(rememberedAccount);
            }
        }
    } catch (e) {
        console.error('Failed to load accounts:', e);
        accountsList.innerHTML = `
            <div class="text-center text-secondary py-3">
                <i class="bi bi-emoji-frown"></i> Failed to load accounts.
            </div>
        `;
    }
}

// Select an account and show password view
function selectAccount(account) {
    selectedAccount = account;
    const index = 0; // simplified

    selectedAvatar.className = `bi ${accountAvatars[0]} display-4 text-secondary`;
    selectedName.textContent = account.name;
    selectedEmail.textContent = account.email;

    accountSelectionView.style.display = "none";
    passwordView.style.display = "block";

    passwordInput.value = "";
    hideError();
    passwordInput.focus();
}

// Sign in handler
async function handleSignIn() {
    const password = passwordInput.value.trim();

    if (!password) {
        showError("Please enter your password");
        return;
    }

    signInBtn.disabled = true;
    const originalBtnText = signInBtn.innerHTML;
    signInBtn.innerHTML =
        '<span class="spinner-border spinner-border-sm me-2"></span> Signing in...';

    try {
        const result = await window.electronAPI.loginUser({
            email: selectedAccount.email,
            password: password
        });

        if (result.success) {
            if (rememberDeviceCheckbox.checked) {
                localStorage.setItem("rememberedDevice", "true");
                localStorage.setItem("lastUser", selectedAccount.email);
            }

            // Check if product key exists
            const keyResult = await window.electronAPI.hasValidProductKey();
            if (keyResult.valid) {
                await window.electronAPI.openPOSWindow();
            } else {
                await window.electronAPI.openProductKeyWindow();
            }
        } else {
            showError(result.error || "Login failed. Please try again.");
            passwordInput.value = "";
            passwordInput.focus();
        }
    } catch (error) {
        console.error("Login error:", error);
        showError("Network error. Please try again.");
    } finally {
        signInBtn.disabled = false;
        signInBtn.innerHTML = originalBtnText;
    }
}

// Check for remembered device session
function checkRememberedSession() {
    const remembered = localStorage.getItem("rememberedDevice");
    const lastUserEmail = localStorage.getItem("lastUser");
    if (remembered === "true" && lastUserEmail) {
        rememberDeviceCheckbox.checked = true;
    }
}

// Back to accounts view
function backToAccounts() {
    accountSelectionView.style.display = "block";
    passwordView.style.display = "none";
    selectedAccount = null;
    hideError();
}

// Forgot password handler
function handleForgotPassword() {
    alert("Please contact support@ebiscloud.com to reset your password.");
}

// Show error message
function showError(message) {
    errorText.textContent = message;
    errorMessageDiv.style.display = "block";
    setTimeout(() => {
        hideError();
    }, 5000);
}

// Hide error message
function hideError() {
    errorMessageDiv.style.display = "none";
    errorText.textContent = "";
}

// Enter key submission
function attachEventListeners() {
    signInBtn.addEventListener("click", handleSignIn);
    backToAccountsBtn.addEventListener("click", backToAccounts);
    forgotPasswordLink.addEventListener("click", (e) => {
        e.preventDefault();
        handleForgotPassword();
    });

    passwordInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            handleSignIn();
        }
    });
}

// Initialize
init();
