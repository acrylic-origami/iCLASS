import React from 'react';
import { Route,
	     Link,
	     BrowserRouter
} from "react-router-dom";
import * as d3 from 'd3';
import * as d3_multi from 'd3-selection-multi';
import Q from 'q';
import DatasetView from './DatasetView';
import PatientMinimap from './PatientMinimap'

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
			return d3.json(`/get_datasets?patientId=` + this.props.patientID); // call get patients
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
			console.log('Unable to load datasets');
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
								{this.state.datasets.map((dataset, index) => 
									<li key={"data-" + index}><Link to={{search: "?dataset=" + dataset.title}}>{dataset.title}</Link>
										<ul>
											<li key={"startend-" + index}>{(new Date(dataset.start)).toString() + " - " +
													(new Date(dataset.end)).toString()}</li>
										</ul>
									</li>
								)}
							</ul>
							<PatientMinimap datasets={this.state.datasets}
											width={960}
											height={100}
							/>
						</div>
						:
						<div></div>
					}
				</div>
			}
		</div>;
	}
}