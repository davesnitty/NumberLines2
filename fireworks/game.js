// Set up the canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas to full window size
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// Call resize initially and on window resize
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Game constants
const GRAVITY = 0.1;
const BARGE_WIDTH = 60;
const BARGE_HEIGHT = 30;
const BARGE_SPACING = canvas.width / 6;
const RIVER_HEIGHT = 50;

// Colors for each barge's fireworks
const FIREWORK_COLORS = [
    ['#FF0000', '#FF5500', '#FFFF00'], // red/orange (left arrow)
    ['#00FF00', '#88FF00', '#DDFF00'], // green (up arrow)
    ['#0000FF', '#0088FF', '#00FFFF'], // blue (down arrow)
    ['#FF00FF', '#FF00AA', '#FF0055'], // pink/purple (right arrow)
    ['#FFFFFF', '#FFFF88', '#FFAA00']  // white/gold (space)
];

// Create the barges
const barges = [
    { x: BARGE_SPACING * 1, y: canvas.height - RIVER_HEIGHT, color: '#8B4513', key: 'ArrowLeft', keyName: 'Left Arrow' },
    { x: BARGE_SPACING * 2, y: canvas.height - RIVER_HEIGHT, color: '#A52A2A', key: 'ArrowUp', keyName: 'Up Arrow' },
    { x: BARGE_SPACING * 3, y: canvas.height - RIVER_HEIGHT, color: '#D2691E', key: 'ArrowDown', keyName: 'Down Arrow' },
    { x: BARGE_SPACING * 4, y: canvas.height - RIVER_HEIGHT, color: '#CD853F', key: 'ArrowRight', keyName: 'Right Arrow' },
    { x: BARGE_SPACING * 5, y: canvas.height - RIVER_HEIGHT, color: '#DAA520', key: ' ', keyName: 'Space' }
];

// Array to store active fireworks
let fireworks = [];
// Array to store explosion particles
let particles = [];

// Create city skyline
const buildings = [];
function createCitySkyline() {
    buildings.length = 0;
    const buildingCount = Math.floor(canvas.width / 50);
    
    for (let i = 0; i < buildingCount; i++) {
        const width = 30 + Math.random() * 40;
        const height = 50 + Math.random() * 150;
        const x = i * (canvas.width / buildingCount);
        const y = canvas.height - RIVER_HEIGHT - height;
        
        // Windows
        const windows = [];
        const windowRows = Math.floor(height / 15);
        const windowCols = Math.floor(width / 10);
        
        for (let row = 0; row < windowRows; row++) {
            for (let col = 0; col < windowCols; col++) {
                // Some windows will be lit, some won't
                if (Math.random() > 0.3) {
                    windows.push({
                        x: x + col * 10 + 2,
                        y: y + row * 15 + 2,
                        width: 6,
                        height: 10,
                        lit: Math.random() > 0.5
                    });
                }
            }
        }
        
        buildings.push({
            x: x,
            y: y,
            width: width,
            height: height,
            color: '#333',
            windows: windows
        });
    }
}
createCitySkyline();

// Draw city skyline
function drawSkyline() {
    buildings.forEach(building => {
        // Draw building
        ctx.fillStyle = building.color;
        ctx.fillRect(building.x, building.y, building.width, building.height);
        
        // Draw windows
        building.windows.forEach(window => {
            ctx.fillStyle = window.lit ? '#FFFF88' : '#555';
            ctx.fillRect(window.x, window.y, window.width, window.height);
        });
    });
}

// Create a firework
function createFirework(bargeIndex) {
    const barge = barges[bargeIndex];
    const colors = FIREWORK_COLORS[bargeIndex];
    
    fireworks.push({
        x: barge.x + BARGE_WIDTH / 2,
        y: barge.y,
        speedX: Math.random() * 2 - 1, // Small random horizontal movement
        speedY: -10 - Math.random() * 3, // Upward velocity
        color: colors[0],
        bargeIndex: bargeIndex,
        trail: [], // To store previous positions for the trail
        maxTrail: 10
    });
    
    // Play launch sound (a simple beep)
    const launchSound = new Audio();
    launchSound.src = 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU' + Math.random().toString(36).substring(2, 15);
    try {
        launchSound.play().catch(e => {
            // Ignore audio play errors (common in browsers)
        });
    } catch (e) {
        // Ignore if audio fails
    }
}

