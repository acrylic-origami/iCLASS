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
	update_with_selection(selection) { /* abstract */ console.log(arguments); }
}
class PointBrush extends Annotation {
	constructor(start, notes, id = null) {
		super();
		
		this.start = start;
		this.notes = notes;
		this.id = id;
	}
	get_start() { return this.start; }
	update_with_selection(selection) { this.start = selection[0]; }
}
class OnsetBrush extends PointBrush {}
class OffsetBrush extends PointBrush {}
class RangeBrush extends Annotation {
	constructor(range, notes, id = null) {
		this.range = range;
		this.notes = notes;
		this.id = id;
	}
	get_start() { return this.range[0]; }
	get_end() { return this.range[1]; }
	update_with_selection(selection) { this.range = selection; }
}
class SeizureBrush extends RangeBrush {}

export {
	PointBrush, OnsetBrush, OffsetBrush, RangeBrush, SeizureBrush
};