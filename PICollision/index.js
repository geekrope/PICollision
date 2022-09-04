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
///<reference types="three"/>
///<reference path="model.ts"/>
class VisualEngine {
}
class VisualEngine2D {
    constructor(context, scale, offset) {
        this._context = context;
        this._scale = scale;
        this._offset = offset;
        this._zoomed = false;
        this._objects = [];
    }
    get _thickness() { return 2; }
    get _font() { return "16px Courier New"; }
    get _multiplier() { return 2; }
    getMatrix(scale, offset) {
        return new DOMMatrix([scale, 0, 0, scale, offset.x, offset.y]);
    }
    getZoomOffset(fixedPoint, currentMatrix, nextMatrix) {
        const originalPoint = this.restore(fixedPoint, currentMatrix);
        const transformedPoint = this.transform(originalPoint, nextMatrix);
        return new DOMPoint(fixedPoint.x - transformedPoint.x, fixedPoint.y - transformedPoint.y);
    }
    clear() {
        this._context.fillStyle = "black";
        this._context.fillRect(0, 0, this._context.canvas.width, this._context.canvas.height);
    }
    drawWall(wall) {
        const distance = 50;
        const length = 30;
        const angle = Math.PI / 4;
        const height = this._context.canvas.height;
        const wallPosition = wall.position * this._scale + this._offset.x;
        this._context.strokeStyle = "white";
        this._context.lineWidth = this._thickness;
        this._context.beginPath();
        this._context.moveTo(wallPosition, 0);
        this._context.lineTo(wallPosition, height);
        this._context.stroke();
        this._context.beginPath();
        this._context.lineWidth = 1;
        for (let y = 0; y < height; y += distance) {
            this._context.moveTo(wallPosition, y);
            this._context.lineTo(wallPosition - length * Math.sin(angle), length * Math.cos(angle) + y);
        }
        this._context.stroke();
    }
    drawBlock(block) {
        const size = block.size * this._scale;
        const position = new DOMPoint(block.properties.position * this._scale + this._offset.x, this._offset.y - size);
        this._context.fillStyle = this._context.createLinearGradient(position.x, position.y, position.x + size, position.y + size);
        this._context.fillStyle.addColorStop(0, "#434343");
        this._context.fillStyle.addColorStop(1, "#000000");
        this._context.strokeStyle = "white";
        this._context.lineWidth = this._thickness;
        this._context.fillRect(position.x, position.y, size, size);
        this._context.strokeRect(position.x, position.y, size, size);
        this._context.fillStyle = "white";
        this._context.font = this._font;
        this._context.textBaseline = "bottom";
        this._context.textAlign = "center";
        this._context.fillText(`100^${Math.log(block.properties.mass) / Math.log(100)} kg`, position.x + size / 2, position.y);
    }
    drawAxis(axis) {
        const y = this._offset.y - axis.y * this._scale;
        this._context.strokeStyle = "white";
        this._context.lineWidth = this._thickness;
        this._context.beginPath();
        this._context.moveTo(this._offset.x, y);
        this._context.lineTo(this._context.canvas.width, y);
        this._context.stroke();
    }
    drawText(count) {
        const margin = 5;
        this._context.fillStyle = "white";
        this._context.font = this._font;
        this._context.textBaseline = "top";
        this._context.textAlign = "end";
        this._context.fillText(count.text, this._context.canvas.width - margin, margin);
    }
    get scale() {
        return this._scale;
    }
    get offset() {
        return this._offset;
    }
    zoom(relativePoint) {
        const currentScale = this._scale;
        const nextScale = this._zoomed ? this._scale / this._multiplier : this._scale * this._multiplier;
        this._scale = nextScale;
        this._zoomed = !this._zoomed;
        if (relativePoint) {
            this.move(this.getZoomOffset(relativePoint, this.getMatrix(currentScale, this._offset), this.getMatrix(nextScale, this._offset)));
        }
    }
    move(value) {
        this._offset.x += value.x;
        this._offset.y += value.y;
    }
    add(...value) {
        this._objects = this._objects.concat(value);
    }
    addRange(value) {
        this._objects = this._objects.concat(value);
    }
    refresh() {
        this.clear();
        this._objects.forEach((object) => {
            if (object instanceof Wall) {
                this.drawWall(object);
            }
            else if (object instanceof Block) {
                this.drawBlock(object);
            }
            else if (object instanceof HorizontalAxis) {
                this.drawAxis(object);
            }
            else if (object instanceof CollisionsCount) {
                this.drawText(object);
            }
            else {
                throw new TypeError("Unknown type");
            }
        });
    }
    transform(point, matrix) {
        return new DOMPoint(point.x * matrix.a + point.y * matrix.c + matrix.e, point.x * matrix.b + point.y * matrix.d + matrix.f);
    }
    restore(point, matrix) {
        const y = (point.x * matrix.b - point.y * matrix.a + matrix.a * matrix.f - matrix.b * matrix.e) / (matrix.b * matrix.c - matrix.a * matrix.d);
        const x = (point.x - matrix.e - matrix.c * y) / matrix.a;
        return new DOMPoint(x, y);
    }
}
class VisualEngine3D {
    constructor(scene, camera, renderer) {
        this._scene = scene;
        this._camera = camera;
        this._renderer = renderer;
        this._objects = new Map();
    }
    //private get gridSize(): number { return 1; }
    getBlock(block) {
        const box = new THREE.BoxGeometry(block.size, block.size, block.size);
        const material = new THREE.MeshBasicMaterial({ color: `#${Math.floor(Math.random() * 255).toString(16)}${Math.floor(Math.random() * 255).toString(16)}${Math.floor(Math.random() * 255).toString(16)}` });
        return new THREE.Mesh(box, material);
    }
    getBlockPosition(block) {
        return new THREE.Vector3(block.getPosition(), block.size / 2, block.size / 2);
    }
    get domElement() {
        return this._renderer.domElement;
    }
    zoom(_relativePoint) {
    }
    move(_value) {
    }
    refresh() {
        this._objects.forEach((mesh, object) => {
            if (object instanceof Block) {
                const box = mesh;
                const position = this.getBlockPosition(object);
                box.position.set(position.x, position.y, position.z);
            }
        });
        this._renderer.render(this._scene, this._camera);
    }
    add(...value) {
        this.addRange(value);
    }
    addRange(value) {
        value.forEach((object) => {
            let mesh;
            if (object instanceof Block) {
                mesh = this.getBlock(object);
            }
            else if (object instanceof Wall) {
                mesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.Material());
            }
            else if (object instanceof HorizontalAxis) {
                mesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.Material());
            }
            else if (object instanceof CollisionsCount) {
                mesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.Material());
            }
            else {
                throw new TypeError("Unknown type");
            }
            this._objects.set(object, mesh);
            this._scene.add(mesh);
        });
    }
}
///<reference types="three"/>
///<reference path="model.ts"/>
///<reference path="view.ts"/>
function resizeHandler() {
    this.width = innerWidth;
    this.height = innerHeight;
}
function scaleHandler(event) {
    this.zoom(new DOMPoint(event.offsetX, event.offsetY));
}
function moveHandler(event) {
    if (event.buttons == 1) {
        this.move(new DOMPoint(event.movementX, event.movementY));
    }
}
function updateView(visualEngine, _physicalEngine) {
    visualEngine.refresh();
}
function tryParseNumber(value) {
    if (!value) {
        return undefined;
    }
    else {
        const asNumber = Number(value);
        return !isNaN(asNumber) ? asNumber : undefined;
    }
}
function getUrlParams() {
    const query = new URL(window.location.href).searchParams;
    const mass1 = query.get("m1");
    const mass2 = query.get("m2");
    const size1 = query.get("s1");
    const size2 = query.get("s2");
    return { mass1: tryParseNumber(mass1), mass2: tryParseNumber(mass2), size1: tryParseNumber(size1), size2: tryParseNumber(size2) };
}
this.onload = () => {
    const canvas = document.getElementById("cnvs");
    const context = canvas.getContext("2d");
    //const margin = 50;
    //const offset = new DOMPoint(margin, innerHeight - margin);
    //const scale = 100;
    const params = getUrlParams();
    if (canvas && context) {
        //const visualEngine = new VisualEngine2D(context, scale, offset);
        const renderer = new THREE.WebGLRenderer();
        const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
        const visualEngine = new VisualEngine3D(new THREE.Scene(), camera, renderer);
        camera.position.y = 1;
        camera.position.z = 5;
        camera.rotation.x = -0.2;
        renderer.setSize(innerWidth, innerHeight);
        const firstBlock = new Block(params.size1 ?? 1, params.mass1 ?? Math.pow(100, 0), 0, 2);
        const physicalEngine = new PhysicalEngine([firstBlock, new Block(params.size2 ?? 1.5, params.mass2 ?? Math.pow(100, 5), -1, 5), new Wall(0)]);
        const visualObjects = [];
        physicalEngine.objects.forEach((value) => {
            visualObjects.push(value);
        });
        visualObjects.push(new HorizontalAxis(0), new CollisionsCount(firstBlock));
        physicalEngine.onUpdate = () => {
            updateView(visualEngine, physicalEngine);
        };
        visualEngine.addRange(visualObjects);
        resizeHandler.bind(canvas)();
        window.addEventListener("resize", resizeHandler.bind(canvas));
        canvas.addEventListener("dblclick", scaleHandler.bind(visualEngine));
        canvas.addEventListener("mousemove", moveHandler.bind(visualEngine));
        document.body.appendChild(visualEngine.domElement);
    }
};
//# sourceMappingURL=index.js.map