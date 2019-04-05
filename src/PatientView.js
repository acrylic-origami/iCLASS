import React from 'react';
import { Route,
	     Link,
	     BrowserRouter
} from "react-router-dom";
import * as d3 from './d3';
import * as d3_multi from 'd3-selection-multi';
import Q from 'q';
import DatasetView from './DatasetView';

export default class extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			maybe_dataset: null,
			datasets: [],
			loaded: false
		};
	}

	// Render the patient selection of no search id is set
	// Render the dataset view if an id is selected

	// componentDidMount() {
	// 	const params = new URLSearchParams(document.location.search.substring(1));

	// 	// If there is a dataset, load it
	// 	this.setState(state_ => ({
	// 		maybe_dataset: params.get('dataset')
	// 	}));
	// }

	// componentDidUpdate(prevProps, prevState) {
	// 	const params = new URLSearchParams(document.location.search.substring(1));
	// 	// Check if there is a new dataset to load
	// 	if(prevState.maybe_dataset != params.get('dataset')) {
	// 		this.setState(state_ => ({
	// 			maybe_dataset: params.get('dataset')
	// 		}));
	// 	}
	// }

	componentDidMount() {
		// Load datasets in this patient directory
		const D_initial = (() => {
			if (true) return d3.json(`/get_datasets?patientId=` + this.props.patientID); // call get patients
			else return Q.fcall(() => { throw new Exception(); });
		})();
		D_initial.then(results => {
			if(document.readyState === 'complete') {
				this.setState(state_ => ({
					datasets: results.datasets,
					loaded: true
				}));
			}
			else {
				window.addEventListener('load', () => {
					this.setState(state_ => ({
						datasets: results.datasets,
						loaded: true
					}));
				});
			}
		}, e => {
			// retry or show dataset selection screen
		});
	}

	render = () =>{
		const params = new URLSearchParams(document.location.search.substring(1));
		return <div>
			{(params.get('dataset') != null) ? 
				<DatasetView patientID={this.props.patientID} />
			:
				<div>
					{(this.state.loaded) ?
						<div>
							<h1>{this.props.patientID}</h1>
							<Link to={"/"}>back</Link>
							<ul className="header">
								{this.state.datasets.map((id) => 
									<li key={"data-" + id}><Link to={{search: "?dataset=" + id}}>{id}</Link></li>
								)}
							</ul>
						</div>
						:
						<div></div>
					}
				</div>
			}
		</div>;
	}
}