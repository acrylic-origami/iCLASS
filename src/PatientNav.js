import React from 'react';
import { Route,
	     Link,
	     BrowserRouter
} from "react-router-dom";

export default class extends React.Component {
	constructor(props) {
		super(props);
	}

	render = () =>
		<div>
			<h1>iCLASS</h1>
			<ul className="header">
				{this.props.patientAccounts.map((id) => 
					<li key={"pat-" + id}><Link to={{pathname: "/patient" + (Number(id) + 1)}}>{"Patient" + id}</Link></li>
				)}
			</ul>
			{(this.props.patientNotFound) ? <div>Patient not found.</div> : <div></div>}
		</div>
}