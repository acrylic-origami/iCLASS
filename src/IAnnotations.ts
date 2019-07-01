interface Annotation {
	id: ?number;
	notes: string[];
	set_id(id: number): void;
	get_start(): Date;
}
interface RangeBrush {
	constructor(range: [number, number], notes: string[], id: ?number = null)
	get_end(): Date;
}
interface SeizureBrush extends RangeBrush {}