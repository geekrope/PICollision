interface MaterialPointReadonly
{
	readonly impulse: number;
	readonly mass: number;
	readonly velocity: number;
	readonly position: number;
}

abstract class PhysicalObject
{
	public abstract getVelocity(): number;
	public abstract getPosition(timeDelta?: number): number;
	public abstract distance(object: PhysicalObject, timeDelta?: number): number;
	public abstract processCollision(object: PhysicalObject): number;
}

type Segment = { point1: number, point2: number };
type Collision = { object1: PhysicalObject, object2: PhysicalObject, time: number };
type CollisionsHandler = () => void;

class Utils
{
	public static getSegment(position: number, size: number): Segment
	{
		return { point1: position, point2: position + size }
	}
	public static getLength(segment: Segment)
	{
		return Math.abs(segment.point2 - segment.point1);
	}
	public static getCenter(segment: Segment): number
	{
		return (segment.point2 + segment.point1) / 2;
	}
	public static distanceBeetweenSegments(segment1: Segment, segment2: Segment): number
	{
		const center1 = Utils.getCenter(segment1);
		const center2 = Utils.getCenter(segment2);
		const radius1 = Utils.getLength(segment1) / 2;
		const radius2 = Utils.getLength(segment2) / 2;

		return Utils.getLength({ point1: center1, point2: center2 }) - (radius1 + radius2);
	}
	public static distanceBeetweenSegmentAndPoint(segment: Segment, point: number): number
	{
		return Utils.getLength({ point1: Utils.getCenter(segment), point2: point }) - Utils.getLength(segment) / 2;
	}
}

class MaterialPoint implements MaterialPointReadonly
{
	private _position: number;
	private _velocity: number;
	private _mass: number;

	public get impulse(): number
	{
		return this._velocity * this._mass;
	}
	public get mass(): number
	{
		return this._mass;
	}
	public get velocity(): number
	{
		return this._velocity;
	}
	public get position(): number
	{
		return this._position;
	}

	public set mass(value: number)
	{
		this._mass = value;
	}
	public set velocity(value: number)
	{
		this._velocity = value;
	}
	public set position(value: number)
	{
		this._position = value;
	}

	public constructor(mass: number, velocity: number, position: number)
	{
		this._mass = mass;
		this._velocity = velocity;
		this._position = position;
	}
}

class Block implements PhysicalObject
{
	private _properties: MaterialPoint;
	private _size: number;
	private _collisions: number;

	public get properties(): MaterialPointReadonly
	{
		return this._properties;
	}
	public get size(): number
	{
		return this._size;
	}
	public get collisions(): number
	{
		return this._collisions;
	}

	public getPosition(timeDelta?: number): number
	{
		if (timeDelta != undefined)
		{
			return this.properties.position + this.properties.velocity * timeDelta;
		}
		else
		{
			return this._properties.position;
		}
	}
	public setPosition(value: number): void
	{
		this._properties.position = value;
	}
	public getVelocity(): number
	{
		return this.properties.velocity;
	}
	public setVelocity(value: number): void
	{
		this._properties.velocity = value;
	}
	public distance(object: PhysicalObject, timeDelta?: number): number
	{
		if (object instanceof Block)
		{
			return Utils.distanceBeetweenSegments(Utils.getSegment(timeDelta != undefined ? this.getPosition(timeDelta) : this._properties.position, this._size), Utils.getSegment(timeDelta != undefined ? object.getPosition(timeDelta) : object.properties.position, object.size));
		}
		else if (object instanceof Wall)
		{
			return Utils.distanceBeetweenSegmentAndPoint(Utils.getSegment(timeDelta != undefined ? this.getPosition(timeDelta) : this._properties.position, this._size), object.position);
		}
		else
		{
			throw new TypeError("Unknown type");
		}
	}
	public processCollision(object: PhysicalObject): number
	{
		this._collisions++;

		if (object instanceof Block)
		{
			return (this._properties.impulse - object.properties.mass * this._properties.velocity + 2 * object.properties.impulse) / (this._properties.mass + object.properties.mass);
		}
		else if (object instanceof Wall)
		{
			return -this._properties.velocity;
		}
		else
		{
			throw new TypeError("Unknown type");
		}
	}

	public constructor(size: number, mass: number, velocity: number, position: number)
	{
		this._properties = new MaterialPoint(mass, velocity, position);
		this._size = size;
		this._collisions = 0;
	}
}

class Wall implements PhysicalObject
{
	private _position: number;

	public get position(): number
	{
		return this._position;
	}

	public getPosition(): number
	{
		return this._position;
	}
	public getVelocity(): number
	{
		return 0;
	}
	public distance(object: PhysicalObject, timeDelta?: number): number
	{
		if (object instanceof Block)
		{
			return object.distance(this, timeDelta);
		}
		else if (object instanceof Wall)
		{
			return object.position - this.position;
		}
		else
		{
			throw new TypeError("Unknown type");
		}
	}
	public processCollision(_object: PhysicalObject): number
	{
		return NaN;
	}

	public constructor(position: number)
	{
		this._position = position;
	}
}

