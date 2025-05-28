class Star {
    constructor(canvas, speed) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.z = Math.random() * 1000;
        this.speed = speed || 5;
        this.size = Math.random() * 2 + 0.5;
        this.color = `rgb(${200 + Math.random() * 55}, ${200 + Math.random() * 55}, ${200 + Math.random() * 55})`;
    }

    update() {
        this.z -= this.speed;
        if (this.z <= 0) {
            this.z = 1000;
            this.x = Math.random() * this.canvas.width;
            this.y = Math.random() * this.canvas.height;
        }
    }

    draw() {
        const screenX = (this.x - this.canvas.width / 2) * (1000 / this.z) + this.canvas.width / 2;
        const screenY = (this.y - this.canvas.height / 2) * (1000 / this.z) + this.canvas.height / 2;
        
        const radius = this.size * (1000 / this.z);
        
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        
        const alpha = Math.min(1, (1000 - this.z) / 1000);
        this.ctx.fillStyle = this.color.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
        
        this.ctx.fill();
        
        // Add streaking effect for closer stars
        if (this.z < 400) {
            const tailLength = (400 - this.z) / 40;
            this.ctx.beginPath();
            this.ctx.moveTo(screenX, screenY);
            this.ctx.lineTo(screenX + tailLength, screenY);
            this.ctx.strokeStyle = this.ctx.fillStyle;
            this.ctx.lineWidth = radius * 0.8;
            this.ctx.stroke();
        }
    }
}

class StarField {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.stars = [];
        this.starCount = 300;
        this.init();
    }

    init() {
        for (let i = 0; i < this.starCount; i++) {
            this.stars.push(new Star(this.canvas, 5 + Math.random() * 5));
        }
    }

    update() {
        this.stars.forEach(star => star.update());
    }

    draw() {
        this.stars.forEach(star => star.draw());
    }

    resize(width, height) {
        // Recalculate star positions when canvas is resized
        this.stars.forEach(star => {
            star.x = Math.random() * width;
            star.y = Math.random() * height;
        });
    }
} 