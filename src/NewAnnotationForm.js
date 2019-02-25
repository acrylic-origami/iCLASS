import React from 'react';
import { Form, Field } from 'react-final-form'

export default class extends React.Component {
	constructor(props) {
		super(props); // props: initial: [dataset, [start, range]]

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

	onSubmit = d => {
		// convert string to time
		const time = d.startTimeString.split(":");
		const newTime = new Date(this.props.startTime);
		newTime.setHours(time[0]);
		newTime.setMinutes(time[1]);
		newTime.setSeconds(time[2]);
		newTime.setMilliseconds(time[3]*10);
		this.props.handleSubmit({...d, startTime: newTime, is_new: this.state.is_new, annot_id: this.props.annot_id});
	}
	
	mustBeTime = value => (this.isTime(value)  ? "Error: Time must be in the format HH:MM:SS:mSmS (e.g. 23:59:59:99)" : undefined)

	isTime = value => {
		const time = value.split(":");
		var has_error = false;
		// check format of time
		time.map((time, i) => {
			if(isNaN(time)) has_error = true;
			else if (parseInt(time) < 0) has_error = true;
			else if (i == 0 && parseInt(time) > 23) has_error = true;
			else if (i !== 0 && i !== 3 && parseInt(time) > 59) has_error = true;
			else if (i == 3 && parseInt(time) > 99) has_error = true;
		});
		return time.length > 4 | has_error;
	}

  	componentWillMount() {
  		const start = this.props.startTime;

  		this.setState(state_ => ({
			startPlaceHolder: ((start.getHours() < 10) ? "0" : "") + start.getHours() + ":"
							  + ((start.getMinutes() < 10) ? "0" : "") + start.getMinutes() + ":"
							  + ((start.getSeconds() < 10) ? "0" : "") + start.getSeconds() + ":"
							  + (((start.getMilliseconds() / 10) < 10) ? "0" : "") + (start.getMilliseconds() / 10),
			is_new: (this.props.type == undefined)
		}));
  	}

	render = () =>
		<div>
			<div style={this.titleStyle}>
				{(this.props.type == undefined) ? 'New' : 'Edit'} Annotation
			</div>
			<Form
      			onSubmit={this.onSubmit}
      			initialValues={{ startTimeString: this.state.startPlaceHolder, type: (this.props.type == undefined) ? 'onset' : this.props.type, notes: (this.props.notes == undefined) ? '' : this.props.notes}}
      			render={({ handleSubmit, reset, form, submitting, pristine, values }) => (
      				<form onSubmit={handleSubmit}
      						 style={this.formStyle}>
          				<div style={this.sectionStyle}>
            				<div><label>Type</label></div>
            				<Field name="type" component="select">
              					<option value="onset">Seizure Onset</option>
              					<option value="offset">Seizure Offset</option>
              					<option value="patient">Patient Event</option>
            				</Field>
          				</div>
          				<Field name="startTimeString" validate={this.mustBeTime}>
            				{({ input, meta }) => (
            					<div style={this.sectionStyle}>
                					<div><label>Time</label></div>
               						<input {...input} type="text" placeholder="HH:MM:SS:MM" style={this.inputStyle} />
                						{meta.error && meta.touched && <span style={this.errorStyle}>{meta.error}</span>}
              					</div>
            				)}
          				</Field>
      					<div style={this.sectionStyle}>
            				<div><label>Notes</label></div>
            				<Field name="notes" component="textarea" placeholder="Notes" style={this.inputStyle} />
          				</div>
      					<div className="buttons" style={this.buttonWrapStyle}>
            				<button type="submit" disabled={submitting} style={this.buttonStyle}>
             					Save
            				</button>
           					<button
              					type="button"
             					onClick={this.props.handleCancel}
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
}