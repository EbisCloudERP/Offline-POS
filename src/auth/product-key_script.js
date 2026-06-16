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

    let formatted = "";
    for (let i = 0; i < value.length; i++) {
        if (i > 0 && i % 5 === 0 && i < 20) {
            formatted += "-";
        }
        formatted += value[i];
    }

    e.target.value = formatted;
    activateBtn.disabled = !validateKeyFormat(formatted);
});

// Activate button handler
activateBtn.addEventListener("click", async () => {
    const productKey = productKeyInput.value.trim();

    if (!validateKeyFormat(productKey)) {
        showError("Invalid product key format. Please use XXXXX-XXXXX-XXXXX-XXXXX");
        return;
    }

    activateBtn.disabled = true;
    const originalText = activateBtn.innerHTML;
    activateBtn.innerHTML =
        '<span class="spinner-border spinner-border-sm me-2"></span> Validating...';

    try {
        const result = await window.electronAPI.validateProductKey(productKey);

        if (result.success) {
            if (result.company_name) {
                const successDiv = document.getElementById('successMessage');
                const successText = document.getElementById('successText');
                if (successDiv && successText) {
                    successText.innerHTML = `<strong>Activated!</strong><br>${result.company_name}`;
                    successDiv.style.display = 'block';
                    document.querySelector('.product-key-card .info-box').style.display = 'none';
                    productKeyInput.style.display = 'none';
                    activateBtn.style.display = 'none';
                    cancelBtn.style.display = 'none';
                    setTimeout(() => {
                        window.electronAPI.navigateToLogin();
                    }, 2000);
                    return;
                }
            }
            await window.electronAPI.navigateToLogin();
        } else {
            showError(result.error || "Invalid product key. Please check and try again.");
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