// Create explosion particles
function createExplosion(x, y, color, bargeIndex) {
    const colors = FIREWORK_COLORS[bargeIndex];
    const particleCount = 50 + Math.floor(Math.random() * 30);
    
    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3;
        const size = 2 + Math.random() * 2;
        
        particles.push({
            x: x,
            y: y,
            speedX: Math.cos(angle) * speed,
            speedY: Math.sin(angle) * speed,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: size,
            life: 40 + Math.random() * 40
        });
    }
    
    // Play explosion sound
    const explosionSound = new Audio();
    explosionSound.src = 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU' + Math.random().toString(36).substring(2, 15);
    try {
        explosionSound.play().catch(e => {
            // Ignore audio play errors
        });
    } catch (e) {
        // Ignore if audio fails
    }
}

// Draw a barge
function drawBarge(barge) {
    // Draw barge body
    ctx.fillStyle = barge.color;
    ctx.fillRect(barge.x, barge.y, BARGE_WIDTH, BARGE_HEIGHT);
    
    // Draw cannon/launcher
    ctx.fillStyle = '#555';
    ctx.fillRect(barge.x + BARGE_WIDTH / 2 - 5, barge.y - 15, 10, 15);
}

// Draw night sky
function drawSky() {
    // Create gradient for night sky
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height - RIVER_HEIGHT);
    skyGradient.addColorStop(0, '#000033');
    skyGradient.addColorStop(1, '#000066');
    
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height - RIVER_HEIGHT);
    
    // Draw some stars
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 100; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * (canvas.height - RIVER_HEIGHT - 100);
        const size = Math.random() * 2;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Draw river
function drawRiver() {
    // Create gradient for river
    const riverGradient = ctx.createLinearGradient(0, canvas.height - RIVER_HEIGHT, 0, canvas.height);
    riverGradient.addColorStop(0, '#000066');
    riverGradient.addColorStop(1, '#000044');
    
    ctx.fillStyle = riverGradient;
    ctx.fillRect(0, canvas.height - RIVER_HEIGHT, canvas.width, RIVER_HEIGHT);
    
    // Draw simple water reflection
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    for (let i = 0; i < canvas.width; i += 20) {
        ctx.moveTo(i, canvas.height - RIVER_HEIGHT);
        ctx.lineTo(i + 10, canvas.height - RIVER_HEIGHT + 5);
        ctx.lineTo(i + 20, canvas.height - RIVER_HEIGHT);
    }
    ctx.stroke();
}

// Update game state
function update() {
    // Update fireworks
    for (let i = fireworks.length - 1; i >= 0; i--) {
        const firework = fireworks[i];
        
        // Add current position to trail
        firework.trail.push({ x: firework.x, y: firework.y });
        if (firework.trail.length > firework.maxTrail) {
            firework.trail.shift();
        }
        
        // Update position
        firework.x += firework.speedX;
        firework.y += firework.speedY;
        
        // Apply gravity
        firework.speedY += GRAVITY;
        
        // If the firework reaches its peak, explode it
        if (firework.speedY >= 0) {
            createExplosion(firework.x, firework.y, firework.color, firework.bargeIndex);
            fireworks.splice(i, 1);
        }
    }
    
    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        
        // Update position
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        
        // Apply gravity (gentler than fireworks)
        particle.speedY += GRAVITY * 0.5;
        
        // Reduce life
        particle.life--;
        
        // Remove dead particles
        if (particle.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

// Draw everything
function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw night sky
    drawSky();
    
    // Draw city skyline
    drawSkyline();
    
    // Draw river
    drawRiver();
    
    // Draw barges
    barges.forEach(barge => drawBarge(barge));
    
    // Draw fireworks
    fireworks.forEach(firework => {
        // Draw trail
        for (let i = 0; i < firework.trail.length; i++) {
            const point = firework.trail[i];
            const alpha = i / firework.maxTrail;
            ctx.fillStyle = `rgba(255, 255, 150, ${alpha})`;
            ctx.beginPath();
            ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw firework
        ctx.fillStyle = firework.color;
        ctx.beginPath();
        ctx.arc(firework.x, firework.y, 3, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Draw particles
    particles.forEach(particle => {
        ctx.fillStyle = particle.color;
        // Fade out particles as they age
        const alpha = particle.life / 80;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Reset global alpha
    ctx.globalAlpha = 1.0;
}

// Game loop
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Start the game loop
gameLoop();

// Handle key presses
document.addEventListener('keydown', function(event) {
    // Check which barge should launch
    barges.forEach((barge, index) => {
        if (event.key === barge.key) {
            createFirework(index);
        }
    });
});

// Special case for space key to prevent scrolling
window.addEventListener('keydown', function(e) {
    if (e.code === 'Space') {
        e.preventDefault();
    }
});