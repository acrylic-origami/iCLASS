import {PointBrush, OnsetBrush, OffsetBrush, RangeBrush, SeizureBrush} from '../Annotations';

export function view_name(annot) {
	switch(annot.constructor) {
		case OnsetBrush: return "Seizure Onset";
		case OffsetBrush: return "Seizure Offset";
		case SeizureBrush: return "Seizure";
		case RangeBrush: return "Time Range";
		case PointBrush: return "Point";
	}
}
export function data_name(annot) {
	switch(annot.constructor) {
		case OnsetBrush: return "onset";
		case OffsetBrush: return "offset";
		case SeizureBrush: return "seizure";
		case RangeBrush: return "range";
		case PointBrush: return "point";
	}
}