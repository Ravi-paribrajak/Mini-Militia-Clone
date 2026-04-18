export default class Enemy {
    constructor(world, x, y, player) {
        this.world = world;
        this.player = player;
        this.health = 100;
        this.lastShot = 0;

        this.body = Matter.Bodies.rectangle(x, y, 30, 50, {
            label: 'enemy',
            frictionAir: 0.05,
            friction: 0.5,
            density: 0.002,
            inertia: Infinity,
            render: {
                sprite: {
                    texture: '/src/assets/avatar-08.png',
                    xScale: 0.15,
                    yScale: 0.15
                }
            }
        });

        this.body.collisionFilter.group = -2;

        // Link reference to this instance so collisions can access it
        this.body.enemyInstance = this;
        Matter.Composite.add(this.world, this.body);
    }

    takeDamage(amount) {
        this.health -= amount;
        this.body.render.fillStyle = '#ffffff';
        setTimeout(() => {
            if (this.body) {
                this.body.render.fillStyle = 'transparent';
            }
        }, 100);
    }

    update() {
        const dx = this.player.body.position.x - this.body.position.x;
        const dy = this.player.body.position.y - this.body.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // ALWAYS move toward the player across the entire map
        const dirX = Math.sign(this.player.body.position.x - this.body.position.x);
        Matter.Body.applyForce(this.body, this.body.position, { x: dirX * 0.001, y: 0 });

        // 2% chance per frame to randomly hop (prevents getting stuck on geometry)
        if (Math.random() < 0.02) {
            Matter.Body.applyForce(this.body, this.body.position, { x: 0, y: -0.03 });
        }

        // Shoot at player if within 400 units
        if (distance < 400) {
            this.shoot();
        }

        Matter.Body.setAngle(this.body, this.body.velocity.x * 0.04);
    }

    shoot() {
        const now = Date.now();
        if (this.lastShot && (now - this.lastShot < 1000)) {
            return;
        }
        this.lastShot = now;

        const angle = Math.atan2(
            this.player.body.position.y - this.body.position.y,
            this.player.body.position.x - this.body.position.x
        ) + (Math.random() - 0.5) * 0.2;

        const bullet = Matter.Bodies.circle(this.body.position.x, this.body.position.y, 5, {
            label: 'enemyBullet',
            collisionFilter: { group: -2 },
            frictionAir: 0,
            restitution: 0,
            render: { fillStyle: '#ff4444' }
        });

        Matter.Body.setVelocity(bullet, {
            x: Math.cos(angle) * 10,
            y: Math.sin(angle) * 10
        });

        Matter.Composite.add(this.world, bullet);

        setTimeout(() => {
            Matter.Composite.remove(this.world, bullet);
        }, 2000);
    }
}
