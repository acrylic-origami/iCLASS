import React from 'react';
import Annotation from './Annotation';

export default class extends React.Component {
	constructor(props) {
		super(props); // props: initial: [dataset, [start, range]]

		this.brushListMargin = {
			paddingBottom: "100px"
		};
	}

	render = () => <div className="brush-list" style={this.brushListMargin} id="brush-list">
		<div className="annotationList">
			{this.props.annotations.map((annot, index) =>
				<Annotation
					key={"annot-" + index}
					time={annot.startTime}
					type={annot.type}
					notes={annot.notes}
					annot_id={index}
					openNewAnnotationPopUp={this.props.openNewAnnotation}
				/>
			)}
		</div>
	</div>
}