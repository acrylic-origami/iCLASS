import React from 'react';
import Q from 'q';
import * as d3 from './d3';
import {EPS} from './consts';
import MainController from './MainController';


export default class extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			loaded: false,
			meta: {}
		};
	}

	componentDidMount() {
		const params = new URLSearchParams(document.location.search.substring(1));
		const hash = document.location.hash.substring(1);

		const maybe_dataset = params.get('dataset');
		const F_initial = (() => {
			if(maybe_dataset != null) {
				return (() => {
					// TODO: make manual-set start and range live in history (when we have the functionality)
					const maybe_start = params.get('start');
					// const maybe_range = params.get('range');
					
					return d3.json(`/dataset_meta?dataset=${maybe_dataset}&patient=${this.props.patientID}`).then(d => Object.assign({}, d, {
						dataset: maybe_dataset,
						start: parseFloat(maybe_start) || 0,
						// range: d.point_count / d.Fs - EPS
					}));
				})();
			}
			else {
				return Q.fcall(() => { throw new Exception(); });
			}
		})();
		F_initial.then(meta => {
			if(document.readyState === 'complete') {
				this.setState(state_ => ({
					meta: meta,
					loaded: true
				}));
			}
			else {
				window.addEventListener('load', () => {
					this.setState(state_ => ({
						meta: meta,
						loaded: true
					}));
				});
			}
		}, e => {
			// retry or show dataset selection screen
		})
	}

	render = () =>
		<div>
			{(this.state.loaded) ? <MainController dataset_meta={this.state.meta} patientID={this.props.patientID} /> : <div></div>}
		</div>
}