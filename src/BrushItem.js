import React from 'react';

export default class extends React.Component {
	constructor(props) {
		super(props); // props: initial: [dataset, [start, range]]

		this.headingStyle = {
			fontSize: "20px",
			paddingBottom: "5px",
			color: "black"
		}

		this.brushWrapStyle = {
			paddingBottom: "20px",
			paddingTop: "20px",
			cursor: "pointer",
			borderBottom: "1px solid #000",
			paddingLeft: "20px",
			color: "#AAAAAA"
		}
	}
	
	// onEditZoomToggle = () => this.setState(state_ => ({
	// 	is_editing: !state_.is_editing
	// }));
	
	render = () =>
		<div>
			{(typeof this.props.brush.times[0] == "object") ? 
				<div style={this.brushWrapStyle} key={this.props.seizureId} onClick={() => this.props.onBrushZoom(this.props.seizureId)}>
					<div style={this.headingStyle}>Seizure {this.props.seizureId}</div>
					<div>
						{((new Date(this.props.brush.times[0])).getHours()%12) + ":"
						+ (((new Date(this.props.brush.times[0])).getMinutes() < 10) ? '0' : '') + (new Date(this.props.brush.times[0])).getMinutes() + ":"
						+ (((new Date(this.props.brush.times[0])).getSeconds() < 10) ? '0' : '') + (new Date(this.props.brush.times[0])).getSeconds()
						+ " - "
						+ ((new Date(this.props.brush.times[1])).getHours()%12)
						+ ":" + (((new Date(this.props.brush.times[1])).getMinutes() < 10) ? '0' : '') + (new Date(this.props.brush.times[1])).getMinutes()
						+ ":" + (((new Date(this.props.brush.times[1])).getSeconds() < 10) ? '0' : '') + (new Date(this.props.brush.times[1])).getSeconds()}
					</div>
				</div>
			:
				<div></div>
			}
		</div>
}