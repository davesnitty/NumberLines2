 class Ship {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Ship dimensions
        this.width = 60;
        this.height = 40;
        
        // Initial position
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height / 2 + canvas.height / 4;
        
        // Ship movement properties
        this.speed = 8;
        this.maxRoll = 45; // Maximum roll angle in degrees
        
        // Current state
        this.roll = 0;
        this.targetRoll = 0;
        this.rollSpeed = 5;
        
        // Movement control
        this.moving = {
            left: false,
            right: false,
            up: false,
            down: false
        };
        
        // Ship boundaries
        this.minX = -this.width / 2;
        this.maxX = canvas.width - this.width / 2;
        this.minY = canvas.height / 4;
        this.maxY = canvas.height - this.height;
        
        // Laser properties
        this.lasers = [];
        this.lastShot = 0;
        this.shotDelay = 200; // ms
        
        // Hitbox (for collision detection)
        this.hitboxRadius = this.width / 3;
        
        // Engine animation
        this.engineFlicker = 0;
        
        this.initControls();
    }
    
    initControls() {
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'ArrowLeft':
                    this.moving.left = true;
                    this.targetRoll = this.maxRoll;
                    break;
                case 'ArrowRight':
                    this.moving.right = true;
                    this.targetRoll = -this.maxRoll;
                    break;
                case 'ArrowUp':
                    this.moving.up = true;
                    break;
                case 'ArrowDown':
                    this.moving.down = true;
                    break;
                case ' ':
                    this.shoot();
                    break;
            }
        });
        
        document.addEventListener('keyup', (e) => {
            switch(e.key) {
                case 'ArrowLeft':
                    this.moving.left = false;
                    if (!this.moving.right) this.targetRoll = 0;
                    else this.targetRoll = -this.maxRoll;
                    break;
                case 'ArrowRight':
                    this.moving.right = false;
                    if (!this.moving.left) this.targetRoll = 0;
                    else this.targetRoll = this.maxRoll;
                    break;
                case 'ArrowUp':
                    this.moving.up = false;
                    break;
                case 'ArrowDown':
                    this.moving.down = false;
                    break;
            }
        });
    }
    
    shoot() {
        const now = Date.now();
        if (now - this.lastShot > this.shotDelay) {
            this.lasers.push({
                x: this.x + this.width / 2,
                y: this.y,
                speed: 15,
                width: 4,
                height: 15
            });
            
            // Play laser sound
            playSound('laser');
            
            this.lastShot = now;
        }
    }
    
    update() {
        // Update ship position based on movement
        if (this.moving.left) this.x -= this.speed;
        if (this.moving.right) this.x += this.speed;
        if (this.moving.up) this.y -= this.speed;
        if (this.moving.down) this.y += this.speed;
        
        // Keep ship within boundaries
        this.x = Math.max(this.minX, Math.min(this.maxX, this.x));
        this.y = Math.max(this.minY, Math.min(this.maxY, this.y));
        
        // Update roll animation
        if (this.roll !== this.targetRoll) {
            const diff = this.targetRoll - this.roll;
            this.roll += diff * 0.1;
            
            // Snap to target if close enough
            if (Math.abs(diff) < 0.1) {
                this.roll = this.targetRoll;
            }
        }
        
        // Update lasers
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            this.lasers[i].y -= this.lasers[i].speed;
            
            // Remove lasers that are off screen
            if (this.lasers[i].y < 0) {
                this.lasers.splice(i, 1);
            }
        }
        
        // Update engine flicker
        this.engineFlicker = (this.engineFlicker + 0.2) % 1;
    }
    
    draw() {
        this.ctx.save();
        
        // Draw lasers
        this.ctx.fillStyle = '#f55';
        for (const laser of this.lasers) {
            this.ctx.fillRect(laser.x - laser.width / 2, laser.y, laser.width, laser.height);
            
            // Laser glow
            this.ctx.beginPath();
            this.ctx.arc(laser.x, laser.y + laser.height / 2, laser.width * 2, 0, Math.PI * 2);
            const gradient = this.ctx.createRadialGradient(
                laser.x, laser.y + laser.height / 2, 0,
                laser.x, laser.y + laser.height / 2, laser.width * 2
            );
            gradient.addColorStop(0, 'rgba(255, 100, 100, 0.5)');
            gradient.addColorStop(1, 'rgba(255, 100, 100, 0)');
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
        }
        
        // Translate to ship center for rotation
        this.ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        
        // Apply roll effect
        this.ctx.rotate(this.roll * Math.PI / 180);
        
        // Draw engine flames
        const flameHeight = 10 + Math.random() * 5 + Math.sin(this.engineFlicker * Math.PI * 2) * 5;
        this.ctx.beginPath();
        this.ctx.moveTo(-10, this.height / 2);
        this.ctx.lineTo(0, this.height / 2 + flameHeight);
        this.ctx.lineTo(10, this.height / 2);
        this.ctx.closePath();
        
        const flameGradient = this.ctx.createLinearGradient(0, this.height / 2, 0, this.height / 2 + flameHeight);
        flameGradient.addColorStop(0, '#ff8');
        flameGradient.addColorStop(0.5, '#f60');
        flameGradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
        this.ctx.fillStyle = flameGradient;
        this.ctx.fill();
        
        // Draw ship body
        this.ctx.beginPath();
        
        // Ship nose
        this.ctx.moveTo(0, -this.height / 2);
        
        // Right wing
        this.ctx.lineTo(this.width / 2, this.height / 4);
        this.ctx.lineTo(this.width / 3, this.height / 2);
        
        // Ship tail
        this.ctx.lineTo(-this.width / 3, this.height / 2);
        
        // Left wing
        this.ctx.lineTo(-this.width / 2, this.height / 4);
        
        this.ctx.closePath();
        
        // Ship gradient
        const bodyGradient = this.ctx.createLinearGradient(0, -this.height / 2, 0, this.height / 2);
        bodyGradient.addColorStop(0, '#7af');
        bodyGradient.addColorStop(0.5, '#48c');
        bodyGradient.addColorStop(1, '#26a');
        this.ctx.fillStyle = bodyGradient;
        this.ctx.fill();
        
        // Ship outline
        this.ctx.strokeStyle = '#8cf';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Cockpit
        this.ctx.beginPath();
        this.ctx.ellipse(0, -this.height / 6, this.width / 6, this.height / 6, 0, 0, Math.PI * 2);
        const cockpitGradient = this.ctx.createRadialGradient(
            this.width / 24, -this.height / 6 - this.height / 24, 0,
            0, -this.height / 6, this.width / 6
        );
        cockpitGradient.addColorStop(0, '#fff');
        cockpitGradient.addColorStop(0.2, '#bef');
        cockpitGradient.addColorStop(1, '#26a');
        this.ctx.fillStyle = cockpitGradient;
        this.ctx.fill();
        
        this.ctx.restore();
        
        // Debug hitbox
        /*
        this.ctx.beginPath();
        this.ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.hitboxRadius, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'red';
        this.ctx.stroke();
        */
    }
    
    reset() {
        this.x = this.canvas.width / 2 - this.width / 2;
        this.y = this.canvas.height / 2 + this.canvas.height / 4;
        this.roll = 0;
        this.targetRoll = 0;
        this.moving = {
            left: false,
            right: false,
            up: false,
            down: false
        };
        this.lasers = [];
    }
    
    checkCollision(obstacle) {
        // Check if ship collides with an obstacle
        const shipCenterX = this.x + this.width / 2;
        const shipCenterY = this.y + this.height / 2;
        
        const dx = shipCenterX - obstacle.x;
        const dy = shipCenterY - obstacle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance < (this.hitboxRadius + obstacle.radius);
    }
    
    checkLaserHit(obstacle) {
        // Check if any laser hits the given obstacle
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const laser = this.lasers[i];
            const dx = laser.x - obstacle.x;
            const dy = (laser.y + laser.height / 2) - obstacle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < obstacle.radius) {
                // Remove the laser that hit
                this.lasers.splice(i, 1);
                return true;
            }
        }
        return false;
    }
} 