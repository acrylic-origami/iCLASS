import React from 'react';
import {Map} from 'immutable';
import { Link } from "react-router-dom";
import D3Controller from './d3Controller';
import {view_name, data_name} from './Util/AnnotationTypeNames';

import {PointBrush, OnsetBrush, OffsetBrush, RangeBrush, SeizureBrush} from './Annotations';

export default class extends React.Component {
	constructor(props) {
		super(props); // props: initial: [dataset, [start, range]]
		this.state = {
			is_editing: false,
			d3_tf: null,
			
			annotation_idx: 0,
			annotations: new Map(),
			
			annotating_id: null,
			annotating_nonce: 0,
			
			annotation_preview_id: null,
			annotation_preview_nonce: 0
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
					// fallthrough: tack the annotation onto the end
					annotation.set_id(state_.annotation_idx);
					// debugger;
					return state_.annotations.set(state_.annotation_idx, annotation);
				})();
				return {
					annotation_idx: state_.annotation_idx + 1,
					annotations: next_annotations
				};
			});
		}
		else {
			this.setState(state_ => console.log(annotation, state_.annotations.get(annotation.id)) || ({
				annotations: state_.annotations.has(annotation.id) ? state_.annotations.set(annotation.id, annotation) : state_.annotations
			}));
		}
	};
	
	onAnnotationZoomTo = e => {
		// TODO check if this is handleable by React Router
		const annotation_id = parseInt(document.location.hash.slice(1));
		this.setState(state_ => ({
			annotation_preview_id: annotation_id,
			annotation_preview_nonce: state_.annotation_preview_nonce + 1
		}))
		
	}
	
	onAnnotationSelect = e => {
		this.setState(state_ => ({
			annotating_id: parseInt((new URL(e.target.href)).hash.slice[1]),
			annotating_nonce: state_.annotating_nonce + 1
		}));
	}
	
	// onAnnotationUpdate = annotation => this.setState(state_ => ({
	// 	annotations: state_.has(state_.annotations.set()) // TODO
	// }));
	
	onZoom = tf => this.setState({ d3_tf: tf });
	
	render = () => <div>
		<div className="d3wrap">
			<D3Controller
				dataset_meta={this.props.dataset_meta}
				is_editing={this.state.is_editing}
				annotations={this.state.annotations}
				
				annotating_id={this.state.annotating_id}
				annotating_nonce={this.state.annotating_id}
				
				annotation_preview_id={this.state.annotation_preview_id}
				annotation_preview_nonce={this.state.annotation_preview_nonce}
				
				onAnnotate={this.onAnnotate}
				tf={this.state.d3_tf}
				onZoom={this.onZoom}
				width={960}
				height={640}
				/>
		</div>
		<div className="brushWrap">
			<div className="brushInnerWrap">
				<div className="buttonWrap">
					<Link to={"/" + this.props.patientID}>back</Link>
					<button className="edit-zoom-toggle" id="edit-zoom-toggle" type="button" onClick={this.onEditZoomToggle}>
						{this.state.is_editing ? 'Zoom/Pan' : 'Annotate'}
					</button>
				</div>
				<ul className="brush-list" id="brush-list">
					{(() => {
						const sorted_annotations = this.state.annotations.sort((a, b) => a.get_start() - b.get_start()).toList();
						return sorted_annotations.map((annot, i) =>
							<li
								className={`annotation group ${data_name(annot)} ${
									(
										i > 0 && annot instanceof OffsetBrush && sorted_annotations.get(i - 1) instanceof OnsetBrush || 
										i < sorted_annotations.size && annot instanceof OnsetBrush && sorted_annotations.get(i + 1) instanceof OffsetBrush
									) ? 'grouped' : ''
								}`}
								key={"annot-" + i}
								onDoubleClick={() => this.setState({ annotating_id: annot.id })}>
								<a href={`#${annot.id}`} onClick={this.onAnnotationZoomTo} onDoubleClick={this.onAnnotationSelect}>
									<div className="time">{annot.get_start().toLocaleString()}</div>
									<h2>{view_name(annot)}</h2>
									<div className="note">{annot.notes}</div>
								</a>
							</li>
						);
					})()}
				</ul>
			</div>
		</div>
	</div>;
}