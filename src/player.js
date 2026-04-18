/**
 * player.js
 * Jetpack thrust mathematics and dual-joystick input handling.
 */

const CONFIG = {
    thrustPower: 0.006,
    maxFuel: 100,
    fuelDrainRate: 0.25,
    fuelRechargeRate: 0.5,
    weapons: {
        rifle: { speed: 25, fireRate: 200, color: '#ffeb3b', count: 1, spread: 0 },
        shotgun: { speed: 20, fireRate: 800, color: '#ff0055', count: 5, spread: 0.3 }
    }
};

class Player {
    constructor(world, x, y) {
        this.world = world;
        
        // Physics body for the player
        this.body = Matter.Bodies.rectangle(x, y, 30, 50, {
            frictionAir: 0.05, // Air resistance
            friction: 0.5,
            density: 0.002,
            inertia: Infinity,
            render: {
                sprite: {
                    texture: '/src/assets/avatar-01.png',
                    xScale: 1,
                    yScale: 1
                }
            }
        });
        
        this.body.collisionFilter.group = -1;
        
        Matter.Composite.add(this.world, this.body);

        // Player health
        this.health = 1000;
        this.isDead = false;
        this.currentWeapon = 'rifle';

        // Jetpack settings
        this.fuel = CONFIG.maxFuel;
        this.horizontalForce = 0.002;

        // Input state (placeholder for dual joystick logic)
        this.input = {
            moveX: 0, // Left joystick X (-1 to 1)
            moveY: 0, // Left joystick Y (-1 to 1, -1 is up/jetpack)
            aimX: 0,  // Right joystick X
            aimY: 0,  // Right joystick Y
            isThrusting: false
        };

        this.setupKeyboardInputForTesting();
    }

    setupKeyboardInputForTesting() {
        // Fallback for desktop testing (WASD)
        window.addEventListener('keydown', (e) => {
            if (e.key === 'w' || e.key === 'W') this.input.isThrusting = true;
            if (e.key === 'a' || e.key === 'A') this.input.moveX = -4;
            if (e.key === 'd' || e.key === 'D') this.input.moveX = 4;
            if (e.key === '1') this.currentWeapon = 'rifle';
            if (e.key === '2') this.currentWeapon = 'shotgun';
        });

        window.addEventListener('keyup', (e) => {
            if (e.key === 'w' || e.key === 'W') this.input.isThrusting = false;
            if (e.key === 'a' || e.key === 'A') this.input.moveX = 0;
            if (e.key === 'd' || e.key === 'D') this.input.moveX = 0;
        });
    }

    shoot(worldMouseX, worldMouseY) {
        const weaponStats = CONFIG.weapons[this.currentWeapon];
        const now = Date.now();
        if (this.lastShot && (now - this.lastShot < weaponStats.fireRate)) {
            return;
        }
        this.lastShot = now;

        const angle = Math.atan2(worldMouseY - this.body.position.y, worldMouseX - this.body.position.x);

        for (let i = 0; i < weaponStats.count; i++) {
            let bulletAngle = angle + (Math.random() - 0.5) * weaponStats.spread;

            const bullet = Matter.Bodies.circle(this.body.position.x, this.body.position.y, 5, {
                label: 'bullet',
                collisionFilter: { group: -1 },
                frictionAir: 0,
                restitution: 0,
                render: { fillStyle: weaponStats.color }
            });

            Matter.Body.setVelocity(bullet, {
                x: Math.cos(bulletAngle) * weaponStats.speed,
                y: Math.sin(bulletAngle) * weaponStats.speed
            });

            Matter.Composite.add(this.world, bullet);

            setTimeout(() => {
                Matter.Composite.remove(this.world, bullet);
            }, 2000);
        }
    }

    update() {
        this.handleJetpackThrust();
        this.handleHorizontalMovement();
        this.updateHUD();
        Matter.Body.setAngle(this.body, this.body.velocity.x * 0.04);
    }

    handleJetpackThrust() {
        // Jetpack thrust mathematics
        if (this.input.isThrusting) {
            if (this.fuel > 0) {
                Matter.Body.applyForce(this.body, this.body.position, { x: 0, y: -CONFIG.thrustPower });
                this.fuel = Math.max(0, this.fuel - CONFIG.fuelDrainRate);
            }
        } else {
            // Recharge when not thrusting
            this.fuel = Math.min(CONFIG.maxFuel, this.fuel + CONFIG.fuelRechargeRate);
        }
    }

    handleHorizontalMovement() {
        // Air/Ground movement based on joystick X
        if (this.input.moveX !== 0 && this.fuel > 0) {
            Matter.Body.applyForce(this.body, this.body.position, { x: this.input.moveX * this.horizontalForce, y: 0 });
        }
        
        // Capping max speed
        const maxVelocity = 8;
        if (this.body.velocity.x > maxVelocity) Matter.Body.setVelocity(this.body, { x: maxVelocity, y: this.body.velocity.y });
        if (this.body.velocity.x < -maxVelocity) Matter.Body.setVelocity(this.body, { x: -maxVelocity, y: this.body.velocity.y });
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health < 0) this.health = 0;
        const healthFill = document.querySelector('.health-fill');
        if (healthFill) {
            healthFill.style.width = `${this.health}%`;
        }
    }

    updateHUD() {
        // Update the Jetpack fuel bar in the UI
        const fuelFill = document.querySelector('.jetpack-fill');
        if (fuelFill) {
            fuelFill.style.width = `${(this.fuel / CONFIG.maxFuel) * 100}%`;
        }
    }
}

// Expose to window so game.js can instantiate it
window.Player = Player;
