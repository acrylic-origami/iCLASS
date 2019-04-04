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

		this.listWrapStyle = {
			marginTop: "20px",
			marginBottom: "20px"
		};

		this.datasetWrapStyle = {
			width: '960px',
			position: 'relative',
			height: '50px',
			marginTop: '-1px'
		};

		this.linkWrapStyle = {
			position: 'absolute',
			left: '30px',
			lineHeight: '50px',
		};

		this.timeWrapStyle = {
			position: 'absolute',
			right: '0',
			height: '50px'
		}

		this.startWrapStyle = {
			display: 'inline-block',
			width: '150px',
			lineHeight: '50px',
		}

		this.endWrapStyle = {
			display: 'inline-block',
			width: '150px',
			lineHeight: '50px',
		}

		this.dateWrapStyle = {
			display: 'inline-block',
			width: '150px',
			lineHeight: '50px'
		}

		this.completenessStyle = {
			fontSize: '18px',
			// marginLeft: '30px',
			marginBottom: '20px',
			width: '960px',
			textAlign: 'center'
		}

		this.patientTitleStyle = {
			marginLeft: "30px"
		}
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
							<Link to={"/"}>back</Link>
							<h1 style={this.patientTitleStyle}>{this.props.patientID}</h1>
							<div style={this.listWrapStyle}>
								<div style={{...this.datasetWrapStyle, color: 'grey'}}>
									<div style={this.linkWrapStyle}>
										Dataset:
									</div>
									<div style={this.timeWrapStyle}>
										<div style={this.startWrapStyle}>
											Start: 
										</div>
										<div style={this.endWrapStyle}>
											End:
										</div>
										<div style={this.dateWrapStyle}>
											Date: 
										</div>
									</div>
								</div>
								{this.state.datasets.map((dataset, index) => 
									<div key={"data-" + index} style={this.datasetWrapStyle}>
										<div style={this.linkWrapStyle}>
											<Link to={{search: "?dataset=" + dataset.title}}>{dataset.title}</Link>
										</div>
										<div style={this.timeWrapStyle}>
											<div style={this.startWrapStyle}>
												{dateFormat(new Date(dataset.start), "hh:MM:ss TT")} 
											</div>
											<div style={this.endWrapStyle}>
												{dateFormat(new Date(dataset.end), "hh:MM:ss TT")}
											</div>
											<div style={this.dateWrapStyle}>
												{dateFormat(new Date(dataset.start), "mmmm dS, yyyy")} 
											</div>
										</div>
									</div>
								)}
							</div>
							<div style={this.completenessStyle}>
								Dataset completeness: {(this.state.cover * 100).toFixed(2) + "%"}
							</div>
							<PatientMinimap datasets={this.state.datasets}
											min_start={this.state.min_start}
											max_end={this.state.max_end}
											width={960}
											height={100}
											brush_t={{
												start: 0, //this.state.min_start + 0.2 * (this.state.max_end - this.state.min_start),
												end: 0 //this.state.max_end - 0.2 * (this.state.max_end - this.state.min_start)
											}}
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