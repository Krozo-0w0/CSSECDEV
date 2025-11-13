document.addEventListener('DOMContentLoaded', function() {
    const allQuestions = [
        "What was the name of your favorite childhood pet?",
        "In what city or town did your parents meet?",
        "What is your favorite sport?",
        "What was the first concert you attended?",
        "What breed of dog do you like the most?",
        "In which area of the city is your place of work located?",
        "What is your oldest sibling's middle name?",
        "What is your favorite movie?",
        "How many siblings do you have?"
    ];

    const questionSelects = document.querySelectorAll('.security-question');
    
    // Initialize all dropdowns with all questions
    questionSelects.forEach((select, index) => {
        // Clear existing options except the first one
        while(select.options.length > 1) {
            select.remove(1);
        }
        
        // Add all questions as options
        allQuestions.forEach(question => {
            const option = document.createElement('option');
            option.value = question;
            option.textContent = question;
            select.appendChild(option);
        });
    });

    // Function to update available questions based on selections
    function updateAvailableQuestions() {
        const selectedQuestions = Array.from(questionSelects).map(select => select.value).filter(val => val);
        
        questionSelects.forEach((select, index) => {
            const currentValue = select.value;
            
            // Enable all options first
            Array.from(select.options).forEach(option => {
                option.disabled = false;
            });
            
            // Disable selected questions from other dropdowns
            selectedQuestions.forEach(question => {
                if (question && question !== currentValue) {
                    Array.from(select.options).forEach(option => {
                        if (option.value === question) {
                            option.disabled = true;
                        }
                    });
                }
            });
        });
    }

    // Add event listeners to all question selects
    questionSelects.forEach(select => {
        select.addEventListener('change', updateAvailableQuestions);
    });

    // Initial update
    updateAvailableQuestions();
});