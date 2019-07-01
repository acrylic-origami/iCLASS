import React from 'react';
import { data_name, view_name } from './Util/AnnotationTypeNames';

export default props => 
	<li className={`annotation group ${props.is_grouped ? 'grouped' : ''} ${data_name(props.annot)}`} key={props.annot.id}>
		<a href={`#${props.annot.id}`} onClick={props.zoom_to} onDoubleClick={props.select}>
			<div className="time">{props.annot.get_start().toLocaleString()}</div>
			<h2>{view_name(props.annot)}</h2>
			<div className="note">{props.annot.notes}</div>
		</a>
	</li>