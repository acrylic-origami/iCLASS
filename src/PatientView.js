import React from 'react';
import { Route,
	     Link,
	     BrowserRouter
} from "react-router-dom";
import DatasetView from './DatasetView';

export default class extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			maybe_dataset: null
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

	render = () =>{
		const params = new URLSearchParams(document.location.search.substring(1));
		return <div>
			{(params.get('dataset') != null) ? 
				<DatasetView />
			:
				<div>
					<h1>{this.props.patientID}</h1>
					<ul className="header">
						{this.props.patientAccounts.map((id) => 
							<li key={"pat-" + id}><Link to={{search: "?dataset=EDMSE_pat_FR_1096_002.mat"}}>{"Dataset" + id}</Link></li>
						)}
					</ul>
				</div>
			}
		</div>;
	}
}