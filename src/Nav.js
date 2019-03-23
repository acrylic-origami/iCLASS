import React from 'react';
import { Route,
	     NavLink,
	     BrowserRouter,
	     Switch
} from "react-router-dom";
import PatientNav from './PatientNav';
import PatientView from './PatientView';

export default class extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			patientAccounts: ['1', '2', '3']
		};

		this.browserWrap = {
			zIndex: 10000
		}
	}

	render = () =>
		<div>
			<BrowserRouter>
				<div>
					<Switch>
						<Route exact path={"/"} render={props => <PatientNav {...props} patientNotFound={false} patientAccounts={this.state.patientAccounts} />} />
						{this.state.patientAccounts.map((id) => 
							<Route key={"p_view_" + id}
							       exact path={"/patient" + id}
								   render={props => <PatientView {...props}
								   patientID={"patient" + id}
								   patientAccounts={this.state.patientAccounts} />} />
						)}
						<Route render={props => <PatientNav {...props} patientNotFound={true} patientAccounts={this.state.patientAccounts} />} />
					</Switch>
				</div>
			</BrowserRouter>
		</div>
}