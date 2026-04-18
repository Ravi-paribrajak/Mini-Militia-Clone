import './player.js';
import './ui.js';
import Enemy from './enemy.js';

/**
 * game.js
 * Contains the Matter.js physics world, Outpost map boundaries, and game loop.
 */

// Matter.js aliases
const Engine = Matter.Engine,
      Render = Matter.Render,
      Runner = Matter.Runner,
      Bodies = Matter.Bodies,
      Composite = Matter.Composite,
      Events = Matter.Events;

class Game {
    constructor() {
        // Create engine
        this.engine = Engine.create();
        this.world = this.engine.world;

        // Note: Gravity might need tuning for jetpack feel
        this.engine.world.gravity.y = 1.2;

        // Setup renderer
        this.render = Render.create({
            element: document.getElementById('game-container'),
            engine: this.engine,
            options: {
                width: window.innerWidth,
                height: window.innerHeight,
                wireframes: false,
                background: 'transparent'
            }
        });

        this.setupOutpostMap();
        
        // Instantiate player
        // window.Player will be defined in player.js
        // Instantiate player safely positioned over the left floor platform
        if (window.Player) {
            const safeX = 150;
            this.player = new window.Player(this.world, safeX, 100);
        }

        this.enemies = [];
        this.kills = 0;

        // Handle window resize
        window.addEventListener('resize', () => this.handleResize());

        // Handle aiming and shooting
        window.addEventListener('mousedown', (e) => {
            if (this.player && this.render.bounds) {
                const worldX = e.clientX + this.render.bounds.min.x;
                const worldY = e.clientY + this.render.bounds.min.y;
                this.player.shoot(worldX, worldY);
            }
        });
    }

    setupOutpostMap() {
        const terrainStyle = {
            visible: false
        };

        const w = window.innerWidth;
        const h = window.innerHeight;
        const worldWidth = w * 4;

        // Map background sprite (rendered behind everything)
        const mapBg = Bodies.rectangle(worldWidth / 2, h / 2, worldWidth, h * 2, {
            isStatic: true,
            isSensor: true,
            render: {
                sprite: {
                    texture: '/src/assets/mini-outspot-map.webp',
                    xScale: 2,
                    yScale: 2
                }
            }
        });

        // A floor that spans the width but has a gap in the center
        const gapWidth = 200;
        const floorWidth = (worldWidth - gapWidth) / 2;
        
        const floorLeft = Bodies.rectangle(floorWidth / 2, h + 480, floorWidth, 1000, { isStatic: true, render: terrainStyle });
        const floorRight = Bodies.rectangle(worldWidth - floorWidth / 2, h + 480, floorWidth, 1000, { isStatic: true, render: terrainStyle });
        
        // 4 specific platforms to mimic an Outpost
        const leftBase = Bodies.rectangle(400, h - 250, 400, 20, { isStatic: true, render: terrainStyle });
        const rightBase = Bodies.rectangle(worldWidth - 400, h - 250, 400, 20, { isStatic: true, render: terrainStyle });
        const centerBridge = Bodies.rectangle(worldWidth / 2, h - 150, 300, 20, { isStatic: true, render: terrainStyle });
        const highCover = Bodies.rectangle(worldWidth / 2, h - 450, 200, 20, { isStatic: true, render: terrainStyle });

        // Store world width for spawning
        this._worldWidth = worldWidth;

        // Invisible walls to keep the player inside.
        const ceiling = Bodies.rectangle(worldWidth / 2, -100, worldWidth * 2, 200, { isStatic: true });
        const leftWall = Bodies.rectangle(-50, h / 2, 100, h, { isStatic: true, render: { visible: false } });
        const rightWall = Bodies.rectangle(worldWidth + 50, h / 2, 100, h, { isStatic: true, render: { visible: false } });

        Composite.add(this.world, [mapBg, floorLeft, floorRight, leftBase, rightBase, centerBridge, highCover, ceiling, leftWall, rightWall]);
    }

    handleResize() {
        this.render.canvas.width = window.innerWidth;
        this.render.canvas.height = window.innerHeight;
        this.render.options.width = window.innerWidth;
        this.render.options.height = window.innerHeight;
    }

