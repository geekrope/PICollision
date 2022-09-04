"use strict";
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
//# sourceMappingURL=view.js.map