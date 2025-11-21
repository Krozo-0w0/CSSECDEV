// change-password.js
document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('changePasswordFinalForm');
  const newPassword = document.getElementById('newPassword');
  const confirmPassword = document.getElementById('confirmPassword');
  const strengthIndicator = document.getElementById('passwordStrength');
  const matchIndicator = document.getElementById('passwordMatch');

  // Obscure password entry
  [newPassword, confirmPassword].forEach(input => {
    input.addEventListener('input', function() {
      this.type = 'password';
    });
  });

  // Real-time password strength checking
  newPassword.addEventListener('input', function() {
    checkPasswordStrength(this.value);
    checkPasswordMatch();
  });

  confirmPassword.addEventListener('input', checkPasswordMatch);

  function checkPasswordStrength(password) {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[@$!%*?&]/.test(password)
    };

    // Update requirement indicators
    Object.keys(requirements).forEach(req => {
      const element = document.getElementById(`req${req.charAt(0).toUpperCase() + req.slice(1)}`);
      if (element) {
        element.style.color = requirements[req] ? 'green' : 'red';
      }
    });

    // Overall strength
    const metCount = Object.values(requirements).filter(Boolean).length;
    if (metCount === 5) {
      strengthIndicator.textContent = 'Strong password';
      strengthIndicator.style.color = 'green';
    } else if (metCount >= 3) {
      strengthIndicator.textContent = 'Medium strength';
      strengthIndicator.style.color = 'orange';
    } else {
      strengthIndicator.textContent = 'Weak password';
      strengthIndicator.style.color = 'red';
    }
  }

  function checkPasswordMatch() {
    if (confirmPassword.value === '') {
      matchIndicator.textContent = '';
      return;
    }

    if (newPassword.value === confirmPassword.value) {
      matchIndicator.textContent = 'Passwords match';
      matchIndicator.style.color = 'green';
    } else {
      matchIndicator.textContent = 'Passwords do not match';
      matchIndicator.style.color = 'red';
    }
  }

  // Form submission validation
  form.addEventListener('submit', function(e) {
    if (newPassword.value !== confirmPassword.value) {
      e.preventDefault();
      alert('Passwords do not match!');
      return;
    }

    // Final strength check
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword.value)) {
      e.preventDefault();
      alert('Password does not meet all requirements!');
      return;
    }
  });
});