class PhysicalEngine
{
	private static _instance: PhysicalEngine;
	private static readonly _interval: number = 10;
	private static readonly _timeUnit: number = 1000;

	private _objects: PhysicalObject[];
	private _timeOffset: number;
	private _onUpdate: (() => void) | undefined;

	public static get instance(): PhysicalEngine
	{
		return PhysicalEngine._instance ?? (PhysicalEngine._instance = new this());
	}

	public get objects(): PhysicalObject[]
	{
		return this._objects;
	}
	public set onUpdate(value: () => void)
	{
		this._onUpdate = value;
	}

	private isMovingTowards(object1: PhysicalObject, object2: PhysicalObject): boolean
	{
		const delta = 1e-15;
		const distance = object2.getPosition() - object1.getPosition();
		const relativeVelocity = object1.getVelocity() - object2.getVelocity();
		const movementDiretion = Math.abs(distance) > delta ? Math.sign(distance) : 0;
		const velocityDiretion = Math.abs(relativeVelocity) > delta ? Math.sign(relativeVelocity) : 0;

		return movementDiretion == velocityDiretion;

		//return object1.distance(object2) > object1.distance(object2, 1e-15);
	}
	private computeCollisionTime(object1: PhysicalObject, object2: PhysicalObject): number
	{
		const resultVelocity = Math.abs(object1.getVelocity() - object2.getVelocity());
		const time = object1.distance(object2) / resultVelocity;

		return time;
	}
	private getNearestCollision(objects: PhysicalObject[], timeDelta: number): Collision | undefined
	{
		let collision: Collision | undefined;

		for (let index1 = 0; index1 < objects.length; index1++)
		{
			const object1 = objects[index1];

			for (let index2 = 0; index2 < objects.length; index2++)
			{
				const object2 = objects[index2];
				const towards = this.isMovingTowards(object1, object2);

				if (index1 != index2 && towards)
				{
					const time = this.computeCollisionTime(object1, object2);

					if (time < timeDelta && (!collision || (time < collision.time)))
					{
						collision = { object1: object1, object2: object2, time: time };
					}
				}
			}
		}

		return collision;
	}
	private tryToChangeProperites(target: PhysicalObject, velocity: number, position: number): void
	{
		if (target instanceof Block)
		{
			target.setPosition(position);
			target.setVelocity(velocity);
		}
	}
	private update()
	{
		const timeDelta = (Date.now() - this._timeOffset) / PhysicalEngine._timeUnit;

		let processedObjects: Block[] = [];
		let velocities = new Map<Block, number>();
		let computed = false;

		for (; !computed;)
		{
			const nearestCollision = this.getNearestCollision(this._objects, timeDelta);

			if (nearestCollision)
			{
				const velocity1 = nearestCollision.object1.processCollision(nearestCollision.object2);
				const velocity2 = nearestCollision.object2.processCollision(nearestCollision.object1);

				const position1 = nearestCollision.object1.getPosition(nearestCollision.time);
				const position2 = nearestCollision.object2.getPosition(nearestCollision.time);

				this.tryToChangeProperites(nearestCollision.object1, velocity1, position1);
				this.tryToChangeProperites(nearestCollision.object2, velocity2, position2);

				if (nearestCollision.object1 instanceof Block)
				{
					processedObjects.push(nearestCollision.object1);
				}
				if (nearestCollision.object2 instanceof Block)
				{
					processedObjects.push(nearestCollision.object2);
				}
			}
			else
			{
				computed = true;
			}
		}

		this._objects.forEach((value) =>
		{
			if (value instanceof Block && !processedObjects.includes(value))
			{
				value.setPosition(value.getPosition(timeDelta));
			}
		});

		velocities.forEach((value, key) =>
		{
			key.setVelocity(value);
		});

		this._timeOffset = Date.now();

		if (this._onUpdate)
		{
			this._onUpdate();
		}
	}

	private constructor()
	{
		this._objects = [new Block(1, Math.pow(100, 0), 0, 2), new Block(1.5, Math.pow(100, 5), -1, 5), new Wall(0)];
		this._timeOffset = Date.now();

		setInterval(this.update.bind(this), PhysicalEngine._interval);
	}
}

this.onload = () =>
{
	const canvas = <HTMLCanvasElement>document.getElementById("cnvs");
	const ctx = canvas.getContext("2d");
	const offset = new DOMPoint(500, 500);
	const scale = 100;

	if (ctx)
	{
		ctx.fillStyle = "black";

		PhysicalEngine.instance.onUpdate = () =>
		{
			ctx.clearRect(0, 0, 2560, 1440);

			PhysicalEngine.instance.objects.forEach((object) =>
			{
				if (object instanceof Block)
				{
					ctx.fillRect(object.properties.position * scale + offset.x, offset.y - object.size * scale, object.size * scale, object.size * scale);
				}
				else if (object instanceof Wall)
				{
					ctx.fillRect(object.position * scale + offset.x, 0, 1, 1440);
				}

				const first = PhysicalEngine.instance.objects[0];

				if (first instanceof Block)
				{
					ctx.fillText(first.collisions.toString(), 20, 20);
				}
			})
		}
	}
}