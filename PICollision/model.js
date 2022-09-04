"use strict";
class PhysicalObject {
}
class HorizontalAxis {
    constructor(y) {
        this._y = y;
    }
    get y() {
        return this._y;
    }
}
class CollisionsCount {
    constructor(source) {
        this._source = source;
    }
    get text() {
        return `COLLISIONS: ${this._source.collisions}`;
    }
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
    constructor(objects) {
        this._objects = objects;
        this._timeOffset = Date.now();
        setInterval(this.update.bind(this), PhysicalEngine._interval);
    }
    static get _interval() { return 10; }
    static get _timeUnit() { return 1000; }
    static get _epsilon() { return 1e-15; }
    get objects() {
        return this._objects;
    }
    set onUpdate(value) {
        this._onUpdate = value;
    }
    isMovingTowards(object1, object2) {
        const distance = object2.getPosition() - object1.getPosition();
        const relativeVelocity = object1.getVelocity() - object2.getVelocity();
        const movementDiretion = Math.abs(distance) > PhysicalEngine._epsilon ? Math.sign(distance) : 0;
        const velocityDiretion = Math.abs(relativeVelocity) > PhysicalEngine._epsilon ? Math.sign(relativeVelocity) : 0;
        return movementDiretion == velocityDiretion;
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
    invokeUpdateEvent() {
        if (this._onUpdate) {
            this._onUpdate();
        }
    }
    updatePositions(processedObjects, timeDelta) {
        this._objects.forEach((value) => {
            if (value instanceof Block && !processedObjects.includes(value)) {
                value.setPosition(value.getPosition(timeDelta));
            }
        });
    }
    computeCollision(collision, target) {
        switch (target) {
            case 0:
                return { position: collision.object1.getPosition(collision.time), velocity: collision.object1.processCollision(collision.object2) };
            case 1:
                return { position: collision.object2.getPosition(collision.time), velocity: collision.object2.processCollision(collision.object1) };
            default:
                throw new Error("Not implemeneted");
        }
    }
    processCollisions(timeDelta) {
        let processedObjects = [];
        let computed = false;
        const response = (object, response) => {
            if (object instanceof Block) {
                object.setPosition(response.position);
                object.setVelocity(response.velocity);
            }
        };
        for (; !computed;) {
            const nearestCollision = this.getNearestCollision(this._objects, timeDelta);
            if (nearestCollision) {
                const properties1 = this.computeCollision(nearestCollision, 0);
                const properties2 = this.computeCollision(nearestCollision, 1);
                response(nearestCollision.object1, properties1);
                response(nearestCollision.object2, properties2);
                processedObjects.push(nearestCollision.object1, nearestCollision.object2);
            }
            else {
                computed = true;
            }
        }
        return processedObjects;
    }
    update() {
        const timeDelta = (Date.now() - this._timeOffset) / PhysicalEngine._timeUnit;
        const velocities = new Map();
        const processedObjects = this.processCollisions(timeDelta);
        this.updatePositions(processedObjects, timeDelta);
        velocities.forEach((value, key) => {
            key.setVelocity(value);
        });
        this._timeOffset = Date.now();
        this.invokeUpdateEvent();
    }
}
//# sourceMappingURL=model.js.map