class Obstacle {
    constructor(canvas, type, speed) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.type = type || this.getRandomType();
        this.speed = speed || this.getRandomSpeed();
        
        // Set random starting position above the screen
        this.x = Math.random() * (canvas.width - 100) + 50;
        this.y = -100;
        
        // Determine properties based on obstacle type
        this.setupByType();
        
        // Movement pattern
        this.movementPattern = Math.floor(Math.random() * 4);
        this.movementPhase = 0;
        
        // Animation properties
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 2;
        
        // Explosion animation
        this.exploding = false;
        this.explosionSize = 0;
        this.explosionMaxSize = this.radius * 3;
    }
    
    getRandomType() {
        const types = ['asteroid', 'mine', 'debris', 'crystal', 'ufo'];
        return types[Math.floor(Math.random() * types.length)];
    }
    
    getRandomSpeed() {
        return 2 + Math.random() * 3;
    }
    
    setupByType() {
        switch(this.type) {
            case 'asteroid':
                this.radius = 25 + Math.random() * 15;
                this.color = '#777';
                this.points = 10;
                this.destructible = true;
                this.detailColor = '#555';
                this.detailCount = Math.floor(Math.random() * 5) + 3;
                this.health = 1;
                break;
                
            case 'mine':
                this.radius = 15 + Math.random() * 5;
                this.color = '#c33';
                this.points = 25;
                this.destructible = true;
                this.blinkRate = 0.05;
                this.blinkPhase = 0;
                this.health = 1;
                this.spikes = 8;
                break;
                
            case 'debris':
                this.radius = 10 + Math.random() * 10;
                this.color = '#a65';
                this.points = 5;
                this.destructible = true;
                this.irregularity = 0.4;
                this.vertices = Math.floor(Math.random() * 3) + 5;
                this.health = 1;
                break;
                
            case 'crystal':
                this.radius = 20 + Math.random() * 10;
                this.color = '#5cf';
                this.points = 30;
                this.destructible = true;
                this.faces = 6;
                this.innerRadius = this.radius * 0.6;
                this.rotationSpeed = 0.01;
                this.health = 2;
                break;
                
            case 'ufo':
                this.radius = 30;
                this.color = '#0ac';
                this.points = 50;
                this.destructible = true;
                this.health = 3;
                this.domeHeight = this.radius * 0.6;
                this.bodyWidth = this.radius * 1.8;
                this.bodyHeight = this.radius * 0.5;
                this.lightPhase = 0;
                this.lightSpeed = 0.05;
                this.shoots = true;
                this.lastShot = 0;
                this.shotDelay = 2000 + Math.random() * 1000;
                break;
        }
    }
    
    update(level) {
        if (this.exploding) {
            // Update explosion animation
            this.explosionSize += this.explosionMaxSize / 10;
            if (this.explosionSize >= this.explosionMaxSize) {
                return true; // Remove this obstacle
            }
            return false;
        }

        // Basic movement
        this.y += this.speed * (1 + level * 0.1);
        
        // Apply movement pattern
        this.movementPhase += 0.02;
        switch(this.movementPattern) {
            case 0: // Straight down
                break;
            case 1: // Sine wave
                this.x += Math.sin(this.movementPhase) * 2;
                break;
            case 2: // Zigzag
                this.x += Math.sin(this.movementPhase * 3) * 1.5;
                break;
            case 3: // Spiral
                const amplitude = Math.min(50, this.movementPhase * 10);
                this.x += Math.cos(this.movementPhase) * amplitude * 0.05;
                break;
        }
        
        // Update rotation
        this.rotation += this.rotationSpeed * 0.02;
        
        // Update type-specific animations
        switch(this.type) {
            case 'mine':
                this.blinkPhase = (this.blinkPhase + this.blinkRate) % 1;
                break;
            case 'ufo':
                this.lightPhase = (this.lightPhase + this.lightSpeed) % 1;
                
                // UFO can shoot
                if (this.shoots) {
                    const now = Date.now();
                    if (now - this.lastShot > this.shotDelay) {
                        this.shoot();
                        this.lastShot = now;
                    }
                }
                break;
        }
        
        // Check if obstacle is off the screen
        return this.y > this.canvas.height + 100;
    }
    
    draw() {
        if (this.exploding) {
            // Draw explosion
            const gradient = this.ctx.createRadialGradient(
                this.x, this.y, 0,
                this.x, this.y, this.explosionSize
            );
            
            gradient.addColorStop(0, 'rgba(255, 200, 50, 1)');
            gradient.addColorStop(0.5, 'rgba(255, 80, 0, 0.8)');
            gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
            
            this.ctx.beginPath();
            this.ctx.arc(this.x, this.y, this.explosionSize, 0, Math.PI * 2);
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
            
            return;
        }
        
        this.ctx.save();
        this.ctx.translate(this.x, this.y);
        this.ctx.rotate(this.rotation);
        
        switch(this.type) {
            case 'asteroid':
                this.drawAsteroid();
                break;
            case 'mine':
                this.drawMine();
                break;
            case 'debris':
                this.drawDebris();
                break;
            case 'crystal':
                this.drawCrystal();
                break;
            case 'ufo':
                this.drawUfo();
                break;
        }
        
        this.ctx.restore();
        
        // Debug hitbox
        /*
        this.ctx.beginPath();
        this.ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'red';
        this.ctx.stroke();
        */
    }
    
    drawAsteroid() {
        // Draw main asteroid body
        this.ctx.beginPath();
        this.ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        
        const gradient = this.ctx.createRadialGradient(
            -this.radius / 3, -this.radius / 3, 0,
            0, 0, this.radius
        );
        gradient.addColorStop(0, '#999');
        gradient.addColorStop(1, this.color);
        
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        
        // Draw craters
        this.ctx.fillStyle = this.detailColor;
        for (let i = 0; i < this.detailCount; i++) {
            const angle = (i / this.detailCount) * Math.PI * 2;
            const distance = Math.random() * 0.7 * this.radius;
            const size = (0.1 + Math.random() * 0.2) * this.radius;
            
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    drawMine() {
        // Blink effect
        const glow = Math.sin(this.blinkPhase * Math.PI * 2) > 0;
        
        // Draw spikes
        for (let i = 0; i < this.spikes; i++) {
            const angle = (i / this.spikes) * Math.PI * 2;
            const spikeLength = this.radius * 0.6;
            
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(
                Math.cos(angle) * (this.radius + spikeLength),
                Math.sin(angle) * (this.radius + spikeLength)
            );
            this.ctx.strokeStyle = glow ? '#f96' : '#933';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
        }
        
        // Draw mine body
        this.ctx.beginPath();
        this.ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        const gradient = this.ctx.createRadialGradient(
            -this.radius / 4, -this.radius / 4, 0,
            0, 0, this.radius
        );
        gradient.addColorStop(0, glow ? '#f44' : '#933');
        gradient.addColorStop(1, glow ? '#c33' : '#622');
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        
        // Draw blinking light
        this.ctx.beginPath();
        this.ctx.arc(0, 0, this.radius / 3, 0, Math.PI * 2);
        this.ctx.fillStyle = glow ? '#ff0' : '#960';
        this.ctx.fill();
    }
    
    drawDebris() {
        this.ctx.beginPath();
        
        // Draw irregular polygon
        for (let i = 0; i < this.vertices; i++) {
            const angle = (i / this.vertices) * Math.PI * 2;
            const r = this.radius * (1 - Math.random() * this.irregularity);
            
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        
        this.ctx.closePath();
        
        const gradient = this.ctx.createLinearGradient(
            -this.radius, -this.radius,
            this.radius, this.radius
        );
        gradient.addColorStop(0, '#a65');
        gradient.addColorStop(1, '#743');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        
        // Draw details
        this.ctx.strokeStyle = '#432';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }
    
    drawCrystal() {
        this.ctx.beginPath();
        
        for (let i = 0; i < this.faces; i++) {
            const angle1 = (i / this.faces) * Math.PI * 2;
            const angle2 = ((i + 1) / this.faces) * Math.PI * 2;
            
            const x1 = Math.cos(angle1) * this.radius;
            const y1 = Math.sin(angle1) * this.radius;
            const x2 = Math.cos(angle2) * this.radius;
            const y2 = Math.sin(angle2) * this.radius;
            const x3 = Math.cos(angle1) * this.innerRadius;
            const y3 = Math.sin(angle1) * this.innerRadius;
            const x4 = Math.cos(angle2) * this.innerRadius;
            const y4 = Math.sin(angle2) * this.innerRadius;
            
            // Draw facet
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.lineTo(x4, y4);
            this.ctx.lineTo(x3, y3);
            this.ctx.closePath();
            
            const gradient = this.ctx.createLinearGradient(
                (x1 + x2) / 2, (y1 + y2) / 2,
                (x3 + x4) / 2, (y3 + y4) / 2
            );
            
            gradient.addColorStop(0, this.color);
            gradient.addColorStop(1, '#38a');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
            
            this.ctx.strokeStyle = '#8ef';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        }
        
        // Draw inner glow
        this.ctx.beginPath();
        this.ctx.arc(0, 0, this.innerRadius * 0.6, 0, Math.PI * 2);
        const glowGradient = this.ctx.createRadialGradient(
            0, 0, 0,
            0, 0, this.innerRadius * 0.6
        );
        glowGradient.addColorStop(0, 'rgba(150, 240, 255, 0.8)');
        glowGradient.addColorStop(1, 'rgba(60, 180, 255, 0)');
        this.ctx.fillStyle = glowGradient;
        this.ctx.fill();
    }
    
    drawUfo() {
        // Draw bottom lights
        const lightCount = 8;
        for (let i = 0; i < lightCount; i++) {
            const angle = (i / lightCount) * Math.PI * 2;
            const x = Math.cos(angle) * (this.bodyWidth / 2 - 5);
            const y = this.bodyHeight / 2;
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, 4, 0, Math.PI * 2);
            
            // Lights animate in sequence
            const lightOn = (i / lightCount + this.lightPhase) % 1 < 0.3;
            this.ctx.fillStyle = lightOn ? '#ff0' : '#960';
            this.ctx.fill();
        }
        
        // Draw bottom saucer
        this.ctx.beginPath();
        this.ctx.ellipse(0, this.bodyHeight / 2, this.bodyWidth / 2, this.bodyHeight / 2, 0, 0, Math.PI * 2);
        const bottomGradient = this.ctx.createLinearGradient(0, 0, 0, this.bodyHeight);
        bottomGradient.addColorStop(0, '#0ac');
        bottomGradient.addColorStop(1, '#088');
        this.ctx.fillStyle = bottomGradient;
        this.ctx.fill();
        
        // Draw middle section
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, this.bodyWidth / 2, this.bodyHeight / 4, 0, 0, Math.PI * 2);
        const middleGradient = this.ctx.createLinearGradient(-this.bodyWidth / 2, 0, this.bodyWidth / 2, 0);
        middleGradient.addColorStop(0, '#088');
        middleGradient.addColorStop(0.5, '#0ac');
        middleGradient.addColorStop(1, '#088');
        this.ctx.fillStyle = middleGradient;
        this.ctx.fill();
        
        // Draw top dome
        this.ctx.beginPath();
        this.ctx.ellipse(0, -this.bodyHeight / 4, this.radius * 0.7, this.domeHeight, 0, 0, Math.PI * 2);
        const domeGradient = this.ctx.createRadialGradient(
            this.radius * 0.2, -this.bodyHeight / 4 - this.domeHeight * 0.2, 0,
            0, -this.bodyHeight / 4, this.radius * 0.7
        );
        domeGradient.addColorStop(0, 'rgba(200, 240, 255, 0.9)');
        domeGradient.addColorStop(0.7, 'rgba(100, 200, 255, 0.7)');
        domeGradient.addColorStop(1, 'rgba(0, 100, 200, 0.5)');
        this.ctx.fillStyle = domeGradient;
        this.ctx.fill();
    }
    
    hit() {
        if (!this.destructible) return false;
        
        this.health--;
        
        if (this.health <= 0) {
            this.explode();
            return true;
        }
        
        // Play hit sound
        playSound('hit');
        
        return false;
    }
    
    explode() {
        this.exploding = true;
        
        // Play explosion sound
        playSound('explosion');
    }
    
    shoot() {
        // Used by UFOs to shoot at the player
        if (window.game) {
            window.game.addEnemyProjectile(this.x, this.y + this.radius);
            
            // Play enemy shot sound
            playSound('enemyShot');
        }
    }
}

class ObstacleManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.obstacles = [];
        this.level = 0;
        this.spawnTimer = 0;
        this.spawnRate = 60; // frames between obstacle spawns
        this.enemyProjectiles = [];
    }
    
    update() {
        // Update spawn timer
        this.spawnTimer++;
        if (this.spawnTimer >= this.spawnRate) {
            this.spawnObstacle();
            this.spawnTimer = 0;
            
            // Adjust spawn rate based on level
            this.spawnRate = Math.max(20, 60 - this.level * 2);
        }
        
        // Update existing obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const remove = this.obstacles[i].update(this.level);
            if (remove) {
                this.obstacles.splice(i, 1);
            }
        }
        
        // Update enemy projectiles
        for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
            const proj = this.enemyProjectiles[i];
            proj.y += proj.speed;
            
            // Remove projectiles that are off screen
            if (proj.y > this.canvas.height) {
                this.enemyProjectiles.splice(i, 1);
            }
        }
    }
    
    draw() {
        // Draw obstacles
        this.obstacles.forEach(obstacle => obstacle.draw());
        
        // Draw enemy projectiles
        this.ctx.fillStyle = '#f60';
        for (const proj of this.enemyProjectiles) {
            this.ctx.beginPath();
            this.ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Projectile glow
            this.ctx.beginPath();
            this.ctx.arc(proj.x, proj.y, proj.radius * 2, 0, Math.PI * 2);
            const gradient = this.ctx.createRadialGradient(
                proj.x, proj.y, 0,
                proj.x, proj.y, proj.radius * 2
            );
            gradient.addColorStop(0, 'rgba(255, 150, 50, 0.5)');
            gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
        }
    }
    
    spawnObstacle() {
        // Favor certain obstacle types based on the level
        let type;
        const rand = Math.random();
        
        if (this.level < 2) {
            // More asteroids and debris early on
            if (rand < 0.6) type = 'asteroid';
            else if (rand < 0.9) type = 'debris';
            else type = 'mine';
        } else if (this.level < 5) {
            // More varied obstacles in mid levels
            if (rand < 0.4) type = 'asteroid';
            else if (rand < 0.6) type = 'debris';
            else if (rand < 0.8) type = 'mine';
            else if (rand < 0.95) type = 'crystal';
            else type = 'ufo';
        } else {
            // More difficult obstacles in later levels
            if (rand < 0.3) type = 'asteroid';
            else if (rand < 0.5) type = 'debris';
            else if (rand < 0.7) type = 'mine';
            else if (rand < 0.85) type = 'crystal';
            else type = 'ufo';
        }
        
        const speed = 2 + Math.random() * 3 + this.level * 0.2;
        this.obstacles.push(new Obstacle(this.canvas, type, speed));
    }
    
    checkCollisions(ship) {
        // Check for collisions with ship
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            
            // Check if ship laser hits obstacle
            const laserHit = ship.checkLaserHit(obstacle);
            if (laserHit) {
                const destroyed = obstacle.hit();
                if (destroyed) {
                    return { points: obstacle.points };
                }
            }
            
            // Check if ship collides with obstacle
            if (ship.checkCollision(obstacle)) {
                obstacle.explode();
                return { crash: true };
            }
        }
        
        // Check for collisions with enemy projectiles
        for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
            const proj = this.enemyProjectiles[i];
            const shipCenterX = ship.x + ship.width / 2;
            const shipCenterY = ship.y + ship.height / 2;
            
            const dx = shipCenterX - proj.x;
            const dy = shipCenterY - proj.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < ship.hitboxRadius + proj.radius) {
                this.enemyProjectiles.splice(i, 1);
                return { crash: true };
            }
        }
        
        return null;
    }
    
    addEnemyProjectile(x, y) {
        this.enemyProjectiles.push({
            x,
            y,
            speed: 5 + this.level * 0.5,
            radius: 5
        });
    }
    
    reset() {
        this.obstacles = [];
        this.enemyProjectiles = [];
        this.spawnTimer = 0;
        this.level = 0;
        this.spawnRate = 60;
    }
    
    setLevel(level) {
        this.level = level;
    }
} 