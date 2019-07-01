import {PointBrush, OnsetBrush, OffsetBrush, RangeBrush, SeizureBrush} from '../Annotations';

export function group_point_annotations(annotations) {
	// group matching onset and offset annotations
	let latest_onset = null;
	const ret = [];
	annotations = annotations.sort((a, b) => a.get_start() - b.get_start());
	for(const annot of annotations) {
		if(annot instanceof OffsetBrush && latest_onset != null) {
			ret.splice(latest_onset[1], 1, [latest_onset[0], annot]);
			latest_onset = null;
		}
		else {
			ret.push(annot);
			if(annot instanceof OnsetBrush)
				latest_onset = [annot, ret.length - 1];
		}
	}
	return ret;
}