    start() {
        Render.run(this.render);
        
        Events.on(this.engine, 'collisionStart', (event) => {
            event.pairs.forEach((pair) => {
                const bodyA = pair.bodyA;
                const bodyB = pair.bodyB;
                
                // Player bullet hits enemy
                const isBulletHitEnemy = (bodyA.label === 'bullet' && bodyB.label === 'enemy') || 
                                         (bodyB.label === 'bullet' && bodyA.label === 'enemy');

                // Enemy bullet hits player
                const isEnemyBulletHitPlayer = (bodyA.label === 'enemyBullet' && bodyB.label === 'Rectangle Body') || 
                                               (bodyB.label === 'enemyBullet' && bodyA.label === 'Rectangle Body');

                if (isBulletHitEnemy) {
                    const bullet = bodyA.label === 'bullet' ? bodyA : bodyB;
                    const enemyBody = bodyA.label === 'enemy' ? bodyA : bodyB;
                    
                    Matter.Composite.remove(this.world, bullet);
                    
                    if (enemyBody.enemyInstance) {
                        enemyBody.enemyInstance.takeDamage(25);
                        if (enemyBody.enemyInstance.health <= 0) {
                            this.triggerExplosion(enemyBody.position.x, enemyBody.position.y);
                            Matter.Composite.remove(this.world, enemyBody);
                            this.enemies = this.enemies.filter(e => e !== enemyBody.enemyInstance);
                            this.kills++;
                            document.getElementById('score-board').innerText = 'Kills: ' + this.kills;
                        }
                    }
                } else if (isEnemyBulletHitPlayer) {
                    const enemyBullet = bodyA.label === 'enemyBullet' ? bodyA : bodyB;
                    Matter.Composite.remove(this.world, enemyBullet);
                    
                    if (this.player) {
                        this.player.takeDamage(10);
                        if (this.player.health <= 0 && !this.player.isDead) {
                            this.player.isDead = true;
                            this.triggerExplosion(this.player.body.position.x, this.player.body.position.y);
                            Matter.Composite.remove(this.world, this.player.body);
                            setTimeout(() => { alert("GAME OVER! Refresh to respawn."); }, 1000);
                        }
                    }
                } else {
                    if (bodyA.label === 'bullet') Matter.Composite.remove(this.world, bodyA);
                    if (bodyB.label === 'bullet') Matter.Composite.remove(this.world, bodyB);
                    if (bodyA.label === 'enemyBullet') Matter.Composite.remove(this.world, bodyA);
                    if (bodyB.label === 'enemyBullet') Matter.Composite.remove(this.world, bodyB);
                }
            });
        });

        // Create runner
        const runner = Runner.create();
        Runner.run(runner, this.engine);

        // Spawn enemies every 3 seconds
        setInterval(() => {
            if (this.player && !this.player.isDead) this.spawnEnemy();
        }, 3000);

        // Start custom game loop if needed for physics updates and input
        this.gameLoop();
    }

    spawnEnemy() {
        const x = Math.random() > 0.5 ? 400 : this._worldWidth - 400;
        const newEnemy = new Enemy(this.world, x, window.innerHeight - 300, this.player);
        this.enemies.push(newEnemy);
    }

    triggerExplosion(x, y) {
        for (let i = 0; i < 30; i++) {
            const particle = Bodies.polygon(x, y, 3, Math.random() * 5 + 3, {
                frictionAir: 0.05,
                collisionFilter: { mask: 0 },
                render: { fillStyle: Math.random() > 0.5 ? '#ff9900' : '#ffff00' }
            });
            Matter.Body.setVelocity(particle, {
                x: (Math.random() * 40) - 20,
                y: (Math.random() * 40) - 20
            });
            Composite.add(this.world, particle);

            setTimeout(() => {
                Composite.remove(this.world, particle);
            }, 500);
        }
    }

    gameLoop() {
        requestAnimationFrame(() => this.gameLoop());
        
        this.enemies.forEach(enemy => {
            if (enemy.health > 0) enemy.update();
        });

        if (this.player && !this.player.isDead) {
            this.player.update();
            
            let camX = this.player.body.position.x;
            let camY = this.player.body.position.y;

            // The floor's top edge is at window.innerHeight. 
            // To keep the floor at the bottom of the screen, the camera's center Y cannot exceed half the window height.
            const maxCamY = window.innerHeight / 2;
            if (camY > maxCamY) {
                camY = maxCamY;
            }

            const zoom = 1.5;

            Render.lookAt(this.render, {
                min: { x: camX - (window.innerWidth / 2 / zoom), y: camY - (window.innerHeight / 2 / zoom) },
                max: { x: camX + (window.innerWidth / 2 / zoom), y: camY + (window.innerHeight / 2 / zoom) }
            });
        }
    }
}

// Expose to window so UI can start it
window.GameMap = Game;
