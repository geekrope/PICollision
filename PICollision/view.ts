///<reference path="model.ts"/>

abstract class VisualEngine
{
	public abstract zoom(relativePoint?: DOMPoint): void;
	public abstract move(value: DOMPoint): void;
	public abstract refresh(): void;
	public abstract add(...value: VisualObject[]): void;
	public abstract addRange(value: VisualObject[]): void;
}

type VisualObject = PhysicalObject | HorizontalAxis | CollisionsCount;

class VisualEngine2D implements VisualEngine
{
	private _context: CanvasRenderingContext2D;
	private _scale: number;
	private _offset: DOMPoint;
	private _zoomed: boolean;
	private _objects: VisualObject[];

	private get _thickness(): number { return 2; }
	private get _font(): string { return "16px Courier New"; }
	private get _multiplier(): number { return 2; }

	private getMatrix(scale: number, offset: DOMPoint)
	{
		return new DOMMatrix([scale, 0, 0, scale, offset.x, offset.y]);
	}
	private getZoomOffset(fixedPoint: DOMPoint, currentMatrix: DOMMatrix, nextMatrix: DOMMatrix): DOMPoint
	{
		const originalPoint = this.restore(fixedPoint, currentMatrix);
		const transformedPoint = this.transform(originalPoint, nextMatrix);

		return new DOMPoint(fixedPoint.x - transformedPoint.x, fixedPoint.y - transformedPoint.y);
	}
	private clear(): void
	{
		this._context.fillStyle = "black";
		this._context.fillRect(0, 0, this._context.canvas.width, this._context.canvas.height);
	}
	private drawWall(wall: Wall): void
	{
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

		for (let y = 0; y < height; y += distance)
		{
			this._context.moveTo(wallPosition, y);
			this._context.lineTo(wallPosition - length * Math.sin(angle), length * Math.cos(angle) + y);
		}

		this._context.stroke();
	}
	private drawBlock(block: Block): void
	{
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
	private drawAxis(axis: HorizontalAxis): void
	{
		const y = this._offset.y - axis.y * this._scale;

		this._context.strokeStyle = "white";
		this._context.lineWidth = this._thickness;

		this._context.beginPath();
		this._context.moveTo(this._offset.x, y);
		this._context.lineTo(this._context.canvas.width, y);
		this._context.stroke();
	}
	private drawText(count: CollisionsCount): void
	{
		const margin = 5;

		this._context.fillStyle = "white";
		this._context.font = this._font;
		this._context.textBaseline = "top";
		this._context.textAlign = "end";

		this._context.fillText(count.text, this._context.canvas.width - margin, margin);
	}

	public get scale(): number
	{
		return this._scale;
	}
	public get offset(): DOMPointReadOnly
	{
		return this._offset;
	}

	public zoom(relativePoint?: DOMPoint)
	{
		const currentScale = this._scale;
		const nextScale = this._zoomed ? this._scale / this._multiplier : this._scale * this._multiplier;

		this._scale = nextScale;
		this._zoomed = !this._zoomed;

		if (relativePoint)
		{
			this.move(this.getZoomOffset(relativePoint, this.getMatrix(currentScale, this._offset), this.getMatrix(nextScale, this._offset)));
		}
	}
	public move(value: DOMPoint)
	{
		this._offset.x += value.x;
		this._offset.y += value.y;
	}

	public add(...value: VisualObject[]): void
	{
		this._objects = this._objects.concat(value);
	}
	public addRange(value: VisualObject[]): void
	{
		this._objects = this._objects.concat(value);
	}
	public refresh(): void
	{
		this.clear();

		this._objects.forEach((object: VisualObject) =>
		{
			if (object instanceof Wall)
			{
				this.drawWall(object);
			}
			else if (object instanceof Block)
			{
				this.drawBlock(object);
			}
			else if (object instanceof HorizontalAxis)
			{
				this.drawAxis(object);
			}
			else if (object instanceof CollisionsCount)
			{
				this.drawText(object);
			}
			else
			{
				throw new TypeError("Unknown type");
			}
		})
	}
	public transform(point: DOMPoint, matrix: DOMMatrix): DOMPoint
	{
		return new DOMPoint(point.x * matrix.a + point.y * matrix.c + matrix.e, point.x * matrix.b + point.y * matrix.d + matrix.f);
	}
	public restore(point: DOMPoint, matrix: DOMMatrix): DOMPoint
	{
		const y = (point.x * matrix.b - point.y * matrix.a + matrix.a * matrix.f - matrix.b * matrix.e) / (matrix.b * matrix.c - matrix.a * matrix.d);
		const x = (point.x - matrix.e - matrix.c * y) / matrix.a;
		return new DOMPoint(x, y);
	}

	public constructor(context: CanvasRenderingContext2D, scale: number, offset: DOMPoint)
	{
		this._context = context;
		this._scale = scale;
		this._offset = offset;
		this._zoomed = false;
		this._objects = [];
	}
}