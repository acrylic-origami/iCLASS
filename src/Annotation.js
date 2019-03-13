import React from 'react';

export default class extends React.Component {
	constructor(props) {
		super(props); // props: initial: [dataset, [start, range]]
	}
	
	// convert the type of annotation to a string title
	typeToString = type => {
		switch(type) {
			case("onset"):
				return "Seizure Onset";
				break;
			case("offset"):
				return "Seizure Offset";
				break;
			case("patient"):
				return "Patient Event";
				break;
		}
	};

	timeToString = time => {
		return ((new Date(time)).getHours()%12) + ":"
						+ (((new Date(time)).getMinutes() < 10) ? '0' : '') + (new Date(time)).getMinutes() + ":"
						+ (((new Date(time)).getSeconds() < 10) ? '0' : '') + (new Date(time)).getSeconds() + ":"
						+ (((new Date(time)).getMilliseconds() < 10) ? '0' : '') + ((new Date(time)).getMilliseconds()/10 - ((new Date(time)).getMilliseconds()%10)/10);
	};

	openAnnotation = e => { 
		this.props.openNewAnnotationPopUp({
			x: 308,
			y: e.screenY - 150,
			startTime: this.props.time,
			type: this.props.type,
			notes: this.props.notes,
			annot_id: this.props.annot_id
		});
	};

	render = () =>
		<div>
			<div className="annotation" onDoubleClick={this.openAnnotation.bind(this)}>
				<h2>
					{this.typeToString(this.props.type)}
				</h2>
				<div className="time">
					{this.timeToString(this.props.time)}
				</div>
				{(this.props.notes != undefined && this.props.notes.length > 0) ? <div className="note">{this.props.notes}</div> : <div />}
			</div>
		</div>
}