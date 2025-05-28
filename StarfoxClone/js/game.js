// Store audio elements
const sounds = {};

// Function to load and play sound effects
function playSound(name) {
    if (sounds[name]) {
        // Reset sound to beginning if already playing
        sounds[name].currentTime = 0;
        sounds[name].play().catch(e => {
            console.log('Sound play prevented:', e);
            // Silence errors for autoplay restrictions
        });
    }
}

// Load all sound effects
function loadSounds() {
    const soundFiles = {
        'laser': 'laser.wav',
        'explosion': 'explosion.wav',
        'hit': 'hit.wav',
        'enemyShot': 'enemy_shot.wav',
        'powerup': 'powerup.wav',
        'gameover': 'gameover.wav',
        'levelup': 'levelup.wav'
    };
    
    for (const [name, file] of Object.entries(soundFiles)) {
        try {
            const audio = new Audio(`assets/sounds/${file}`);
            audio.volume = 0.4; // Set volume to 40%
            
            // Check if the sound file exists
            audio.addEventListener('error', () => {
                console.log(`Sound file ${file} not found. Using silent audio.`);
                // Create silent audio as fallback
                const silentAudio = new Audio();
                silentAudio.volume = 0;
                sounds[name] = silentAudio;
            });
            
            sounds[name] = audio;
        } catch (e) {
            console.log(`Error loading sound ${file}:`, e);
            // Create silent audio as fallback
            const silentAudio = new Audio();
            silentAudio.volume = 0;
            sounds[name] = silentAudio;
        }
    }
}

class Game {
    constructor() {
        // Store reference to game for global access
        window.game = this;
        
        // Get canvas and context
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas size first
        this.canvas.width = Math.max(800, window.innerWidth * 0.8);
        this.canvas.height = Math.max(600, window.innerHeight * 0.8);
        
        // Game state
        this.state = 'start'; // 'start', 'playing', 'gameover'
        this.score = 0;
        this.level = 1;
        this.levelThreshold = 1000; // Score needed for level up
        this.lives = 3;
        
        // Game objects
        this.starField = new StarField(this.canvas);
        this.ship = new Ship(this.canvas);
        this.obstacleManager = new ObstacleManager(this.canvas);
        
        // Animation frame request
        this.animationId = null;
        
        // Timer for level progression
        this.levelTimer = 0;
        this.levelDuration = 60 * 30; // 30 seconds at 60fps
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Load sounds
        loadSounds();
        
        // Initial draw
        this.draw();
    }
    
    setupEventListeners() {
        // Handle window resize
        window.addEventListener('resize', () => this.resize());
        
        // Start button click
        document.getElementById('startButton').addEventListener('click', () => this.startGame());
        
        // Restart button click
        document.getElementById('restartButton').addEventListener('click', () => this.restartGame());
    }
    
    resize() {
        // Set canvas to window size with minimum dimensions
        this.canvas.width = Math.max(800, window.innerWidth * 0.8);
        this.canvas.height = Math.max(600, window.innerHeight * 0.8);
        
        // Update star field
        if (this.starField) {
            this.starField.resize(this.canvas.width, this.canvas.height);
        }
        
        // Redraw if game is not running
        if (this.state !== 'playing') {
            this.draw();
        }
    }
    
    startGame() {
        // Hide start screen
        document.getElementById('startScreen').style.display = 'none';
        
        // Set game state
        this.state = 'playing';
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        
        // Reset game objects
        this.ship.reset();
        this.obstacleManager.reset();
        
        // Start game loop
        this.gameLoop();
        
        // Start with level 1
        this.setLevel(1);
        
        // Update score display
        this.updateScoreDisplay();
    }
    
    restartGame() {
        // Hide game over screen
        document.getElementById('gameOver').style.display = 'none';
        
        // Start a new game
        this.startGame();
    }
    
    gameLoop() {
        // Update game state
        this.update();
        
        // Draw game
        this.draw();
        
        // Continue game loop if playing
        if (this.state === 'playing') {
            this.animationId = requestAnimationFrame(() => this.gameLoop());
        }
    }
    
    update() {
        // Update game objects
        this.starField.update();
        this.ship.update();
        this.obstacleManager.update();
        
        // Check for collisions
        const result = this.obstacleManager.checkCollisions(this.ship);
        if (result) {
            if (result.crash) {
                this.handleCrash();
            } else if (result.points) {
                this.addScore(result.points);
            }
        }
        
        // Level progression
        this.levelTimer++;
        if (this.levelTimer >= this.levelDuration) {
            this.levelUp();
            this.levelTimer = 0;
        }
    }
    
    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw starfield background
        this.starField.draw();
        
        // Draw obstacles
        this.obstacleManager.draw();
        
        // Draw ship
        if (this.state === 'playing') {
            this.ship.draw();
        }
        
        // Draw level timer
        const progress = this.levelTimer / this.levelDuration;
        this.ctx.fillStyle = '#5bf';
        this.ctx.fillRect(20, this.canvas.height - 20, (this.canvas.width - 40) * progress, 6);
        
        // Draw level display
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '20px "Courier New", Courier, monospace';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`Level: ${this.level}`, this.canvas.width - 20, 30);
        
        // Draw lives
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Lives: ${this.lives}`, 20, 30);
    }
    
    handleCrash() {
        // Play crash sound
        playSound('explosion');
        
        // Decrement lives
        this.lives--;
        
        if (this.lives <= 0) {
            // Game over
            this.gameOver();
        } else {
            // Reset ship position
            this.ship.reset();
        }
    }
    
    gameOver() {
        // Stop game loop
        this.state = 'gameover';
        cancelAnimationFrame(this.animationId);
        
        // Show game over screen
        document.getElementById('gameOver').style.display = 'flex';
        document.getElementById('finalScore').textContent = this.score;
        
        // Play game over sound
        playSound('gameover');
    }
    
    addScore(points) {
        // Add points to score
        this.score += points;
        
        // Check for level up
        if (this.score >= this.level * this.levelThreshold) {
            this.levelUp();
        }
        
        // Update score display
        this.updateScoreDisplay();
    }
    
    levelUp() {
        // Increment level
        this.level++;
        
        // Update obstacle manager
        this.setLevel(this.level);
        
        // Play level up sound
        playSound('levelup');
    }
    
    setLevel(level) {
        this.level = level;
        this.obstacleManager.setLevel(level - 1);
    }
    
    updateScoreDisplay() {
        document.getElementById('score').textContent = `Score: ${this.score}`;
    }
    
    addEnemyProjectile(x, y) {
        this.obstacleManager.addEnemyProjectile(x, y);
    }
}

// Initialize game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Wait for everything to load
    setTimeout(() => {
        const game = new Game();
    }, 500);
}); 