import React from 'react';
import {Map} from 'immutable';
import D3Controller from './d3Controller';
import {view_name} from './Util/AnnotationTypeNames';

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
	onAnnotate = annotation => {
		if(annotation.id == null) {
			// new annotation
			this.setState(state_ => {
				const next_annotations = (() => {
					// merge annotations where necessary
					if(annotation instanceof OnsetBrush || annotation instanceof OffsetBrush) {
						const targets = state_.annotations.sort((a, b) => a.get_start() - b.get_start()).toList();
						if(annotation instanceof OnsetBrush) {
							// looking for the offset
							for(const target of targets) {
								if(targets.get_start() > annotation.get_start() && targets instanceof OffsetBrush) {
									const seizure_annotation = new SeizureBrush(
										[annotation.get_start(), target.get_start()],
										target.notes.concat(annotation.notes),
										state_.annotation_idx + 1
									);
									return next_annotations.delete(target.id)
									                       .set(state_.annotation_idx, seizure_annotation);
								}
							}
						}
						else {
							// looking for the onset
							for(const target of targets.reverse()) {
								if(target.get_start() < annotation.get_start() && target instanceof OnsetBrush) {
									const seizure_annotation = new SeizureBrush(
										[targets.get_start(), annotation.get_start()],
										target.notes.concat(annotation.notes),
										state_.annotation_idx + 1
									);
									return next_annotations.delete(target.id)
									                       .set(state_.annotation_idx, seizure_annotation);
								}
							}
						}
					}
					
					// fallthrough: tack the annotation onto the end
					annotation.set_id(state_.annotation_idx);
					return state_.annotations.set(state_.annotation_idx, annotation);
				})();
				
				return {
					annotation_idx: annotation_idx + 1,
					annotations: next_annotations
				};
			});
		}
		else {
			this.setState(state_ => ({
				annotations: state_.annotations.has(annotation.id) ? state_.annotations.set(annotation.id, annotation) : state_.annotations
			}));
		}
	};
	
	onAnnotationUpdate = annotation => this.setState(state_ => ({
		annotations: state_.has(state_.annotations.set())
	}));
	
	render = () => <div>
		<div className="d3wrap">
			<D3Controller
				dataset_meta={this.props.dataset_meta}
				is_editing={this.state.is_editing}
				annotations={this.state.annotations}
				annotating_id={this.state.annotating_id}
				onAnnotate={this.onAnnotate}
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
				<ul className="brush-list" id="brush-list">
					{this.state.annotations.toList().map((annot) =>
						<li
							className="annotation"
							key={"annot-" + index}
							onDoubleClick={() => this.setState({ annotating_id: annot.id })}>
							<h2>{view_name(annot)}</h2>
							<div className="time">{annot.get_start().toLocaleString()}</div>
							<div className="note">{annot.notes}</div>
						</li>
					)}
				</ul>
			</div>
		</div>
	</div>;
}