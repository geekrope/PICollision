"use strict";
class PhysicalObject {
}
class Utils {
    static getSegment(position, size) {
        return { point1: position, point2: position + size };
    }
    static getLength(segment) {
        return Math.abs(segment.point2 - segment.point1);
    }
    static getCenter(segment) {
        return (segment.point2 + segment.point1) / 2;
    }
    static distanceBeetweenSegments(segment1, segment2) {
        const center1 = Utils.getCenter(segment1);
        const center2 = Utils.getCenter(segment2);
        const radius1 = Utils.getLength(segment1) / 2;
        const radius2 = Utils.getLength(segment2) / 2;
        return Utils.getLength({ point1: center1, point2: center2 }) - (radius1 + radius2);
    }
    static distanceBeetweenSegmentAndPoint(segment, point) {
        return Utils.getLength({ point1: Utils.getCenter(segment), point2: point }) - Utils.getLength(segment) / 2;
    }
}
class MaterialPoint {
    constructor(mass, velocity, position) {
        this._mass = mass;
        this._velocity = velocity;
        this._position = position;
    }
    get impulse() {
        return this._velocity * this._mass;
    }
    get mass() {
        return this._mass;
    }
    get velocity() {
        return this._velocity;
    }
    get position() {
        return this._position;
    }
    set mass(value) {
        this._mass = value;
    }
    set velocity(value) {
        this._velocity = value;
    }
    set position(value) {
        this._position = value;
    }
}
class Block {
    constructor(size, mass, velocity, position) {
        this._properties = new MaterialPoint(mass, velocity, position);
        this._size = size;
        this._collisions = 0;
    }
    get properties() {
        return this._properties;
    }
    get size() {
        return this._size;
    }
    get collisions() {
        return this._collisions;
    }
    getPosition(timeDelta) {
        if (timeDelta != undefined) {
            return this.properties.position + this.properties.velocity * timeDelta;
        }
        else {
            return this._properties.position;
        }
    }
    setPosition(value) {
        this._properties.position = value;
    }
    getVelocity() {
        return this.properties.velocity;
    }
    setVelocity(value) {
        this._properties.velocity = value;
    }
    distance(object, timeDelta) {
        if (object instanceof Block) {
            return Utils.distanceBeetweenSegments(Utils.getSegment(timeDelta != undefined ? this.getPosition(timeDelta) : this._properties.position, this._size), Utils.getSegment(timeDelta != undefined ? object.getPosition(timeDelta) : object.properties.position, object.size));
        }
        else if (object instanceof Wall) {
            return Utils.distanceBeetweenSegmentAndPoint(Utils.getSegment(timeDelta != undefined ? this.getPosition(timeDelta) : this._properties.position, this._size), object.position);
        }
        else {
            throw new TypeError("Unknown type");
        }
    }
    processCollision(object) {
        this._collisions++;
        if (object instanceof Block) {
            return (this._properties.impulse - object.properties.mass * this._properties.velocity + 2 * object.properties.impulse) / (this._properties.mass + object.properties.mass);
        }
        else if (object instanceof Wall) {
            return -this._properties.velocity;
        }
        else {
            throw new TypeError("Unknown type");
        }
    }
}
class Wall {
    constructor(position) {
        this._position = position;
    }
    get position() {
        return this._position;
    }
    getPosition() {
        return this._position;
    }
    getVelocity() {
        return 0;
    }
    distance(object, timeDelta) {
        if (object instanceof Block) {
            return object.distance(this, timeDelta);
        }
        else if (object instanceof Wall) {
            return object.position - this.position;
        }
        else {
            throw new TypeError("Unknown type");
        }
    }
    processCollision(_object) {
        return NaN;
    }
}
class PhysicalEngine {
    constructor() {
        this._objects = [new Block(1, Math.pow(100, 0), 0, 2), new Block(1.5, Math.pow(100, 5), -1, 5), new Wall(0)];
        this._timeOffset = Date.now();
        setInterval(this.update.bind(this), PhysicalEngine._interval);
    }
    static get instance() {
        return PhysicalEngine._instance ?? (PhysicalEngine._instance = new this());
    }
    get objects() {
        return this._objects;
    }
    set onUpdate(value) {
        this._onUpdate = value;
    }
    isMovingTowards(object1, object2) {
        const delta = 1e-15;
        const distance = object2.getPosition() - object1.getPosition();
        const relativeVelocity = object1.getVelocity() - object2.getVelocity();
        const movementDiretion = Math.abs(distance) > delta ? Math.sign(distance) : 0;
        const velocityDiretion = Math.abs(relativeVelocity) > delta ? Math.sign(relativeVelocity) : 0;
        return movementDiretion == velocityDiretion;
        //return object1.distance(object2) > object1.distance(object2, 1e-15);
    }
    computeCollisionTime(object1, object2) {
        const resultVelocity = Math.abs(object1.getVelocity() - object2.getVelocity());
        const time = object1.distance(object2) / resultVelocity;
        return time;
    }
    getNearestCollision(objects, timeDelta) {
        let collision;
        for (let index1 = 0; index1 < objects.length; index1++) {
            const object1 = objects[index1];
            for (let index2 = 0; index2 < objects.length; index2++) {
                const object2 = objects[index2];
                const towards = this.isMovingTowards(object1, object2);
                if (index1 != index2 && towards) {
                    const time = this.computeCollisionTime(object1, object2);
                    if (time < timeDelta && (!collision || (time < collision.time))) {
                        collision = { object1: object1, object2: object2, time: time };
                    }
                }
            }
        }
        return collision;
    }
    tryToChangeProperites(target, velocity, position) {
        if (target instanceof Block) {
            target.setPosition(position);
            target.setVelocity(velocity);
        }
    }
    update() {
        const timeDelta = (Date.now() - this._timeOffset) / PhysicalEngine._timeUnit;
        let processedObjects = [];
        let velocities = new Map();
        let computed = false;
        for (; !computed;) {
            const nearestCollision = this.getNearestCollision(this._objects, timeDelta);
            if (nearestCollision) {
                const velocity1 = nearestCollision.object1.processCollision(nearestCollision.object2);
                const velocity2 = nearestCollision.object2.processCollision(nearestCollision.object1);
                const position1 = nearestCollision.object1.getPosition(nearestCollision.time);
                const position2 = nearestCollision.object2.getPosition(nearestCollision.time);
                this.tryToChangeProperites(nearestCollision.object1, velocity1, position1);
                this.tryToChangeProperites(nearestCollision.object2, velocity2, position2);
                if (nearestCollision.object1 instanceof Block) {
                    processedObjects.push(nearestCollision.object1);
                }
                if (nearestCollision.object2 instanceof Block) {
                    processedObjects.push(nearestCollision.object2);
                }
            }
            else {
                computed = true;
            }
        }
        this._objects.forEach((value) => {
            if (value instanceof Block && !processedObjects.includes(value)) {
                value.setPosition(value.getPosition(timeDelta));
            }
        });
        velocities.forEach((value, key) => {
            key.setVelocity(value);
        });
        this._timeOffset = Date.now();
        if (this._onUpdate) {
            this._onUpdate();
        }
    }
}
PhysicalEngine._interval = 10;
PhysicalEngine._timeUnit = 1000;
this.onload = () => {
    const canvas = document.getElementById("cnvs");
    const ctx = canvas.getContext("2d");
    const offset = new DOMPoint(500, 500);
    const scale = 100;
    if (ctx) {
        ctx.fillStyle = "black";
        PhysicalEngine.instance.onUpdate = () => {
            ctx.clearRect(0, 0, 2560, 1440);
            PhysicalEngine.instance.objects.forEach((object) => {
                if (object instanceof Block) {
                    ctx.fillRect(object.properties.position * scale + offset.x, offset.y - object.size * scale, object.size * scale, object.size * scale);
                }
                else if (object instanceof Wall) {
                    ctx.fillRect(object.position * scale + offset.x, 0, 1, 1440);
                }
                const first = PhysicalEngine.instance.objects[0];
                if (first instanceof Block) {
                    ctx.fillText(first.collisions.toString(), 20, 20);
                }
            });
        };
    }
};
//# sourceMappingURL=app.js.map