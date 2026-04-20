export default class Enemy {
    constructor(world, x, y, player) {
        this.world = world;
        this.player = player;
        this.health = 100;
        this.lastShot = 0;

        // --- JETPACK FUEL ---
        this.fuel = 100;
        this.maxFuel = 100;
        this.isThrusting = false;

        this.body = Matter.Bodies.rectangle(x, y, 30, 50, {
            label: 'enemy',
            frictionAir: 0.05,
            friction: 0.5,
            density: 0.002,
            inertia: Infinity,
            render: {
                sprite: {
                    texture: '/src/assets/avatar-08.png',
                    xScale: 0.35,
                    yScale: 0.35,
                    yOffset: 0
                }
            }
        });

        this.body.collisionFilter.group = -2;

        // Link reference to this instance so collisions can access it
        this.body.enemyInstance = this;
        Matter.Composite.add(this.world, this.body);

        // Add weapon AFTER body so it renders in front (Matter.js z-order = add order)
        this.weaponBody = Matter.Bodies.rectangle(x, y, 40, 15, { 
            isSensor: true, 
            collisionFilter: { mask: 0 }, 
            render: { sprite: { texture: '/src/assets/ak47.webp', xScale: 0.15, yScale: 0.15 } } 
        });
        Matter.Composite.add(this.world, this.weaponBody);
    }

    takeDamage(amount) {
        this.health -= amount;

        // --- IMPROVED DYNAMIC IMPACT VISUALS ---
        const particleCount = Math.floor(Math.random() * 3) + 4; // 4 to 6 particles
        for (let i = 0; i < particleCount; i++) {
            const size = Math.random() * 3 + 2;
            const bloodColor = Math.random() > 0.5 ? '#cc0000' : '#8b0000'; // Dark red variants
            
            const impact = Matter.Bodies.circle(
                this.body.position.x + (Math.random() * 20 - 10), 
                this.body.position.y + (Math.random() * 20 - 10), 
                size, 
                {
                    isSensor: true,
                    frictionAir: 0.1, // Rapidly decelerate after burst
                    collisionFilter: { group: -1, mask: 0 },
                    render: { fillStyle: bloodColor }
                }
            );
            
            // Explosive outward radial velocity, biased slightly upward
            Matter.Body.setVelocity(impact, {
                x: (Math.random() * 10 - 5) + (this.body.velocity.x * 0.5),
                y: (Math.random() * -15) + (this.body.velocity.y * 0.5) 
            });
            
            Matter.Composite.add(this.world, impact);
            
            setTimeout(() => {
                Matter.Composite.remove(this.world, impact);
            }, 200 + Math.random() * 200); // Dynamic lifespan 200-400ms
        }
    }

    update() {
        const dx = this.player.body.position.x - this.body.position.x;
        const dy = this.player.body.position.y - this.body.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // ALWAYS move toward the player across the entire map
        const dirX = Math.sign(dx);
        
        // Implement heavy air-movement penalty for AI just like the player
        const horizontalForce = this.isThrusting ? 0.00025 : 0.001; 
        Matter.Body.applyForce(this.body, this.body.position, { x: dirX * horizontalForce, y: 0 });

        // Capping Max Speed for AI exactly like the player
        const maxVelocity = this.isThrusting ? 2.5 : 8;
        if (this.body.velocity.x > maxVelocity) Matter.Body.setVelocity(this.body, { x: maxVelocity, y: this.body.velocity.y });
        if (this.body.velocity.x < -maxVelocity) Matter.Body.setVelocity(this.body, { x: -maxVelocity, y: this.body.velocity.y });

        // --- ENEMY JETPACK AI ---
        // If player is significantly above the bot, use jetpack!
        if (dy < -40 && this.fuel > 0) {
            this.isThrusting = true;
            // Apply upward thrust (same math as player CONFIG.thrustPower)
            Matter.Body.applyForce(this.body, this.body.position, { x: 0, y: -0.006 });
            this.fuel = Math.max(0, this.fuel - 0.25);
            
            // Jetpack Visuals (Exactly matched with Player density)
            const particleCount = Math.floor(Math.random() * 2) + 1;
            for (let i = 0; i < particleCount; i++) {
                const isSmoke = Math.random() < 0.4;
                const color = isSmoke ? '#888888' : (Math.random() > 0.5 ? '#ffaa00' : '#ff3300');
                const size = isSmoke ? (Math.random() * 4 + 4) : (Math.random() * 3 + 2);
                
                const particle = Matter.Bodies.circle(
                    this.body.position.x + (Math.random() * 12 - 6),
                    this.body.position.y + 25,
                    size, 
                    {
                        isSensor: true,
                        frictionAir: 0.05,
                        collisionFilter: { group: -1, mask: 0 },
                        render: { fillStyle: color, opacity: isSmoke ? 0.5 : 1.0 }
                    }
                );
                
                Matter.Body.setVelocity(particle, {
                    x: (Math.random() * 2 - 1) - (this.body.velocity.x * 0.3),
                    y: 2 + Math.random() * 2
                });
                
                Matter.Composite.add(this.world, particle);
                
                setTimeout(() => {
                    Matter.Composite.remove(this.world, particle);
                }, isSmoke ? 300 : 100);
            }
        } else {
            this.isThrusting = false;
            // Recharge fuel when not thrusting
            this.fuel = Math.min(this.maxFuel, this.fuel + 0.5);
            
            // 2% chance per frame to randomly hop over small rocks ONLY when grounded/not thrusting
            if (Math.random() < 0.02) {
                Matter.Body.applyForce(this.body, this.body.position, { x: 0, y: -0.03 });
            }
        }

        // Shoot at player if within 400 units
        if (distance < 400) {
            this.shoot();
        }

        Matter.Body.setAngle(this.body, this.body.velocity.x * 0.04);

        // Dynamic Aiming Flip (Bots)
        if (this.player && !this.player.isDead) {
            const currentScale = Math.abs(this.body.render.sprite.xScale);
            
            if (this.player.body.position.x < this.body.position.x) {
                // Player is to the left -> face left
                this.body.render.sprite.xScale = -currentScale;
            } else {
                // Player is to the right -> face right
                this.body.render.sprite.xScale = currentScale;
            }

            // Weapon Sync
            let offsetX = 12;
            if (this.player.body.position.x < this.body.position.x) {
                offsetX = -12;
            }
            Matter.Body.setPosition(this.weaponBody, { x: this.body.position.x + offsetX, y: this.body.position.y + 5 });

            const angle = Math.atan2(this.player.body.position.y - this.body.position.y, this.player.body.position.x - this.body.position.x);
            Matter.Body.setAngle(this.weaponBody, angle);

            if (this.player.body.position.x < this.body.position.x) {
                this.weaponBody.render.sprite.yScale = -Math.abs(this.weaponBody.render.sprite.yScale);
            } else {
                this.weaponBody.render.sprite.yScale = Math.abs(this.weaponBody.render.sprite.yScale);
            }
        }
    }

    shoot() {
        const now = Date.now();
        if (this.lastShot && (now - this.lastShot < 600)) {
            return;
        }
        this.lastShot = now;

        const angle = Math.atan2(
            this.player.body.position.y - this.body.position.y,
            this.player.body.position.x - this.body.position.x
        ) + (Math.random() - 0.5) * 0.2;

        const spawnDist = 30; // Extend outwards to nozzle
        let weaponPosX = this.body.position.x;
        let weaponPosY = this.body.position.y + 5;
        if (this.player.body.position.x < this.body.position.x) {
            weaponPosX -= 12;
        } else {
            weaponPosX += 12;
        }

        const bulletSpawnX = weaponPosX + Math.cos(angle) * spawnDist;
        const bulletSpawnY = weaponPosY + Math.sin(angle) * spawnDist;

        const bullet = Matter.Bodies.rectangle(bulletSpawnX, bulletSpawnY, 14, 4, {
            label: 'enemyBullet',
            collisionFilter: { group: -2 },
            frictionAir: 0,
            restitution: 0,
            inertia: Infinity,
            render: { fillStyle: '#ffffff', strokeStyle: '#ff0000', lineWidth: 2 }
        });

        Matter.Body.setAngle(bullet, angle);

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
