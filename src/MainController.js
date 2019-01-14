import React from 'react';
import D3Controller from './d3Controller';

export default class extends React.Component {
	constructor(props) {
		super(props); // props: initial: [dataset, [start, range]]
		this.state = {
			is_editing: false,
			brushes: []
		};
	}
	
	onEditZoomToggle = () => this.setState(state_ => ({
		is_editing: !state_.is_editing
	}));
	
	onAddBrush = brush => this.setState(state_ => ({
		brushes: state_.brushes.concat([brush])
	}));
	
	onEditBrush = brush => this.setState(state_ => {
		const idx = state_.brushes.indexOf(brush);
		if(idx !== -1) {
			// TODO server calls here
		}
	});
	onDeleteBrush = brush => this.setState(state_ => {
		const idx = state_.brushes.indexOf(brush);
		if(idx !== -1)
			state_.brushes.splice(idx, 1);
		return { 'brushes': state_.brushes };
	});
	
	render = () => <div>
		<button className="edit-zoom-toggle" id="edit-zoom-toggle" type="button" onClick={this.onEditZoomToggle}>Edit/Zoom</button>
		<D3Controller
			{...this.props}
			is_editing={this.state.is_editing}
			onAddBrush={this.onAddBrush}
			onUpdateBrush={this.onEditBrush}
			onDeleteBrush={this.onDeleteBrush}
			width={960}
			height={640}
			/>
		<ul className="brush-list" id="brush-list">
			{this.state.brushes.map((brush, i) => <li key={i}>Brush {i}</li>)}
		</ul>
	</div>;
}