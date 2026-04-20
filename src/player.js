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
        shotgun: { speed: 20, fireRate: 800, color: '#ff0055', count: 5, spread: 0.3 },
        uzi: { speed: 22, fireRate: 80, color: '#00ffff', count: 1, spread: 0.1 },
        ak47: { speed: 28, fireRate: 150, color: '#ffaa00', count: 1, spread: 0.05 },
        mp5: { speed: 24, fireRate: 100, color: '#00ccff', count: 1, spread: 0.08 },
        sniper: { speed: 45, fireRate: 1200, color: '#ff0000', count: 1, spread: 0 }
    }
};

class Player {
    constructor(world, x, y) {
        this.world = world;
        
        // 1. Fetch the selected avatar from the UI, or fallback to default
        const selectedAvatar = (window.gameState && window.gameState.selectedAvatar) 
            ? window.gameState.selectedAvatar 
            : '/src/assets/avatar-01.png';

        // 2. AVATAR CONFIGURATION DICTIONARY
        // Set up the exact scale and offset for each specific image file here.
        const AVATAR_SPECS = {
            '/src/assets/avatar-01.png': { scaleX: 0.25, scaleY: 0.25, yOffset: 0 },
            '/src/assets/avatar-02.png': { scaleX: 0.35, scaleY: 0.35, yOffset: 0 },
            '/src/assets/avatar-03.png': { scaleX: 0.35, scaleY: 0.35, yOffset: 0 },
            '/src/assets/avatar-04.png': { scaleX: 0.35, scaleY: 0.35, yOffset: 0 },
            '/src/assets/avatar-05.png': { scaleX: 0.35, scaleY: 0.35, yOffset: 0 },
            '/src/assets/avatar-06.png': { scaleX: 0.35, scaleY: 0.35, yOffset: 0 },
            '/src/assets/avatar-07.png': { scaleX: 0.35, scaleY: 0.35, yOffset: 0 },
            '/src/assets/avatar-08.png': { scaleX: 0.35, scaleY: 0.35, yOffset: 0 },
            '/src/assets/avatar-09.png': { scaleX: 0.35, scaleY: 0.35, yOffset: 0 },
            '/src/assets/avatar-10.png': { scaleX: 0.35, scaleY: 0.35, yOffset: 0 },
            '/src/assets/avatar-11.png': { scaleX: 0.35, scaleY: 0.35, yOffset: 0 },
            '/src/assets/avatar-12.png': { scaleX: 0.35, scaleY: 0.35, yOffset: 0 },
            '/src/assets/avatar-13.png': { scaleX: 0.35, scaleY: 0.35, yOffset: 0 },
            '/src/assets/avatar-14.png': { scaleX: 0.35, scaleY: 0.35, yOffset: 0 },
            '/src/assets/avatar-15.png': { scaleX: 0.35, scaleY: 0.35, yOffset: 0 },
            // ... add lines for 04 through 15 as you test them!
        };

        // 3. Look up the specific specs, or use a default if it's not in the list yet
        const spec = AVATAR_SPECS[selectedAvatar] || { scaleX: 0.15, scaleY: 0.15, yOffset: 0.58 };

        // 4. Create the body using the dynamic specs
        this.body = Matter.Bodies.rectangle(x, y, 30, 50, {
            label: 'Rectangle Body',
            frictionAir: 0.05, // Air resistance
            friction: 0.5,
            density: 0.002,
            inertia: Infinity,
            render: {
                sprite: {
                    texture: selectedAvatar,
                    xScale: spec.scaleX,
                    yScale: spec.scaleY,
                    yOffset: spec.yOffset // Adjust this per-avatar to keep boots on the ground!
                }
            }
        });
        
        this.body.collisionFilter.group = -1;
        
        Matter.Composite.add(this.world, this.body);

        // 3. Fetch the selected weapon from the UI
        let startingWeapon = 'rifle'; // default fallback for CONFIG dict mapping
        if (window.gameState && window.gameState.selectedWeapon) {
            // Map the .webp names back to the CONFIG weapon keys
            const weaponName = window.gameState.selectedWeapon.toLowerCase().replace('.webp', '');
            startingWeapon = weaponName;
        }

        // Player health
        this.health = 1000;
        this.isDead = false;
        this.currentWeapon = startingWeapon;
        
        this.weaponBody = Matter.Bodies.rectangle(x, y, 40, 15, { isSensor: true, collisionFilter: { mask: 0 }, render: { sprite: { texture: '/src/assets/' + this.currentWeapon + '.webp', xScale: 0.15, yScale: 0.15 } } });
        Matter.Composite.add(this.world, this.weaponBody);

        this.targetX = x; // Initialize facing direction
        this.targetY = y;

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
        const weaponStats = CONFIG.weapons[this.currentWeapon] || CONFIG.weapons['rifle'];
        const now = Date.now();
        if (this.lastShot && (now - this.lastShot < weaponStats.fireRate)) {
            return;
        }
        this.lastShot = now;

        const angle = Math.atan2(worldMouseY - this.body.position.y, worldMouseX - this.body.position.x);

        // Update facing direction on shoot
        this.targetX = worldMouseX;
        
        // Force sprite flip immediately so bullet doesn't look weird
        if (this.targetX < this.body.position.x) {
            this.body.render.sprite.xScale = -Math.abs(this.body.render.sprite.xScale);
        } else {
            this.body.render.sprite.xScale = Math.abs(this.body.render.sprite.xScale);
        }

        for (let i = 0; i < weaponStats.count; i++) {
            let bulletAngle = angle + (Math.random() - 0.5) * weaponStats.spread;

            const spawnDist = 30; // Distance from weapon center to nozzle
            
            let weaponPosX = this.body.position.x;
            let weaponPosY = this.body.position.y + 5;
            if (this.targetX < this.body.position.x) {
                weaponPosX -= 12;
            } else {
                weaponPosX += 12;
            }

            const bulletSpawnX = weaponPosX + Math.cos(bulletAngle) * spawnDist;
            const bulletSpawnY = weaponPosY + Math.sin(bulletAngle) * spawnDist;

            const bullet = Matter.Bodies.rectangle(bulletSpawnX, bulletSpawnY, 12, 3, {
                label: 'bullet',
                collisionFilter: { group: -1 },
                frictionAir: 0,
                restitution: 0,
                inertia: Infinity,
                render: { fillStyle: weaponStats.color }
            });

            Matter.Body.setAngle(bullet, bulletAngle);

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
        
        // 1. Move weapon to hand position
        let offsetX = 12;
        if (this.targetX !== undefined && this.targetX < this.body.position.x) {
            offsetX = -12;
        }
        Matter.Body.setPosition(this.weaponBody, { x: this.body.position.x + offsetX, y: this.body.position.y + 5 });

        // 2. UNIFIED AIMING AND FLIPPING LOGIC
        if (this.targetX !== undefined && this.targetY !== undefined) {
            
            // A. Rotate the gun
            const angle = Math.atan2(this.targetY - this.weaponBody.position.y, this.targetX - this.weaponBody.position.x);
            Matter.Body.setAngle(this.weaponBody, angle);

            // B. Fetch absolute base scales (prevent shrinking loops)
            const currentAvatarScaleX = Math.abs(this.body.render.sprite.xScale);
            const currentWeaponScaleY = Math.abs(this.weaponBody.render.sprite.yScale);

            // C. Flip both the Avatar (X) and the Gun (Y) if aiming left
            if (this.targetX < this.body.position.x) {
                // Aiming LEFT
                this.body.render.sprite.xScale = -currentAvatarScaleX;
                this.weaponBody.render.sprite.yScale = -currentWeaponScaleY;
            } else {
                // Aiming RIGHT
                this.body.render.sprite.xScale = currentAvatarScaleX;
                this.weaponBody.render.sprite.yScale = currentWeaponScaleY;
            }
        }
    }
    handleJetpackThrust() {
        // Jetpack thrust mathematics
        if (this.input.isThrusting) {
            if (this.fuel > 0) {
                Matter.Body.applyForce(this.body, this.body.position, { x: 0, y: -CONFIG.thrustPower });
                this.fuel = Math.max(0, this.fuel - CONFIG.fuelDrainRate);

                // --- THRUST VISUALS: Fire & Smoke from feet ---
                // Higher density: Spawn 1 to 2 particles every single frame
                const particleCount = Math.floor(Math.random() * 2) + 1;
                for (let i = 0; i < particleCount; i++) {
                    const isSmoke = Math.random() < 0.4; // 40% chance the particle is smoke
                    const color = isSmoke ? '#888888' : (Math.random() > 0.5 ? '#ffaa00' : '#ff3300'); // Smoke or Orange/Red fire
                    const size = isSmoke ? (Math.random() * 4 + 4) : (Math.random() * 3 + 2); // Smoke is bigger
                    
                    const particle = Matter.Bodies.circle(
                        this.body.position.x + (Math.random() * 12 - 6), // Randomize slightly left/right of feet
                        this.body.position.y + 25, // Placed at the boots
                        size, 
                        {
                            isSensor: true,
                            frictionAir: 0.05,
                            collisionFilter: { group: -1, mask: 0 }, // Do not collide with anything
                            render: { fillStyle: color, opacity: isSmoke ? 0.5 : 1.0 }
                        }
                    );
                    
                    // Give it a realistic downward burst velocity mixed with player's reverse momentum
                    Matter.Body.setVelocity(particle, {
                        x: (Math.random() * 2 - 1) - (this.body.velocity.x * 0.3),
                        y: 2 + Math.random() * 2
                    });
                    
                    Matter.Composite.add(this.world, particle);
                    
                    setTimeout(() => {
                        Matter.Composite.remove(this.world, particle);
                    }, isSmoke ? 300 : 100); // Smoke outlasts the fire
                }
            }
        } else {
            // Recharge when not thrusting
            this.fuel = Math.min(CONFIG.maxFuel, this.fuel + CONFIG.fuelRechargeRate);
        }
    }

    handleHorizontalMovement() {
        let currentForce = this.horizontalForce;
        let currentMaxVelocity = 8;
        
        // Massive penalty to Movement in Air: Reduce horizontal force severely if jetpacking
        if (this.input.isThrusting) {
            currentForce *= 0.25; // Slashed down to 25% power
            currentMaxVelocity = 2.5; // Severely crippled air speed limit
        }

        // Air/Ground movement based on joystick X
        if (this.input.moveX !== 0 && this.fuel > 0) {
            Matter.Body.applyForce(this.body, this.body.position, { x: this.input.moveX * currentForce, y: 0 });
        }
        
        // Capping max speed
        if (this.body.velocity.x > currentMaxVelocity) Matter.Body.setVelocity(this.body, { x: currentMaxVelocity, y: this.body.velocity.y });
        if (this.body.velocity.x < -currentMaxVelocity) Matter.Body.setVelocity(this.body, { x: -currentMaxVelocity, y: this.body.velocity.y });
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health < 0) this.health = 0;
        const healthFill = document.querySelector('.health-fill');
        if (healthFill) {
            healthFill.style.width = `${this.health}%`;
        }

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
