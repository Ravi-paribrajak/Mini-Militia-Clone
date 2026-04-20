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
        rifle: { speed: 25, fireRate: 150, color: '#fffb00', stroke: '#ffaa00', lw: 2, w: 14, h: 4, count: 1, spread: 0, magSize: 30, reloadTime: 1200 },
        shotgun: { speed: 18, fireRate: 800, color: '#ffcc00', stroke: '#dd5500', lw: 1, w: 7, h: 5, count: 5, spread: 0.25, magSize: 8, reloadTime: 2000 },
        uzi: { speed: 25, fireRate: 60, color: '#ffffff', stroke: '#00ffff', lw: 1, w: 10, h: 3, count: 1, spread: 0.15, magSize: 40, reloadTime: 1000 },
        ak47: { speed: 24, fireRate: 160, color: '#ffffff', stroke: '#ff4400', lw: 2, w: 16, h: 5, count: 1, spread: 0.08, magSize: 30, reloadTime: 1500 },
        mp5: { speed: 28, fireRate: 90, color: '#eeffee', stroke: '#00ccff', lw: 2, w: 12, h: 4, count: 1, spread: 0.05, magSize: 30, reloadTime: 1200 },
        sniper: { speed: 45, fireRate: 1500, color: '#ffffff', stroke: '#ff0055', lw: 3, w: 28, h: 3, count: 1, spread: 0, magSize: 5, reloadTime: 2500 }
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

        this.ammoCount = {};
        for (let w in CONFIG.weapons) {
            this.ammoCount[w] = CONFIG.weapons[w].magSize; // Initialize full payload
        }
        this.isReloading = false;
        
        this.isGrenadeMode = false;
        this.grenadeCount = 5;

        this.inventory = [startingWeapon];
        this.renderInventoryHUD();

        this.setupKeyboardInputForTesting();
    }

    setupKeyboardInputForTesting() {
        // Fallback for desktop testing (WASD)
        window.addEventListener('keydown', (e) => {
            if (e.key === 'w' || e.key === 'W') this.input.isThrusting = true;
            if (e.key === 'a' || e.key === 'A') this.input.moveX = -4;
            if (e.key === 'd' || e.key === 'D') this.input.moveX = 4;
            if (e.key === 'r' || e.key === 'R') this.reload();
            if (e.key === 'g' || e.key === 'G') this.toggleGrenadeMode();
            
            // Map keys 1-9 to inventory slots
            const numKey = parseInt(e.key);
            if (!isNaN(numKey) && numKey >= 1 && numKey <= 9) {
                const wpn = this.inventory[numKey - 1];
                if (wpn) this.switchWeapon(wpn);
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.key === 'w' || e.key === 'W') this.input.isThrusting = false;
            if (e.key === 'a' || e.key === 'A') this.input.moveX = 0;
            if (e.key === 'd' || e.key === 'D') this.input.moveX = 0;
        });

        // UI Click bindings for reloading and grenades
        const nadeBtn = document.getElementById('grenade-ui');
        if (nadeBtn) {
            nadeBtn.addEventListener('click', () => this.toggleGrenadeMode());
            nadeBtn.style.cursor = 'pointer';
        }
        
        const ammoBtn = document.getElementById('ammo-count');
        if (ammoBtn) {
            ammoBtn.addEventListener('click', () => this.reload());
            ammoBtn.style.cursor = 'pointer';
        }
    }

    pickupWeapon(weaponName) {
        if (!this.inventory.includes(weaponName)) {
            this.inventory.push(weaponName);
        }
        this.switchWeapon(weaponName);
    }

    switchWeapon(weaponName) {
        if (!this.inventory.includes(weaponName)) return;
        
        this.currentWeapon = weaponName;
        // Visually swap the gun sprite!
        this.weaponBody.render.sprite.texture = `/src/assets/${weaponName}.webp`;
        // And reset any scale flips momentarily so it redraws cleanly
        this.weaponBody.render.sprite.yScale = Math.abs(this.weaponBody.render.sprite.yScale);
        
        this.renderInventoryHUD();
    }

    renderInventoryHUD() {
        const bar = document.getElementById('weapon-inventory-bar');
        if (!bar) return;
        
        bar.innerHTML = '';
        this.inventory.forEach((weapon, index) => {
            const slot = document.createElement('div');
            slot.className = `inventory-slot ${weapon === this.currentWeapon ? 'active' : ''}`;
            
            const hotkey = document.createElement('div');
            hotkey.className = 'hotkey-label';
            hotkey.innerText = `${index + 1}`;
            
            const img = document.createElement('img');
            img.src = `/src/assets/${weapon}.webp`;
            
            slot.appendChild(hotkey);
            slot.appendChild(img);
            
            // Allow clicking to switch
            slot.addEventListener('click', () => {
                this.switchWeapon(weapon);
            });
            
            bar.appendChild(slot);
        });
    }

    reload() {
        if (this.isReloading || this.isGrenadeMode) return;
        const stats = CONFIG.weapons[this.currentWeapon];
        if (this.ammoCount[this.currentWeapon] === stats.magSize) return; // Full
        
        this.isReloading = true;
        this.updateHUD(); // Trigger reload visual state
        
        setTimeout(() => {
            if (this.isDead) return;
            this.ammoCount[this.currentWeapon] = stats.magSize;
            this.isReloading = false;
            this.updateHUD();
        }, stats.reloadTime);
    }

    toggleGrenadeMode() {
        if (this.grenadeCount <= 0 && !this.isGrenadeMode) return;
        this.isGrenadeMode = !this.isGrenadeMode;
        
        const hudBtn = document.getElementById('grenade-ui');
        if (hudBtn) {
            if (this.isGrenadeMode) hudBtn.classList.add('active-grenade-mode');
            else hudBtn.classList.remove('active-grenade-mode');
        }
    }

    throwGrenade(worldMouseX, worldMouseY) {
        if (this.grenadeCount <= 0 || !this.isGrenadeMode) {
            this.toggleGrenadeMode();
            return;
        }

        const angle = Math.atan2(worldMouseY - this.body.position.y, worldMouseX - this.body.position.x);
        
        this.grenadeCount--;
        this.toggleGrenadeMode(); // Automatically exit throwing mode
        this.updateHUD();

        const spawnDist = 30;
        const throwX = this.body.position.x + Math.cos(angle) * spawnDist;
        const throwY = this.body.position.y + Math.sin(angle) * spawnDist;

        const grenade = Matter.Bodies.circle(throwX, throwY, 10, {
            label: 'grenade',
            restitution: 0.6,
            density: 0.005,
            frictionAir: 0.015,
            friction: 0.2,
            collisionFilter: { group: -1 }, // Allow to safely exit player hitbox
            render: {
                sprite: {
                    texture: '/src/assets/grenade.webp',
                    xScale: 0.08,
                    yScale: 0.08
                }
            }
        });

        // Add throwing strength
        Matter.Body.setVelocity(grenade, {
            x: Math.cos(angle) * 15 + this.body.velocity.x,
            y: Math.sin(angle) * 15 + Math.min(0, this.body.velocity.y)
        });
        Matter.Body.setAngularVelocity(grenade, Math.random() * 0.5);

        Matter.Composite.add(this.world, grenade);

        setTimeout(() => {
            Matter.Composite.remove(this.world, grenade);
            // Trigger explosion logic stored on the instance by gameLoop
            if (this.onExplode) {
                this.onExplode(grenade.position.x, grenade.position.y);
            }
        }, 3000);
    }

    shoot(worldMouseX, worldMouseY) {
        if (this.isGrenadeMode) {
            this.throwGrenade(worldMouseX, worldMouseY);
            return;
        }

        if (this.isReloading) return;

        const weaponStats = CONFIG.weapons[this.currentWeapon] || CONFIG.weapons['rifle'];
        
        if (this.ammoCount[this.currentWeapon] <= 0) {
            this.reload();
            return;
        }

        const now = Date.now();
        if (this.lastShot && (now - this.lastShot < weaponStats.fireRate)) {
            return;
        }
        this.lastShot = now;
        
        // Consume one ammo per trigger-pull (even if shotgun fires 5 pellets)
        this.ammoCount[this.currentWeapon]--;
        this.updateHUD();

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

            const w = weaponStats.w || 12;
            const h = weaponStats.h || 3;
            // Round pellets for shotgun style
            const chamferOpt = weaponStats.count > 1 ? { radius: 2 } : undefined;

            const bullet = Matter.Bodies.rectangle(bulletSpawnX, bulletSpawnY, w, h, {
                label: 'bullet',
                collisionFilter: { group: -1 },
                frictionAir: 0,
                restitution: 0,
                inertia: Infinity,
                chamfer: chamferOpt,
                render: { 
                    fillStyle: weaponStats.color, 
                    strokeStyle: weaponStats.stroke || weaponStats.color, 
                    lineWidth: weaponStats.lw || 0
                }
            });

            Matter.Body.setAngle(bullet, bulletAngle);

            Matter.Body.setVelocity(bullet, {
                x: Math.cos(bulletAngle) * weaponStats.speed,
                y: Math.sin(bulletAngle) * weaponStats.speed
            });

            Matter.Composite.add(this.world, bullet);

            // --- DRAMATIC EFFECT 1: MUZZLE FLASH ---
            const muzzleFlash = Matter.Bodies.circle(bulletSpawnX + Math.cos(bulletAngle) * 5, bulletSpawnY + Math.sin(bulletAngle) * 5, 8 + Math.random() * 4, {
                isSensor: true,
                collisionFilter: { mask: 0 },
                render: { fillStyle: Math.random() > 0.5 ? '#ffffff' : '#ffff00', opacity: 0.9 }
            });
            Matter.Composite.add(this.world, muzzleFlash);
            setTimeout(() => Matter.Composite.remove(this.world, muzzleFlash), 30); // Instant flash

            // --- DRAMATIC EFFECT 2: CASING EJECTION ---
            const casing = Matter.Bodies.rectangle(weaponPosX, weaponPosY, 4, 2, {
                frictionAir: 0.01,
                restitution: 0.2,
                collisionFilter: { group: -1, mask: 0 }, // Visual only
                render: { fillStyle: '#d4af37' } // Golden brass
            });
            // Eject vigorously backwards and upwards
            Matter.Body.setVelocity(casing, {
                x: -Math.cos(angle) * (Math.random() * 3 + 2) + this.body.velocity.x,
                y: -Math.random() * 5 - 2
            });
            Matter.Body.setAngularVelocity(casing, (Math.random() - 0.5));
            Matter.Composite.add(this.world, casing);
            setTimeout(() => Matter.Composite.remove(this.world, casing), 800);

            // --- DRAMATIC EFFECT 3: GUN RECOIL PHYSICS ---
            Matter.Body.applyForce(this.body, this.body.position, {
                x: -Math.cos(bulletAngle) * weaponStats.speed * 0.00008,
                y: -Math.sin(bulletAngle) * weaponStats.speed * 0.00008
            });

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

            // B. Hardcode the absolute base scales! Do not read them dynamically from the engine.
            // Look up the current avatar's scale from your dictionary to keep it perfectly sized.
            const selectedAvatar = (window.gameState && window.gameState.selectedAvatar) ? window.gameState.selectedAvatar : '/src/assets/avatar-01.png';
            const spec = {
                '/src/assets/avatar-01.png': { scaleX: 0.25 },
                '/src/assets/avatar-02.png': { scaleX: 0.35 },
                '/src/assets/avatar-03.png': { scaleX: 0.35 },
                '/src/assets/avatar-04.png': { scaleX: 0.35 },
                '/src/assets/avatar-05.png': { scaleX: 0.35 },
                '/src/assets/avatar-06.png': { scaleX: 0.35 },
                '/src/assets/avatar-07.png': { scaleX: 0.35 },
                '/src/assets/avatar-08.png': { scaleX: 0.35 },
                '/src/assets/avatar-09.png': { scaleX: 0.35 },
                '/src/assets/avatar-10.png': { scaleX: 0.35 },
                '/src/assets/avatar-11.png': { scaleX: 0.35 },
                '/src/assets/avatar-12.png': { scaleX: 0.35 },
                '/src/assets/avatar-13.png': { scaleX: 0.35 },
                '/src/assets/avatar-14.png': { scaleX: 0.35 },
                '/src/assets/avatar-15.png': { scaleX: 0.35 }
            }[selectedAvatar] || { scaleX: 0.25 };

            const baseAvatarScaleX = spec.scaleX;
            const baseWeaponScaleY = 0.15; // This MUST match the 0.15 you set in the constructor!

            // C. Flip both the Avatar (X) and the Gun (Y) if aiming left
            if (this.targetX < this.body.position.x) {
                // Aiming LEFT: Make the scales negative to flip the images
                this.body.render.sprite.xScale = -baseAvatarScaleX;
                this.weaponBody.render.sprite.yScale = -baseWeaponScaleY;
            } else {
                // Aiming RIGHT: Keep scales positive
                this.body.render.sprite.xScale = baseAvatarScaleX;
                this.weaponBody.render.sprite.yScale = baseWeaponScaleY;
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

        const ammoDisplay = document.getElementById('ammo-count');
        if (ammoDisplay) {
            const stats = CONFIG.weapons[this.currentWeapon];
            if (this.isReloading) {
                ammoDisplay.innerText = `RELOADING...`;
                ammoDisplay.style.color = '#ffaa00';
            } else {
                ammoDisplay.innerText = `Ammo: ${this.ammoCount[this.currentWeapon]} / ${stats ? stats.magSize : '?'}`;
                ammoDisplay.style.color = this.ammoCount[this.currentWeapon] === 0 ? '#ff0000' : '#ffffff';
            }
        }

        const nadeDisplay = document.getElementById('grenade-count-text');
        if (nadeDisplay) {
            nadeDisplay.innerText = `${this.grenadeCount}`;
        }
    }
}

// Expose to window so game.js can instantiate it
window.Player = Player;
