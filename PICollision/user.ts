///<reference path="model.ts"/>
///<reference path="view.ts"/>

function resizeHandler(this: HTMLCanvasElement)
{
	this.width = innerWidth;
	this.height = innerHeight;
}
function scaleHandler(this: VisualEngine, event: MouseEvent)
{
	this.zoom(new DOMPoint(event.offsetX, event.offsetY));
}
function moveHandler(this: VisualEngine, event: MouseEvent)
{
	if (event.buttons == 1)
	{
		this.move(new DOMPoint(event.movementX, event.movementY));
	}
}
function updateView(visualEngine: VisualEngine, _physicalEngine: PhysicalEngine)
{
	visualEngine.refresh();
}
function tryParseNumber(value: string | null): number | undefined
{
	if (!value)
	{
		return undefined;
	}
	else
	{
		const asNumber = Number(value);

		return !isNaN(asNumber) ? asNumber : undefined;
	}
}
function getUrlParams(): { mass1: number | undefined, mass2: number | undefined, size1: number | undefined, size2: number | undefined }
{
	const query = new URL(window.location.href).searchParams;

	const mass1 = query.get("m1");
	const mass2 = query.get("m2");
	const size1 = query.get("s1");
	const size2 = query.get("s2");

	return { mass1: tryParseNumber(mass1), mass2: tryParseNumber(mass2), size1: tryParseNumber(size1), size2: tryParseNumber(size2) };
}

this.onload = () =>
{
	const canvas = <HTMLCanvasElement>document.getElementById("cnvs");
	const context = canvas.getContext("2d");
	const margin = 50;
	const offset = new DOMPoint(margin, innerHeight - margin);
	const scale = 100;
	const params = getUrlParams();

	if (canvas && context)
	{
		const visualEngine = new VisualEngine2D(context, scale, offset);

		const firstBlock = new Block(params.size1 ?? 1, params.mass1 ?? Math.pow(100, 0), 0, 2);
		const physicalEngine = new PhysicalEngine([firstBlock, new Block(params.size2 ?? 1.5, params.mass2 ?? Math.pow(100, 5), -1, 5), new Wall(0)]);
		const visualObjects: VisualObject[] = [];

		physicalEngine.objects.forEach((value) =>
		{
			visualObjects.push(value);
		});

		visualObjects.push(new HorizontalAxis(0), new CollisionsCount(firstBlock));

		physicalEngine.onUpdate = () =>
		{
			updateView(visualEngine, physicalEngine);
		}

		visualEngine.addRange(visualObjects);

		resizeHandler.bind(canvas)();
		window.addEventListener("resize", resizeHandler.bind(canvas));
		canvas.addEventListener("dblclick", scaleHandler.bind(visualEngine));
		canvas.addEventListener("mousemove", moveHandler.bind(visualEngine));
	}
}