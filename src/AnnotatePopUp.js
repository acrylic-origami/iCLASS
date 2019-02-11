import React from 'react';
import NewAnnotationForm from './NewAnnotationForm';

export default class extends React.Component {
	constructor(props) {
		super(props); // props: initial: [dataset, [start, range]]

		this.overlayStyle = {
			position: "absolute",
			top: "0",
			bottom: "0",
			right: "0",
			left: "0",
			zIndex: "999"
		}

		this.menuStyle = {
			position: "absolute",
			backgroundColor: "white",
			top: "0px",
			left: "0px",
			zIndex: "1000",
			border: "1px solid #ccc",
			padding: "20px",
			boxShadow: "2px 2px 5px rgba(0,0,0,0.3)",
			borderRadius: "3px"
		}

		this.annotationBarStyle = {
			position: "absolute",
			zIndex: "998",
			height: "630px",
			width: "2px",
			backgroundColor: "#178ccb",
			top: "20px",
			left: "0px"
		}
	}

	handleFormSubmit = d => {
		this.props.addAnnotation(d);
	}

	componentWillUpdate(nextProps, nextState) {
		if(nextProps.screenPosX !== this.props.screenPosX
			|| nextProps.screenPosY !== this.props.screenPosY) {
			this.menuStyle = {
				...this.menuStyle,
				top: nextProps.screenPosY + "px",
				left: nextProps.screenPosX + "px"
			};
			this.annotationBarStyle = {
				...this.annotationBarStyle,
				left: (nextProps.screenPosX - 3) + "px"
			};
		}
	}
	
	render = () =>
		<div>
			{(this.props.is_annotating) ?
				<div>
					<div style={this.annotationBarStyle}></div>
					<div className="annotation-menu" style={this.menuStyle}>
						<NewAnnotationForm 
							startTime={this.props.startTime}
							handleSubmit={this.handleFormSubmit}
							handleCancel={this.props.cancelAnnotation}
						/>
					</div>
					<div className="annotation-overlay" style={this.overlayStyle} onClick={this.props.cancelAnnotation}></div>
				</div> : <div></div>
			}
			
		</div>
}