// src/auth/product-key_script.js
const productKeyInput = document.getElementById("productKeyInput");
const activateBtn = document.getElementById("activateBtn");
const cancelBtn = document.getElementById("cancelBtn");
const errorMessageDiv = document.getElementById("errorMessage");
const errorText = document.getElementById("errorText");

// Format: XXXXX-XXXXX-XXXXX-XXXXX
function validateKeyFormat(key) {
    const keyPattern = /^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/;
    return keyPattern.test(key);
}

// Auto-format as user types
productKeyInput.addEventListener("input", (e) => {
    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");

    // Add dashes after every 5 characters
    let formatted = "";
    for (let i = 0; i < value.length; i++) {
        if (i > 0 && i % 5 === 0 && i < 20) {
        formatted += "-";
        }
        formatted += value[i];
    }

    e.target.value = formatted;

    // Enable/disable activate button based on format
    activateBtn.disabled = !validateKeyFormat(formatted);
});

// Activate button handler
activateBtn.addEventListener("click", async () => {
    const productKey = productKeyInput.value.trim();

    if (!validateKeyFormat(productKey)) {
        showError("Invalid product key format. Please use XXXXX-XXXXX-XXXXX-XXXXX");
        return;
    }

    // Disable button and show loading
    activateBtn.disabled = true;
    const originalText = activateBtn.innerHTML;
    activateBtn.innerHTML =
        '<span class="spinner-border spinner-border-sm me-2"></span> Validating...';

    try {
        // ========== BACKEND INTEGRATION POINT ==========
        // TODO: Replace with actual validation call
        // const result = await window.electronAPI.validateProductKey(productKey);

        // Mock validation - accept any key that matches format
        const mockResult = {
        success: true,
        message: "Product key validated successfully",
        };

        await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate network delay

        if (mockResult.success) {
        console.log("Product key validated:", productKey);

        // ========== BACKEND INTEGRATION POINT ==========
        // TODO: Save validated key to backend
        // await window.electronAPI.saveProductKeyValidation(productKey);
        // =============================================

        // Close product key window and open POS
        if (window.electronAPI && window.electronAPI.activateAndOpenPOS) {
            await window.electronAPI.activateAndOpenPOS(productKey);
        } else {
            console.log("Would open POS now");
            alert("Product key activated! POS would open now.");
            // Fallback: close window
            if (window.electronAPI && window.electronAPI.closeCurrentWindow) {
            await window.electronAPI.closeCurrentWindow();
            }
        }
        } else {
        showError(
            mockResult.message ||
            "Invalid product key. Please check and try again.",
        );
        activateBtn.disabled = false;
        activateBtn.innerHTML = originalText;
        }
    } catch (error) {
        console.error("Validation error:", error);
        showError("Network error. Please try again.");
        activateBtn.disabled = false;
        activateBtn.innerHTML = originalText;
    }
});

// Cancel button - close window and go back to login
cancelBtn.addEventListener("click", async () => {
    if (window.electronAPI && window.electronAPI.closeCurrentWindow) {
        await window.electronAPI.closeCurrentWindow();
    }
});

// Enter key submission
productKeyInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !activateBtn.disabled) {
        activateBtn.click();
    }
});

// Show error message
function showError(message) {
    errorText.textContent = message;
    errorMessageDiv.style.display = "block";
    setTimeout(() => {
        errorMessageDiv.style.display = "none";
        errorText.textContent = "";
    }, 5000);
}
