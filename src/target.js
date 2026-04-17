export default class Target {
    constructor(world, x, y) {
        this.world = world;
        this.health = 100;
        this.body = Matter.Bodies.rectangle(x, y, 60, 60, {
            label: 'target',
            isStatic: true,
            render: {
                fillStyle: 'transparent',
                strokeStyle: '#ff0000',
                lineWidth: 2
            }
        });
        
        // Link reference to this instance so collisions can access it easily
        this.body.targetInstance = this;
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
}
