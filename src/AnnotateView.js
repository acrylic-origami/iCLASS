import React from 'react';
import { Form, Field } from 'react-final-form'
import {view_name, data_name} from './Util/AnnotationTypeNames';
import {PointBrush, OnsetBrush, OffsetBrush, RangeBrush, SeizureBrush} from './Annotations';

export default class extends React.Component {
	constructor(props) {
		super(props);
		
		this.form = React.createRef();
		
		this.state = {
			startPlaceholder: "",
			is_new: false,
		};

		this.titleStyle = {
			textAlign: "center",
			paddingBottom: "15px"
		};

		this.inputStyle = {
			padding: "3px 5px",
    		fontSize: "16px",
    		border: "1px solid #ccc",
    		borderRadius: "3px",
    		width: "188px"
		};

		this.formStyle = {
			margin: "0"
		};

		this.sectionStyle = {
			paddingBottom: "10px"
		};

		this.buttonWrapStyle = {
			textAlign: "center"
		};

		this.buttonStyle = {
			marginLeft: "5px",
			marginRight: "5px"
		};

		this.errorStyle = {
			fontSize: "10px",
			color: "red",
			display: "block",
			width: "188px"
		};
	}
	
	// componentDidMount() {
	// 	const submit_event = document.createEvent('Event');
	// 	submit_event.initEvent('submit', true, true)
	// 	this.form.current.dispatchEvent(submit_event);
	// }

	onSubmit = (d) => {
		const AnnotationClass = (() => {
			switch(d.type) {
				case 'onset': return OnsetBrush;
				case 'offset': return OffsetBrush;
				case 'point': return PointBrush;
			}
		})();
		
		this.props.onSubmit(new AnnotationClass(
			this.props.annotation ? this.props.annotation.get_start() : this.props.startTime,
			this.props.annotating_at,
			this.props.annotation ? this.props.annotation.id : null
		));
	}

	render = () =>
		<div className='annotation-edit'>
			<div className='annotationBar' style={{ left: `${this.props.screenPosX}px` }}></div>
			<div className="annotation-menu" style={{ left: `${this.props.screenPosX}px` }}>
				<div>
					<div style={this.titleStyle}>
						{(this.props.annotation == null) ? 'New' : 'Edit'} Annotation
					</div>
					<Form
		      			onSubmit={this.onSubmit}
		      			initialValues={{ /* startTimeString: (this.props.annotation ? this.props.annotation.get_start() : this.props.startTime).toLocaleTimeString('en-GB') */ type: this.props.annotation ? data_name(this.props.annotation) : 'onset', notes: (this.props.annotation != null && this.props.annotation.notes) || '' }}
		      			render={({ handleSubmit, reset, form, submitting, pristine, values }) => (
		      				<form onSubmit={e => { e.preventDefault(); e.stopPropagation(); handleSubmit(e); }}
		      						 style={this.formStyle}
		      						 ref={this.form}>
		          				<div style={this.sectionStyle}>
		            				<div><label>Type</label></div>
		            				<Field name="type" component="select">
		              					<option value="onset">Seizure Onset</option>
		              					<option value="offset">Seizure Offset</option>
		              					<option value="point">Patient Event</option>
		            				</Field>
		          				</div>
		      					<div style={this.sectionStyle}>
		            				<div><label>Notes</label></div>
		            				<Field name="notes" component="textarea" placeholder="Notes" style={this.inputStyle} />
		          				</div>
		      					<div className="buttons" style={this.buttonWrapStyle}>
		            				<input type="submit" disabled={submitting} style={this.buttonStyle} value="Save" />
		           					<button
		              					type="button"
		             					onClick={this.props.onCancel}
		              					disabled={submitting}
		              					style={this.buttonStyle}
		            				>
		              					Cancel
		           					</button>
		          				</div>
		      				</form>
		      			)}
		      		/>
				</div>
			</div>
			<div className="annotation-overlay" onClick={this.props.onCancel}></div>
		</div>
}