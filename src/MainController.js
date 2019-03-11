import React from 'react';
import D3Controller from './d3Controller';
import AnnotatePopUp from './AnnotatePopUp';
import Annotation from './Annotation';

export default class extends React.Component {
	constructor(props) {
		super(props); // props: initial: [dataset, [start, range]]
		this.d3child = React.createRef();
		this.state = {
			is_editing: false,
			has_zoomed: true,
			zoom_times : [],
			// For point annotations
			screenPosY: 0,
			screenPosX: 0,
			type: "", 
			notes: "",
			annot_id: 0,
			is_new: false,
			is_annotating: false,
			startTime: null,
			endTime: null,
			annotations: [],
			newAnnotationId: 0,
			brushes: []

		};

		this.d3WrapStyle = {
			marginLeft: "300px"
		};

		this.brushWrapStyle = {
			position: "absolute",
			top: "0",
			left: "0",
			bottom: "0",
			width: "308px",
			borderRight: "1px solid #000",
			overflowX: "scroll",
		};

		this.brushInnerWrapStyle = {
			position: "relative"
		};

		this.buttonWrapStyle = {
			borderBottom: "1px solid #000"
		};

		this.buttonStyle = {
			display: "block",
			marginLeft: "auto",
			marginRight: "auto",
			marginTop: "30px",
			marginBottom: "25px"
		};

		this.mainStyle = {
			fontFamily: "sans-serif"
		};

		this.brushListMargin = {
			paddingBottom: "100px"
		};
	}
	
	onEditZoomToggle = () => this.setState(state_ => ({
		is_editing: !state_.is_editing
	}));

	// Should zoom to brush
	onBrushZoom = i => this.setState(state_ => {
		this.d3child.current.callZoom(state_.brushes[i].times);
	});

	// Opens new annotation pop up window
	openNewAnnotation = d => this.setState(state_ => {
		// do position logic
		return {
			screenPosY: d.y,
			screenPosX: d.x,
			is_annotating: true,
			annotStart: d.startTime,
			type: d.type, 
			notes: d.notes,
			annot_id: d.annot_id
		};
	});

	// Closes new annotation pop up window
	cancelAnnotation = () => this.setState(state_ => ({
		screenPosY: 0,
		screenPosX: 0,
		is_annotating: false,
		annotStart: null,
		type: undefined, 
		notes: undefined,
		annot_id: undefined
	}));

	// Saves results from new annotation form
	// AND updates brushes
	addAnnotation = d => {
		const newAnnotations = [].concat(this.state.annotations);
		if(d.is_new) {
			newAnnotations.push({startTime: d.startTime, type: d.type, notes: d.notes});
		} else {
			newAnnotations[d.annot_id].startTime = d.startTime;
			newAnnotations[d.annot_id].type = d.type;
			newAnnotations[d.annot_id].notes = d.notes;
		}
		
		newAnnotations.sort((a, b) => a.startTime - b.startTime);
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
		const newAnnotations = [].concat(this.state.annotations);
		d.map((data, index) => {
			newAnnotations[data.id].startTime = data.time;
		});
		newAnnotations.sort((a, b) => a.startTime - b.startTime);
		this.setState(state_ => ({
			annotations: newAnnotations
		}));
	};

	
	render = () => <div style={this.mainStyle}>
		<AnnotatePopUp
				startTime={this.state.annotStart}
				screenPosY={this.state.screenPosY}
				screenPosX={this.state.screenPosX}
				type={this.state.type}
				notes={this.state.notes}
				annot_id={this.state.annot_id}
				is_annotating={this.state.is_annotating}
				addAnnotation={this.addAnnotation}
				cancelAnnotation={this.cancelAnnotation}
			/>
		<div style={this.d3WrapStyle}>
			<D3Controller
				{...this.props}
				ref={this.d3child}
				is_editing={this.state.is_editing}
				updateAnnotation={this.onUpdateAnnotation}
				annotations={this.state.annotations}
				openNewAnnotationPopUp={this.openNewAnnotation}
				width={960}
				height={640}
				/>
		</div>
		<div style={this.brushWrapStyle}>
			<div style={this.brushInnerWrapStyle}>
				<div style={this.buttonWrapStyle}> 
					<button style={this.buttonStyle} className="edit-zoom-toggle" id="edit-zoom-toggle" type="button" onClick={this.onEditZoomToggle}>
						{this.state.is_editing ? 'Zoom/Pan' : 'Annotate'}
					</button>
				</div>
				<div className="brush-list" style={this.brushListMargin} id="brush-list">
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