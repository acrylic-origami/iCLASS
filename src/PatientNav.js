import React from 'react';
import { Route,
	     Link,
	     BrowserRouter
} from "react-router-dom";

export default class extends React.Component {
	constructor(props) {
		super(props);

		this.patientTitleStyle = {
			marginLeft: "30px",
			marginTop: "30px"
		}

		this.listWrapStyle = {
			marginTop: "20px",
			marginBottom: "20px"
		};

		this.datasetWrapStyle = {
			width: '960px',
			position: 'relative',
			height: '50px',
			marginTop: '-1px',
			marginLeft: '10px'
		};

		this.linkWrapStyle = {
			marginLeft: '30px',
			lineHeight: '40px',
		};
	}

	render = () =>
		<div>
			<h1 style={this.patientTitleStyle}>iCLASS</h1>
			<div style={{marginLeft: '30px'}}> Patients:</div>
			<ul>
				{this.props.patientAccounts.map((id) => 
					<li style={this.linkWrapStyle} key={"pat-" + id}>
						<Link to={{pathname: "/" + id}}>{id}</Link>
					</li>
				)}
			</ul>
			{(this.props.patientNotFound) ? <div>Patient not found.</div> : <div></div>}
		</div>
}