import React from 'react';
import {Map} from 'immutable';
import D3Controller from './d3Controller';
import AnnotatePopUp from './AnnotatePopUp';
import Annotation from './Annotation';

export default class extends React.Component {
	constructor(props) {
		super(props); // props: initial: [dataset, [start, range]]
		this.state = {
			is_editing: false,
			annotation_idx: 0,
			annotations: new Map(),
			annotating_id: null
		};
	}
	
	onEditZoomToggle = () => this.setState(state_ => ({
		is_editing: !state_.is_editing
	}));

	// Saves results from new annotation form
	// AND updates brushes
	addAnnotation = d => {
		const newAnnotations = this.state.annotations;
		if(d.is_new) {
			newAnnotations.push({startTime: d.startTime, type: d.type, notes: d.notes});
		} else {
			newAnnotations[d.annot_id].startTime = d.startTime;
			newAnnotations[d.annot_id].type = d.type;
			newAnnotations[d.annot_id].notes = d.notes;
		}
		
		newAnnotations.sort((a, b) => a.startTime - b.startTime);
		this.annotationsToBrushes(newAnnotations);
		this.setState(state_ => ({
			annotations: newAnnotations,
			screenPosY: 0,
			screenPosX: 0,
			is_annotating: false,
			startTime: null,
			endTime: null,
			newAnnotationId: state_.newAnnotationId + 1
		}));
	};

	// Updates the start times of annotations that were edited via the brushes
	onUpdateAnnotation = d => {
		const newAnnotations = this.state.annotations;
		d.map((data, index) => {
			newAnnotations[data.id].startTime = data.time;
		});
		this.setState(state_ => ({
			annotations: newAnnotations
		}));
	};

	onNewAnnotation = annotation => this.setState(state_ => {
		annotation.set_id(state_.annotation_idx);
		return {
			annoation_idx: annotation_idx + 1,
			annotations: state_.annotations.set(annotation_idx, annotation)
		};
	});
	
	onAnnotationUpdate = annotation => this.setState(state_ => ({
		annotations: state_.has(state_.annotations.set())
	}));

	// Converts annotations to brushes, ie checks for onset/offset pairs
	annotationsToBrushes = annots => {
		// creates an array of brushes combining onsets and offsets where possible
		const newBrushes = [];
		var lastOnsetTime = null;
		var lastOnsetId = null;
		annots.map((data, index) => {
			if(lastOnsetTime != null) { // looking for seizure
				if(data.type == "offset") {
					// found seizure
					newBrushes.push({
										type: "range",
										times: [lastOnsetTime, data.startTime], // set brush to have times [last onset, this offset]
										ids: [lastOnsetId, index], // this one is debatable I guess
										titles: ["Seizure Onset", "Seizure Offset"]
									});
					lastOnsetTime = null;
				} else if (data.type == "onset") {
					// found new onset
					newBrushes.push({
										type: "point",
										times: [lastOnsetTime, 
												new Date(lastOnsetTime).setSeconds(lastOnsetTime.getSeconds() + 2)],
										ids: [lastOnsetId],
										titles: ["Seizure Onset", ""]
									});
					// update lastOnsetTime
					lastOnsetTime = data.startTime;
					lastOnsetId = index;
				} else {
					// found patient data
					newBrushes.push({
										type: "point",
										times: [data.startTime, 
												new Date(data.startTime).setSeconds(data.startTime.getSeconds() + 2)],
										ids: [index],
										titles: ["Patient Event", ""]
									});
				}
			} else if(data.type == "onset") {
				// set new onset
				lastOnsetTime = data.startTime;
				lastOnsetId = index;
			} else {
				// add lonely offset or patient data
				newBrushes.push({
									type: "point",
									times: [data.startTime, 
											new Date(data.startTime).setSeconds(data.startTime.getSeconds() + 2)],
									ids: [index],
									titles: [(data.type == "offset") ? "Seizure Offset" : "Patient Event", ""]
								});
			}
			if(index == annots.length - 1 && lastOnsetTime != null) {
				// add lonely onset
				newBrushes.push({
									type: "point",
									times: [data.startTime, 
											new Date(data.startTime).setSeconds(data.startTime.getSeconds() + 2)],
									ids: [index],
									titles: ["Seizure Onset", ""]
								});
			}
		});
		// update brushes state, which will affect d3 controller
		this.setState(state_ => ({
			brushes: newBrushes
		}));
	};

	
	render = () => <div>
		<div className="d3wrap">
			<D3Controller
				is_editing={this.state.is_editing}
				annotations={this.state.annotations}
				annotating_id={this.state.annotating_id}
				onAnnotationUpdate={this.onAnnotationUpdate}
				onNewAnnotation={this.onNewAnnotation}
				width={960}
				height={640}
				/>
		</div>
		<div className="brushWrap">
			<div className="brushInnerWrap">
				<div className="buttonWrap"> 
					<button className="edit-zoom-toggle" id="edit-zoom-toggle" type="button" onClick={this.onEditZoomToggle}>
						{this.state.is_editing ? 'Zoom/Pan' : 'Annotate'}
					</button>
				</div>
				<div className="brush-list" id="brush-list">
					<div className="annotationList">
						{this.state.annotations.map((annot, index) =>
							<Annotation
								key={"annot-" + index}
								time={annot.startTime}
								type={annot.type}
								notes={annot.notes}
								annot_id={index}
								openNewAnnotationPopUp={this.openNewAnnotation}
							/>
						)}
					</div>
				</div>
			</div>
		</div>
	</div>;
}