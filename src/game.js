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
      Events = Matter.Events,
      Vertices = Matter.Vertices;

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
        
        if (window.Player) {
            // Spawn player safely in the sky
            this.player = new window.Player(this.world, 400, 100);
        }

        this.enemies = [];
        this.kills = 0;

        // Handle window resize
        window.addEventListener('resize', () => this.handleResize());

        // Handle aiming and shooting
        window.addEventListener('mousedown', (e) => {
            if (this.player && this.render.bounds) {
                const boundsWidth = this.render.bounds.max.x - this.render.bounds.min.x;
                const boundsHeight = this.render.bounds.max.y - this.render.bounds.min.y;
                const worldX = this.render.bounds.min.x + (e.clientX / window.innerWidth) * boundsWidth;
                const worldY = this.render.bounds.min.y + (e.clientY / window.innerHeight) * boundsHeight;
                this.player.shoot(worldX, worldY);
            }
        });

        // Track raw screen mouse position
        this.mouseX = window.innerWidth / 2; 
        this.mouseY = window.innerHeight / 2;
        window.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });
    }

 setupOutpostMap() {
        const terrainStyle = {
            fillStyle: 'rgba(0, 255, 0, 0.4)', // Keep visible until aligned
            strokeStyle: '#39ff14',
            lineWidth: 1,
            visible: false
        };

        // --- THE DECOUPLED SCALING MATH ---
        const POLY_SCALE = 3.5;  // Multiplier for your traced coordinates
        const BG_SCALE = 0.875;  // Multiplier to shrink the new 4000px image
        
        // Your new exact native image dimensions
        const MAP_NATIVE_WIDTH = 4000; 
        const MAP_NATIVE_HEIGHT = 1384; 

        const MAP_W = 4000 * BG_SCALE; 
        const MAP_H = 1384 * BG_SCALE; 
        this._worldWidth = MAP_W;
        this._worldHeight = MAP_H;

       // 0. CUSTOM BACKGROUND (Rendered behind the Outpost map)
        const sliceWidth = MAP_W / 3; // Divides the map into 3 equal slices horizontally

        for (let i = 1; i <= 3; i++) {
            const skyBg = Bodies.rectangle(
                (sliceWidth / 2) + (sliceWidth * (i - 1)), // X position (Left, Center, Right)
                MAP_H / 2, // Y position (Center vertically)
                sliceWidth + 20, // Width (+10px overlap to prevent vertical seams)
                MAP_H, // Height
                {
                    isStatic: true,
                    isSensor: true,
                    label: 'background',
                    render: {
                        sprite: {
                            // Tile all 3 background images from left to right
                            texture: `/src/assets/background-${i}.png`,
                            xScale: 0.45, 
                            yScale: 0.8
                        }
                    }
                }
            );
            Composite.add(this.world, skyBg);
        }

       // 1. BACKGROUND MAP (Uses BG_SCALE)
        const mapBg = Bodies.rectangle(MAP_W / 2, MAP_H / 2, MAP_W, MAP_H, {
            isStatic: true,
            isSensor: true,
            label: 'background',
            render: {
                sprite: {
                    texture: '/src/assets/mini-outspot-map.webp',
                    xScale: BG_SCALE, 
                    yScale: BG_SCALE
                }
            }
        });
        
        Composite.add(this.world, mapBg);

        // 2. THE 17 CUSTOM POLYGON CHUNKS WITH INDIVIDUAL OFFSETS
        // Tweak the offsetX and offsetY for any piece that is misaligned!
        const polygonChunks = [
            {
                name: "Left Floating Lower Part",
                offsetX: 15, offsetY: 0,
                coords: "63,123,84,125,92,121,98,116,109,115,123,115,155,115,172,107,180,108,191,111,192,116,193,122,192,119,195,133,201,132,206,139,216,142,226,142,236,141,243,141,241,153,236,166,230,175,223,180,216,183,207,183,198,183,183,182,171,179,163,184,157,189,149,189,134,173,126,166,117,159,107,159,101,162,92,163,82,161,76,157,71,150,65,138,63,133,63,133,63,131"
            },
            {
                name: "Left Floating Upper Part (Bunker)",
                offsetX: -5, offsetY: 8,
                coords: "96,95,96,57,99,51,106,48,115,47,122,45,129,46,134,46,140,42,147,39,156,38,162,40,168,43,172,46,178,48,184,50,190,53,192,60,192,90,175,96,173,85,174,76,162,76,149,76,137,76,126,76,119,76,115,79,115,95"
            },
            {
                name: "2nd Left Small Floating Triangle",
                offsetX: 0, offsetY: 0,
                coords: "279,90,288,85,299,91,297,103,292,112,284,113,276,95"
            },
            {
                name: "3rd Left Medium Floating Triangle",
                offsetX: 50, offsetY: -8,
                coords: "356,93,369,79,385,65,394,73,403,82,413,91,413,96,412,103,406,113,401,120,392,123,381,124,373,123,366,119,360,112,355,103"
            },
            {
                name: "Left Semi-Circular Floating Area",
                offsetX: 0, offsetY: 0,
                coords: "314,162,339,161,396,161,394,174,391,183,386,190,381,196,373,200,364,201,353,202,342,202,333,201,327,195,321,188,317,177"
            },
            {
                name: "Left Lower Ground Area (Part 1)",
                offsetX: 120, offsetY: 55,
                coords: "27,238,27,255,28,266,29,274,31,281,37,289,43,293,50,296,61,296,71,293,76,288,80,293,89,303,97,311,104,315,120,315,138,314,148,315,161,314,169,311,176,302,182,297,189,289,190,278,179,283,168,290,155,297,146,292,139,289,139,281,142,273,144,263,145,252,145,240"
            },
            {
                name: "Left Lower Ground Area (Part 2)",
                offsetX: -3, offsetY: -5,
                coords: "191,279,217,277,235,279,243,281,248,284,256,284,267,278,283,277,294,277,319,279,325,283,341,277,376,277,396,281,403,286,400,295,394,296,379,297,368,297,355,295,347,289,343,293,333,296,322,296,312,293,302,296,298,302,276,322,270,324,255,312,245,301,236,293,230,291,225,297,219,302,211,305,203,302,193,289"
            },
            {
                name: "Left First Upper Ground Area",
                offsetX: 30, offsetY: -5,
                coords: "160,238,169,239,174,233,181,231,186,234,188,239,195,235,200,229,207,229,217,229,227,229,237,229,239,236,247,238,256,239,266,238,273,233,278,226,284,221,290,219,298,219,297,226,296,237,291,246,284,254,277,259,264,259,252,259,239,259,228,259,217,259,212,253,205,254,199,257,190,260,185,264,175,268,167,264,163,254"
            },
            {
                name: "Left Second Upper Ground Area",
                offsetX: 0, offsetY: -9,
                coords: "314,220,327,220,334,225,341,233,346,239,354,239,364,238,371,232,378,226,387,219,395,228,405,239,410,238,421,238,428,233,436,229,439,234,444,239,463,240,474,237,473,246,469,260,464,269,458,273,450,277,440,278,433,278,423,272,415,266,408,262,401,258,392,259,383,259,369,259,359,259,350,259,339,257,330,253,323,246,317,233"
            },
            {
                name: "Center Most Floating Area",
                offsetX: -35, offsetY: -20,
                coords: "470,142,480,141,486,135,496,134,499,141,504,143,512,144,520,141,529,132,538,124,546,115,552,107,558,102,569,102,581,105,585,110,588,118,589,127,587,140,581,150,575,157,567,167,558,174,550,184,535,196,524,201,511,201,501,202,492,201,478,194,474,183,470,169,468,154"
            },
            {
                name: "Right Lower Ground Area",
                offsetX: 115, offsetY: -45,
                coords: "507,239,508,256,509,276,509,296,511,314,519,329,527,334,538,336,550,334,557,328,566,320,575,310,594,291,601,296,624,298,651,297,679,297,688,294,693,289,701,298,713,299,733,298,760,297,765,293,770,290,776,295,784,298,793,298,801,295,807,291,813,294,823,298,831,297,849,298,866,297,873,297,882,293,890,295,895,300,900,305,907,306,914,300,927,285,934,278,943,269,949,262,952,251,954,237,953,229,955,220,944,220,942,216,942,205,944,220,942,216,936,203,930,202,923,201,916,204,907,209,901,211,890,211,884,211,878,207,870,203,863,201,855,202,846,208,847,219,841,220,835,220,833,228,825,228,819,229,814,234,810,239,800,240,789,240,769,240,748,239,742,232,737,229,723,229,717,237,709,238,695,238,689,238,683,233,679,229,672,229,666,230,664,220,656,219,649,215,645,211,635,219,626,220,620,219,609,212,603,211,595,218,589,211,580,203,575,199,569,206,564,211,557,220,547,228,537,239"
            },
            {
                name: "Right Upper Floating Area",
                offsetX: 25, offsetY: -35,
                coords: "640,65,656,65,665,58,676,67,692,66,703,73,702,81,698,89,694,94,689,100,680,105,672,106,661,104,654,99,648,92,642,75,640,68"
            },
            {
                name: "2nd Right Upper Floating Area",
                offsetX: -12, offsetY: -20,
                coords: "681,160,698,162,709,162,715,160,722,150,733,151,742,142,751,142,760,150,759,156,755,168,747,179,739,186,729,194,723,198,714,201,704,201,695,197,687,187,682,175,679,165"
            },
            {
                name: "3rd Right Upper Floating Area",
                offsetX: 0, offsetY: 0,
                coords: "778,131,786,124,796,116,808,103,819,93,832,78,846,64,855,72,857,79,854,87,848,96,842,103,833,112,823,121,814,129,802,142,794,150,788,153,782,148"
            },
            {
                name: "4th Right Upper Floating Area (Bunker)",
                offsetX: 0, offsetY: 0,
                coords: "942,185,941,153,942,187,924,190,923,181,923,173,915,172,908,171,906,163,910,154,919,153,929,153,940,153"
            },
            {
                name: "5th Right Upper Floating Area",
                offsetX: 0, offsetY: 0,
                coords: "846,154,867,154,879,155,884,169,877,173,869,173,864,175,865,185,864,190,856,188,847,186"
            },
            {
                name: "6th Right Upper Triangular Floating Area",
                offsetX: 0, offsetY: 0,
                coords: "893,129,900,122,910,119,918,125,920,133,916,141,907,143,898,139"
            }
        ];

        // 3. PARSE AND BUILD POLYGONS (Uses POLY_SCALE)
        polygonChunks.forEach((chunk, index) => {
            const raw = chunk.coords.split(',').map(Number);
            const verts = [];
            
            for (let i = 0; i < raw.length; i += 2) {
                // CHANGED: Now uses POLY_SCALE so the hitboxes stretch correctly
                verts.push({ x: raw[i] * POLY_SCALE, y: raw[i+1] * POLY_SCALE }); 
            }

            const centroid = Vertices.centre(verts);
            
            // Apply the individual nudge offsets!
            const finalX = centroid.x + chunk.offsetX;
            const finalY = centroid.y + chunk.offsetY;

            try {
                const poly = Bodies.fromVertices(finalX, finalY, verts, {
                    isStatic: true,
                    render: terrainStyle
                }, true);

                if (poly) {
                    Matter.Body.setPosition(poly, { x: finalX, y: finalY });
                    Composite.add(this.world, poly);
                } else {
                    console.error(`ERROR: '${chunk.name}' failed to generate.`);
                }
            } catch(e) {
                console.error(`Exception generating '${chunk.name}':`, e);
            }
        });

        // 4. INVISIBLE EDGE WALLS
        const ceiling = Bodies.rectangle(MAP_W / 2, -100, MAP_W * 2, 200, { isStatic: true, render: { visible: false } });
        const leftWall = Bodies.rectangle(-50, MAP_H / 2, 100, MAP_H, { isStatic: true, render: { visible: false } });
        const rightWall = Bodies.rectangle(MAP_W + 50, MAP_H / 2, 100, MAP_H, { isStatic: true, render: { visible: false } });

        Composite.add(this.world, [ceiling, leftWall, rightWall]);
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

                // Skip collisions with the background sprite
                if (bodyA.label === 'background' || bodyB.label === 'background') return;
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
                            if (enemyBody.enemyInstance.weaponBody) Matter.Composite.remove(this.world, enemyBody.enemyInstance.weaponBody);
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
                            if (this.player.weaponBody) Matter.Composite.remove(this.world, this.player.weaponBody);
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
        const newEnemy = new Enemy(this.world, x, 200, this.player);
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
            let camX = this.player.body.position.x;
            let camY = this.player.body.position.y;

            const zoom = 1.5;

            Render.lookAt(this.render, {
                min: { x: camX - (window.innerWidth / 2 / zoom), y: camY - (window.innerHeight / 2 / zoom) },
                max: { x: camX + (window.innerWidth / 2 / zoom), y: camY + (window.innerHeight / 2 / zoom) }
            });

            // 1. Calculate exact world aim based on the live camera bounds
            const boundsWidth = this.render.bounds.max.x - this.render.bounds.min.x;
            this.player.targetX = this.render.bounds.min.x + (this.mouseX / window.innerWidth) * boundsWidth;
            
            const boundsHeight = this.render.bounds.max.y - this.render.bounds.min.y;
            this.player.targetY = this.render.bounds.min.y + (this.mouseY / window.innerHeight) * boundsHeight;

            // 2. Call player update
            this.player.update();
        }
    }
}

// Expose to window so UI can start it
window.GameMap = Game;