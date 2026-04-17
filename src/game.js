import './player.js';
import './ui.js';
import Target from './target.js';

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
            element: document.body,
            engine: this.engine,
            options: {
                width: window.innerWidth,
                height: window.innerHeight,
                wireframes: false,
                background: 'black'
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
            fillStyle: 'transparent',
            strokeStyle: '#39ff14',
            lineWidth: 2
        };

        const w = window.innerWidth;
        const h = window.innerHeight;
        const worldWidth = w * 4;

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

        this.target = new Target(this.world, worldWidth / 2, h - 190);

        // Invisible walls to keep the player inside.
        const ceiling = Bodies.rectangle(worldWidth / 2, -100, worldWidth * 2, 200, { isStatic: true });
        const leftWall = Bodies.rectangle(-50, h / 2, 100, h, { isStatic: true, render: { visible: false } });
        const rightWall = Bodies.rectangle(worldWidth + 50, h / 2, 100, h, { isStatic: true, render: { visible: false } });

        Composite.add(this.world, [floorLeft, floorRight, leftBase, rightBase, centerBridge, highCover, ceiling, leftWall, rightWall]);
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
                
                const isBulletHitTarget = (bodyA.label === 'bullet' && bodyB.label === 'target') || 
                                          (bodyB.label === 'bullet' && bodyA.label === 'target');

                if (isBulletHitTarget) {
                    const bullet = bodyA.label === 'bullet' ? bodyA : bodyB;
                    const targetBody = bodyA.label === 'target' ? bodyA : bodyB;
                    
                    Matter.Composite.remove(this.world, bullet);
                    
                    if (targetBody.targetInstance) {
                        targetBody.targetInstance.takeDamage(25);
                        if (targetBody.targetInstance.health <= 0) {
                            Matter.Composite.remove(this.world, targetBody);
                            this.triggerExplosion(targetBody.position.x, targetBody.position.y);
                            targetBody.targetInstance = null; // Prevent multi-triggers
                        }
                    }
                } else {
                    if (bodyA.label === 'bullet') Matter.Composite.remove(this.world, bodyA);
                    if (bodyB.label === 'bullet') Matter.Composite.remove(this.world, bodyB);
                }
            });
        });

        // Create runner
        const runner = Runner.create();
        Runner.run(runner, this.engine);

        // Start custom game loop if needed for physics updates and input
        this.gameLoop();
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
        
        if (this.player) {
            this.player.update();
            
            let camX = this.player.body.position.x;
            let camY = this.player.body.position.y;

            // The floor's top edge is at window.innerHeight. 
            // To keep the floor at the bottom of the screen, the camera's center Y cannot exceed half the window height.
            const maxCamY = window.innerHeight / 2;
            if (camY > maxCamY) {
                camY = maxCamY;
            }

            Render.lookAt(this.render, {
                min: { x: camX - (window.innerWidth / 2), y: camY - (window.innerHeight / 2) },
                max: { x: camX + (window.innerWidth / 2), y: camY + (window.innerHeight / 2) }
            });
        }
    }
}

// Expose to window so UI can start it
window.GameMap = Game;
