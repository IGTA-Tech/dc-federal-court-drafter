/**
 * DC Federal Court Document Drafter - Main JavaScript
 * Powered by DC Federal Litigation - www.dcfederallitigation.com
 */

// User registration tracking
const USER_STORAGE_KEY = 'dcfedlit_user';

// Check if user is registered
function isUserRegistered() {
    const user = localStorage.getItem(USER_STORAGE_KEY);
    return user !== null;
}

// Get stored user info
function getStoredUser() {
    const user = localStorage.getItem(USER_STORAGE_KEY);
    return user ? JSON.parse(user) : null;
}

// Save user info locally
function saveUserLocally(userData) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
}

// Handle registration form submission
async function submitRegistration(event) {
    event.preventDefault();

    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const organization = document.getElementById('regOrganization').value.trim();
    const phone = document.getElementById('regPhone').value.trim();

    if (!name || !email) {
        alert('Please enter your name and email.');
        return;
    }

    if (!validateEmail(email)) {
        alert('Please enter a valid email address.');
        return;
    }

    const userData = {
        name: name,
        email: email,
        organization: organization || '',
        phone: phone || '',
        registered_at: new Date().toISOString()
    };

    try {
        // Send to server for tracking
        const response = await fetch('/api/register-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        if (response.ok) {
            // Save locally
            saveUserLocally(userData);

            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('registrationModal'));
            modal.hide();

            // Update welcome message
            const welcomeEl = document.getElementById('welcomeUser');
            if (welcomeEl) {
                welcomeEl.textContent = name;
                welcomeEl.parentElement.style.display = 'block';
            }

            showToast('Welcome, ' + name + '! You can now use the document generator.', 'success');
        } else {
            const error = await response.json();
            alert('Registration error: ' + (error.error || 'Please try again.'));
        }
    } catch (error) {
        console.error('Registration error:', error);
        // Still save locally even if server fails
        saveUserLocally(userData);
        const modal = bootstrap.Modal.getInstance(document.getElementById('registrationModal'));
        if (modal) modal.hide();
        showToast('Welcome! You can now use the document generator.', 'success');
    }
}

// Initialize Bootstrap tooltips and check registration
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Check registration status
    const registrationModal = document.getElementById('registrationModal');
    if (registrationModal) {
        if (!isUserRegistered()) {
            const modal = new bootstrap.Modal(registrationModal, {
                backdrop: 'static',
                keyboard: false
            });
            modal.show();
        } else {
            // Update welcome message if exists
            const user = getStoredUser();
            const welcomeEl = document.getElementById('welcomeUser');
            if (welcomeEl && user) {
                welcomeEl.textContent = user.name;
                welcomeEl.parentElement.style.display = 'block';
            }
        }
    }

    // Parse URL parameters if on generator page
    if (window.location.pathname.includes('generator')) {
        parseUrlParams();
    }
});

/**
 * Parse URL parameters and populate form fields
 * Used when exporting from research to generator
 */
function parseUrlParams() {
    const params = new URLSearchParams(window.location.search);

    if (params.has('case_number')) {
        const caseNumberField = document.getElementById('caseNumber');
        if (caseNumberField) {
            caseNumberField.value = params.get('case_number');
        }
    }

    if (params.has('plaintiff')) {
        const plaintiffField = document.getElementById('plaintiff');
        if (plaintiffField) {
            plaintiffField.value = params.get('plaintiff');
        }
    }

    if (params.has('defendant')) {
        const defendantField = document.getElementById('defendant');
        if (defendantField) {
            defendantField.value = params.get('defendant');
        }
    }

    if (params.has('judge_name')) {
        // Try to find matching judge in dropdown
        const judgeSelect = document.getElementById('judgeSelect');
        if (judgeSelect) {
            const judgeName = params.get('judge_name').toLowerCase();
            for (let option of judgeSelect.options) {
                if (option.dataset.name && option.dataset.name.toLowerCase().includes(judgeName)) {
                    judgeSelect.value = option.value;
                    break;
                }
            }
        }
    }

    // Clear URL params after parsing
    if (params.toString()) {
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

/**
 * Format a date string for display
 */
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Format a phone number
 */
function formatPhone(phone) {
    if (!phone) return '';
    // Remove non-digits
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
        return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
    }
    return phone;
}

/**
 * Validate case number format
 */
function validateCaseNumber(caseNumber) {
    const pattern = /^1:\d{2}-cv-\d{5}-[A-Z]{2,4}$/;
    return pattern.test(caseNumber);
}

/**
 * Validate email format
 */
function validateEmail(email) {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
}

/**
 * Show a toast notification
 */
function showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(container);
    }

    const toastId = 'toast-' + Date.now();
    const bgClass = type === 'error' ? 'bg-danger' :
                    type === 'success' ? 'bg-success' :
                    type === 'warning' ? 'bg-warning' : 'bg-info';

    const html = `
        <div id="${toastId}" class="toast" role="alert">
            <div class="toast-header ${bgClass} text-white">
                <strong class="me-auto">DC Court Drafter</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', html);

    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: 5000 });
    toast.show();

    // Remove toast element after it hides
    toastElement.addEventListener('hidden.bs.toast', function() {
        toastElement.remove();
    });
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard', 'success');
    } catch (err) {
        console.error('Failed to copy:', err);
        showToast('Failed to copy to clipboard', 'error');
    }
}

/**
 * Debounce function for input handlers
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Keyboard shortcuts
 */
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + S to save draft
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (typeof saveDraft === 'function') {
            saveDraft();
        }
    }

    // Ctrl/Cmd + G to generate DOCX
    if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        if (typeof generateDocument === 'function') {
            generateDocument('docx');
        }
    }

    // Escape to close modals
    if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal.show');
        modals.forEach(modal => {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) bsModal.hide();
        });
    }
});

// Expose utility functions globally
window.DCCourtDrafter = {
    formatDate,
    formatPhone,
    validateCaseNumber,
    validateEmail,
    showToast,
    copyToClipboard,
    debounce,
    formatFileSize,
    escapeHtml
};
