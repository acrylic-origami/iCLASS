import React from 'react';
import { Route,
	     Link,
	     BrowserRouter
} from "react-router-dom";
import * as d3 from 'd3';
import * as d3_multi from 'd3-selection-multi';
import Q from 'q';
import * as dateFormat from 'dateFormat';
import DatasetView from './DatasetView';
import PatientMinimap from './PatientMinimap'

export default class extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			maybe_dataset: null,
			datasets: [],
			min_start: 0,
			max_end: 0,
			cover: 0,
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
					loaded: true,
					min_start: results.min_start,
					max_end: results.max_end,
					cover: results.cover
				}));
			}
			else {
				window.addEventListener('load', () => {
					this.setState(state_ => ({
						datasets: results.datasets,
						loaded: true,
						min_start: results.min_start,
						max_end: results.max_end,
						cover: results.cover
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
											<li key={"startend-" + index}>{dateFormat(new Date(dataset.start), "dddd, mmmm dS, yyyy, h:MM:ss TT") + " - " +
													dateFormat(new Date(dataset.end), "dddd, mmmm dS, yyyy, h:MM:ss TT")}</li>
										</ul>
									</li>
								)}
							</ul>
							<div>
								Dataset completion: {(this.state.cover * 100).toFixed(2) + "%"}
							</div>
							<PatientMinimap datasets={this.state.datasets}
											min_start={this.state.min_start}
											max_end={this.state.max_end}
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