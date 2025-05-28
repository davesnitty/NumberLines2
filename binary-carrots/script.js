// Binary Carrots - Main script

document.addEventListener('DOMContentLoaded', () => {
    // Set up initial state
    const binaryDigits = [0, 0, 0, 0, 0]; // Represent the 5 binary digits (0s and 1s)
    
    // Get DOM elements
    const digitElements = Array.from({ length: 5 }, (_, i) => document.getElementById(`digit${i}`));
    const decimalValueElement = document.getElementById('decimal-value');
    
    // Update the display to match the current state
    const updateDisplay = () => {
        // Update binary digits display
        digitElements.forEach((element, index) => {
            element.textContent = binaryDigits[index];
            
            // Toggle active class based on digit value
            if (binaryDigits[index] === 1) {
                element.classList.add('active');
            } else {
                element.classList.remove('active');
            }
        });
        
        // Calculate decimal value
        const decimalValue = binaryDigits.reduce((sum, digit, index) => {
            return sum + digit * Math.pow(2, index);
        }, 0);
        
        // Update decimal display
        decimalValueElement.textContent = decimalValue;
    };
    
    // Toggle a specific digit
    const toggleDigit = (index) => {
        binaryDigits[index] = binaryDigits[index] === 0 ? 1 : 0;
        updateDisplay();
    };
    
    // Handle keydown events
    document.addEventListener('keydown', (event) => {
        // Prevent default behavior for the arrow keys and space
        if (['ArrowUp', 'ArrowRight', 'ArrowLeft', 'ArrowDown', ' '].includes(event.key)) {
            event.preventDefault();
        }
        
        // Map keys to digit indices
        switch (event.key) {
            case 'ArrowUp':
                toggleDigit(4); // Digit for 2^4 (16)
                break;
            case 'ArrowRight':
                toggleDigit(3); // Digit for 2^3 (8)
                break;
            case 'ArrowLeft':
                toggleDigit(2); // Digit for 2^2 (4)
                break;
            case 'ArrowDown':
                toggleDigit(1); // Digit for 2^1 (2)
                break;
            case ' ': // Space bar
                toggleDigit(0); // Digit for 2^0 (1)
                break;
        }
    });
    
    // Initial display update
    updateDisplay();
}); 