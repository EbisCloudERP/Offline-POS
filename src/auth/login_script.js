// src/auth/login_script.js
let selectedAccount = null;
let rememberDevice = false;

// ========== BACKEND INTEGRATION POINT ==========
// TODO: Replace with actual backend call to get saved accounts
// For now, using mock data for development
const mockAccounts = [
    {
        id: 1,
        name: "John Doe",
        email: "john@ebiscloud.com",
        avatar: "bi-person-circle",
        hasStoredKey: true,
    },
    {
        id: 2,
        name: "Sarah Store Manager",
        email: "sarah@supermarket.com",
        avatar: "bi-person-badge",
        hasStoredKey: false,
    },
    {
        id: 3,
        name: "Admin User",
        email: "admin@pos.com",
        avatar: "bi-person-square",
        hasStoredKey: true,
    },
];
// =============================================

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

// Initialize
function init() {
    loadAccounts();
    attachEventListeners();

    // Check for remembered device/session
    checkRememberedSession();
}

// Load and display accounts
function loadAccounts() {
    // TODO: Replace with: const accounts = await window.electronAPI.getSavedAccounts();
    const accounts = mockAccounts;

    if (accounts.length === 0) {
        accountsList.innerHTML = `
                <div class="text-center text-secondary py-3">
                    <i class="bi bi-emoji-frown"></i> No accounts found. Please complete onboarding first.
                </div>
            `;
        return;
    }

    accountsList.innerHTML = accounts
        .map(
        (account) => `
            <div class="account-option d-flex align-items-center gap-3" data-account='${JSON.stringify(account)}'>
                <i class="bi ${account.avatar} avatar-icon text-secondary"></i>
                <div class="flex-grow-1">
                    <div class="fw-semibold text-white">${account.name}</div>
                    <div class="small text-secondary">${account.email}</div>
                </div>
                <i class="bi bi-chevron-right text-secondary"></i>
            </div>
        `,
        )
        .join("");

    // Add click handlers to accounts
    document.querySelectorAll(".account-option").forEach((option) => {
        option.addEventListener("click", () => {
        const account = JSON.parse(option.dataset.account);
        selectAccount(account);
        });
    });
}

// Select an account and show password view
function selectAccount(account) {
    selectedAccount = account;

    // Update password view with selected account info
    selectedAvatar.className = `bi ${account.avatar} display-4 text-secondary`;
    selectedName.textContent = account.name;
    selectedEmail.textContent = account.email;

    // Show password view, hide account selection
    accountSelectionView.style.display = "none";
    passwordView.style.display = "block";

    // Clear previous password and error
    passwordInput.value = "";
    hideError();

    // Focus on password input
    passwordInput.focus();

    console.log("Selected account:", account.email);
}

// Sign in handler
async function handleSignIn() {
    const password = passwordInput.value.trim();

    if (!password) {
        showError("Please enter your password");
        return;
    }

    // Disable button and show loading state
    signInBtn.disabled = true;
    const originalBtnText = signInBtn.innerHTML;
    signInBtn.innerHTML =
        '<span class="spinner-border spinner-border-sm me-2"></span> Signing in...';

    try {
        // ========== BACKEND INTEGRATION POINT ==========
        // TODO: Replace with actual login call
        // const result = await window.electronAPI.loginUser({
        //     email: selectedAccount.email,
        //     password: password
        // });

        // Mock login - accept any password length >= 3
        const mockResult =
        password.length >= 3
            ? { success: true, user: selectedAccount }
            : { success: false, error: "Invalid password" };

        await new Promise((resolve) => setTimeout(resolve, 800)); // Simulate network delay

        if (mockResult.success) {
        // Save remember device preference
        if (rememberDeviceCheckbox.checked) {
            localStorage.setItem("rememberedDevice", "true");
            localStorage.setItem("lastUser", selectedAccount.email);
        }

        console.log("Login successful:", mockResult.user);

        // ========== BACKEND INTEGRATION POINT ==========
        // Check if product key has been validated before
        // const hasValidKey = await window.electronAPI.checkProductKeyValidated();

        // Mock check - some accounts have stored key
        const hasValidKey = selectedAccount.hasStoredKey;

        if (!hasValidKey) {
            // Open product key window
            if (window.electronAPI && window.electronAPI.openProductKeyWindow) {
            await window.electronAPI.openProductKeyWindow();
            } else {
            console.log("Product key window would open here");
            alert("Product key window coming soon!");
            }
        } else {
            // Open POS window directly
            if (window.electronAPI && window.electronAPI.openPOSWindow) {
            await window.electronAPI.openPOSWindow();
            } else {
            console.log("POS window would open here");
            alert("POS window coming soon!");
            }
        }
        // =============================================
        } else {
        showError(mockResult.error || "Login failed. Please try again.");
        passwordInput.value = "";
        passwordInput.focus();
        }
    } catch (error) {
        console.error("Login error:", error);
        showError("Network error. Please try again.");
    } finally {
        // Re-enable button
        signInBtn.disabled = false;
        signInBtn.innerHTML = originalBtnText;
    }
}

// Check for remembered device session
function checkRememberedSession() {
    const remembered = localStorage.getItem("rememberedDevice");
    const lastUserEmail = localStorage.getItem("lastUser");

    if (remembered === "true" && lastUserEmail) {
        // TODO: Auto-select last used account
        console.log("Remembered device found for:", lastUserEmail);
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
    // TODO: Navigate to forgot password page
    console.log("Forgot password clicked for:", selectedAccount?.email);
    alert("Forgot password functionality coming soon!");
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
