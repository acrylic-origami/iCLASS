import React from 'react';
import { Route,
	     Link,
	     BrowserRouter,
	     Switch
} from "react-router-dom";
import * as d3 from './d3';
import * as d3_multi from 'd3-selection-multi';
import Q from 'q';
import PatientNav from './PatientNav';
import PatientView from './PatientView';

export default class extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			patientAccounts: [],
			loaded: false
		};

		this.browserWrap = {
			zIndex: 10000
		}

		this.userNameStyle = {
			position: 'absolute',
			top: '0',
			right: '0',
			padding: '5px',
			backgroundColor: 'white',
			zIndex: 1000
		}
	}

	componentDidMount() {
		// Load patient list
		const P_initial = (() => {
			if (true) return d3.json(`/get_patients`); // call get patients
			else return Q.fcall(() => { throw new Exception(); });
		})();
		P_initial.then(results => {
			if(document.readyState === 'complete') {
				this.setState(state_ => ({
					patientAccounts: results.patients,
					loaded: true
				}));
			}
			else {
				window.addEventListener('load', () => {
					this.setState(state_ => ({
						patientAccounts: results.patients,
						loaded: true
					}));
				});
			}
		}, e => {
			// retry or show dataset selection screen
		});
	}

	render = () =>
		<div>
			{(this.state.loaded) ? 
				<BrowserRouter>
					<div>
						<div style={this.userNameStyle}>
							Gerard O'Leary <Link to={"/"}> log out </Link>
						</div>
						<Switch>
							<Route exact path={"/"} render={props => <PatientNav {...props} patientNotFound={false} patientAccounts={this.state.patientAccounts} />} />
							{this.state.patientAccounts.map((id) => 
								<Route  key={"p_view_" + id}
								        exact path={"/" + id}
									    render={props =>
									   		<PatientView {...props}
									   					 patientID={id}
									   		/>
									    }
								/>
							)}
							<Route render={props => <PatientNav {...props} patientNotFound={true} patientAccounts={this.state.patientAccounts} />} />
						</Switch>
					</div>
				</BrowserRouter>
				:
				<div></div>
			}
		</div>
}