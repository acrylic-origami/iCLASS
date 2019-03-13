/*
interface Annotation {
	id: ?int;
	notes: string[];
	set_id(id: int): void;
	get_start(): Date;
}
interface RangeBrush {
	constructor(range: [int, int], notes: string[], id: ?int = null)
	get_end(): Date;
}
interface SeizureBrush extends RangeBrush {}
*/

class Annotation {
	set_id(id) { this.id = id; }
	get_start() { /* abstract */ }
}
export class PointBrush {
	constructor(start, notes, id = null) {
		this.start = start;
		this.notes = notes;
		this.id = id;
	}
	get_start() { return this.start; }
}
export class OnsetBrush extends PointAnnotation {}
export class OffsetBrush extends PointAnnotation {}
export class RangeBrush extends Annotation {
	constructor(range, notes, id = null) {
		this.range = range;
		this.notes = notes;
		this.id = id;
	}
	get_start() { return this.range[0]; }
	get_end() { return this.range[1]; }
}
export class SeizureBrush extends RangeBrush {}
