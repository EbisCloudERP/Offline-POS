// src/onboarding/onboarding_script.js
let currentStep = 0;
let onboardingData = {
    language: null,
    email: null,
    registration: {
        fullName: null,
        email: null,
        password: null,
    },
    priceDisplay: null,
    layout: null,
};

// DOM Elements
const stepContents = document.querySelectorAll(".step-content");
const stepDots = document.querySelectorAll(".step-dot");

// Initialize
function init() {
    updateStepDisplay();
    attachEventListeners();
}

// Show current step, hide others
function updateStepDisplay() {
    stepContents.forEach((step, index) => {
        step.style.display = index === currentStep ? "block" : "none";
    });

    stepDots.forEach((dot, index) => {
        dot.classList.remove("active", "completed");
        if (index === currentStep) {
            dot.classList.add("active");
        } else if (index < currentStep) {
            dot.classList.add("completed");
        }
    });

    if (currentStep === 2 && onboardingData.email) {
        const registrationEmail = document.getElementById("registrationEmail");
        if (registrationEmail) {
            registrationEmail.value = onboardingData.email;
            onboardingData.registration.email = onboardingData.email;
        }
    }
}

// Attach all event listeners
function attachEventListeners() {
    // Language selection (Step 0)
    const languageOptions = document.querySelectorAll(".language-option");
    const startBtn = document.querySelector("#step0 .next-btn");

    languageOptions.forEach((option) => {
        option.addEventListener("click", () => {
            languageOptions.forEach((opt) => opt.classList.remove("selected"));
            option.classList.add("selected");
            onboardingData.language = option.dataset.lang;
            if (startBtn) startBtn.disabled = false;
        });
    });

    // Email input (Step 1)
    const emailInput = document.getElementById("emailInput");
    const emailNextBtn = document.getElementById("emailNextBtn");

    if (emailInput) {
        emailInput.addEventListener("input", (e) => {
            const email = e.target.value;
            const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
            emailNextBtn.disabled = !isValidEmail;
            if (isValidEmail) {
                onboardingData.email = email;
            }
        });
    }

    // Registration form (Step 2)
    const fullNameInput = document.getElementById("fullName");
    const passwordInput = document.getElementById("password");
    const confirmPasswordInput = document.getElementById("confirmPassword");
    const registerNextBtn = document.getElementById("registerNextBtn");

    function validateRegistrationForm() {
        const fullName = fullNameInput ? fullNameInput.value.trim() : "";
        const password = passwordInput ? passwordInput.value : "";
        const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : "";

        const isFullNameValid = fullName.length >= 2;
        const isPasswordValid = password.length >= 6;
        const doPasswordsMatch = password === confirmPassword && password.length > 0;

        const isValid = isFullNameValid && isPasswordValid && doPasswordsMatch;
        if (registerNextBtn) registerNextBtn.disabled = !isValid;

        if (isFullNameValid) onboardingData.registration.fullName = fullName;
        if (isPasswordValid && doPasswordsMatch) onboardingData.registration.password = password;
    }

    if (fullNameInput) fullNameInput.addEventListener("input", validateRegistrationForm);
    if (passwordInput) passwordInput.addEventListener("input", validateRegistrationForm);
    if (confirmPasswordInput) confirmPasswordInput.addEventListener("input", validateRegistrationForm);

    // Price Display selection (Step 3)
    const priceOptions = document.querySelectorAll('.price-option');
    const priceNextBtn = document.getElementById('priceNextBtn');

    priceOptions.forEach(option => {
        option.addEventListener('click', () => {
            priceOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            onboardingData.priceDisplay = option.dataset.price;
            if (priceNextBtn) priceNextBtn.disabled = false;
        });
    });

    // Layout selection (Step 4)
    const layoutOptions = document.querySelectorAll('.layout-option');
    const layoutNextBtn = document.getElementById('layoutNextBtn');

    layoutOptions.forEach(option => {
        option.addEventListener('click', () => {
            layoutOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            onboardingData.layout = option.dataset.layout;
            if (layoutNextBtn) layoutNextBtn.disabled = false;
        });
    });

    // Complete button (Step 5)
    const completeBtn = document.getElementById('completeBtn');

    if (completeBtn) {
        completeBtn.addEventListener('click', async () => {
            saveStepData(5);

            try {
                await window.electronAPI.completeOnboarding();
                await window.electronAPI.saveOnboardingPreferences({
                    language: onboardingData.language,
                    priceDisplay: onboardingData.priceDisplay,
                    layout: onboardingData.layout
                });
            } catch (e) {
                console.error('Failed to save onboarding data:', e);
            }

            const nextScreen = await window.electronAPI.getNextScreen();
            if (nextScreen.screen === 'product-key') {
                await window.electronAPI.openProductKeyWindow();
            } else {
                await window.electronAPI.navigateToLogin();
            }
        });
    }

    // Next buttons
    document.querySelectorAll(".next-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            const nextStep = parseInt(btn.dataset.next);
            if (validateStep(currentStep)) {
                saveStepData(currentStep);
                currentStep = nextStep;
                updateStepDisplay();
            }
        });
    });

    // Back buttons
    document.querySelectorAll(".prev-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            const prevStep = parseInt(btn.dataset.prev);
            currentStep = prevStep;
            updateStepDisplay();
        });
    });
}

// Validate current step before proceeding
function validateStep(step) {
    switch (step) {
        case 0:
            if (!onboardingData.language) {
                alert("Please select a language");
                return false;
            }
            return true;
        case 1:
            if (!onboardingData.email) {
                alert("Please enter a valid email address");
                return false;
            }
            return true;
        case 2:
            if (!onboardingData.registration.fullName) {
                alert("Please enter your full name");
                return false;
            }
            if (!onboardingData.registration.password) {
                alert("Please create a password (minimum 6 characters)");
                return false;
            }
            return true;
        case 3:
            if (!onboardingData.priceDisplay) {
                alert('Please select a price display reference');
                return false;
            }
            return true;
        case 4:
            if (!onboardingData.layout) {
                alert('Please select a layout preference');
                return false;
            }
            return true;
        case 5:
            return true;
        default:
            return true;
    }
}

// Save data for current step
function saveStepData(step) {
    // All data is already saved in real-time event listeners
}

// Initialize
init();
