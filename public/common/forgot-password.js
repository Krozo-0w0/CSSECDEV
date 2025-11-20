document.addEventListener('DOMContentLoaded', function() {
    // Password strength checker
    function checkPasswordStrength(password) {
        const requirements = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[@$!%*?&]/.test(password)
        };

        // Update requirement indicators
        Object.keys(requirements).forEach(req => {
            const element = document.getElementById(`req${req.charAt(0).toUpperCase() + req.slice(1)}`);
            if (element) {
                element.classList.toggle('valid', requirements[req]);
                element.classList.toggle('invalid', !requirements[req]);
            }
        });

        // Calculate strength
        const metCount = Object.values(requirements).filter(Boolean).length;
        let strength = 'weak';
        let strengthText = 'Weak';

        if (metCount >= 4) {
            strength = 'strong';
            strengthText = 'Strong';
        } else if (metCount >= 3) {
            strength = 'medium';
            strengthText = 'Medium';
        }

        const strengthElement = document.getElementById('passwordStrength');
        if (strengthElement) {
            strengthElement.textContent = `Password strength: ${strengthText}`;
            strengthElement.className = `password-strength ${strength}`;
        }

        return metCount >= 3; // At least 3 requirements met
    }

    // Password match checker
    function checkPasswordMatch() {
        const password = document.getElementById('newPassword')?.value;
        const confirm = document.getElementById('confirmPassword')?.value;
        const matchElement = document.getElementById('passwordMatch');

        if (!matchElement) return true;

        if (confirm.length === 0) {
            matchElement.textContent = '';
            return false;
        }

        if (password === confirm) {
            matchElement.textContent = 'Passwords match';
            matchElement.className = 'password-match valid';
            return true;
        } else {
            matchElement.textContent = 'Passwords do not match';
            matchElement.className = 'password-match invalid';
            return false;
        }
    }

    // Form validation for reset password
    function validateResetForm() {
        const password = document.getElementById('newPassword')?.value;
        const confirm = document.getElementById('confirmPassword')?.value;

        if (!password || !confirm) {
            alert('Please fill in all password fields.');
            return false;
        }

        if (!checkPasswordStrength(password)) {
            alert('Please ensure your password meets the strength requirements.');
            return false;
        }

        if (!checkPasswordMatch()) {
            alert('Passwords do not match.');
            return false;
        }

        return true;
    }

    // Setup event listeners for reset password form
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');

    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', function() {
            checkPasswordStrength(this.value);
            checkPasswordMatch();
        });
    }

    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', checkPasswordMatch);
    }

    // Form submission handlers
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', function(e) {
            if (!validateResetForm()) {
                e.preventDefault();
            }
        });
    }

    // Security questions form - prevent brute force
    const securityQuestionsForm = document.getElementById('securityQuestionsForm');
    if (securityQuestionsForm) {
        let attempts = 0;
        const maxAttempts = 3;
        
        securityQuestionsForm.addEventListener('submit', function(e) {
            attempts++;
            const remaining = maxAttempts - attempts;
            
            if (remaining >= 0) {
                document.getElementById('attemptsRemaining').textContent = remaining;
            }
            
            if (attempts >= maxAttempts) {
                e.preventDefault();
                alert('Too many failed attempts. Please try again after 15 minutes.');
                return;
            }
            
            // Disable button after submission to prevent rapid resubmission
            const submitBtn = document.getElementById('verifyBtn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.value = 'Verifying...';
            }
        });
    }

    // Email validation for forgot password
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', function(e) {
            const email = document.getElementById('email').value;
            if (!email.endsWith('@dlsu.edu.ph')) {
                e.preventDefault();
                alert('Please enter a valid DLSU email address.');
                return;
            }
        });
    }
});