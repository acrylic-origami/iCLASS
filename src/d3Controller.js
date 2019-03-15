import React from 'react';
import * as d3 from 'd3';
import Q from 'q';
import Frac from 'fraction.js';
import {fromEvent, Subject} from 'rxjs';
import {debounceTime, bufferCount, map} from 'rxjs/operators';

// import DataController from './DataController';
import DataController from './FlatData';
import {BASEGRAPH_ZOOM, EPS, FULL_RES_INTERVAL} from './consts';

import {PointBrush, OnsetBrush, OffsetBrush, RangeBrush, SeizureBrush} from './Annotations';

const channels = [...Array(16).keys()];
const NUM_CH = channels.length;

export default class extends React.Component {
	constructor(props) {
		super(props); // brushes are also included here
		// basic dataset dataset_meta is also included here
		
		this.svg = React.createRef();
		this.zoom = React.createRef();
		this.area = React.createRef();
		this.gBrushes = React.createRef();
		
		this.minimap_svg = React.createRef();
		this.minimap_area = React.createRef();
		
		this.state = {
			is_annotating: false,
			annotating_id: null
		};
		
		// x may be needed for the props-based update
	}
	
	componentDidMount() {
		this.$svg = d3.select(this.svg.current);
		this.$area = d3.select(this.area.current);
		this.$gBrushes = d3.select(this.gBrushes.current);
		this.$zoom = d3.select(this.zoom.current);
		
		this.$minimap_svg = d3.select(this.minimap_svg.current);
		this.$minimap_area = d3.select(this.minimap_area.current);
		
		this.$zoom.on("dblclick.zoom", null);
		this.$svg.on("dblclick", e => {
			this.setState(state_ => ({
				is_annotating: true
			}));
		});
		this.onDatasetUpdate(); // this bridge remains despite not being strictly  necessary if we navigate using pages as opposed to React router (e.g.); this should be the only invokation for the timebeing
	}

	componentDidUpdate(prevProps, prevState) {
		if(prevProps.annotations !== this.props.annotations) {
			// clear previous brushes
			const brushSelection = that.$gBrushes
			    .selectAll('.brush')
			    .remove();
			    
			for(const annotation in this.props.annotations) {
				var brush = d3.brushX()
				    .extent([[0, 0], [that.x((that.x.domain())[1]), +that.$svg.attr('height')]])
				    .on("end", e => {
				    	const annotation_ = Object.create(Object.getPrototypeOf(this.props.annotation), this.props.annotation); // TODO crap. I want to preserve object type but also can't mutate a props object (assuming it's the same memory as the parent's reference)
				    	annotation_.update_with_selection(e.selection);
				   	this.props.onAnnotationUpdate(annotation.id, annotation_); // let the logic upstairs also deal with the type of brush this is
				    });
				    
				that.$gBrushes.insert("g", '.brush')
				              .attr("class", "brush")
				              .attr('id', `brush-${annotation.id}`)
				              .call(brush);
			}
			// remove all brush overlays
			d3.selectAll('.brush>.overlay').remove();
			this.updateBrushes();
		}
		
		if(this.props.annotating_id != null && this.props.annotating_id !== prevProps.annotating_id) // second condition might be covered by setState matching
			this.setState({
				is_annotating: true,
				annotating_id: this.props.annotating_id
			});
	}
	
	/* protected */
	updateBrushes() {
		// If point, add brush, delete handles, add title (after)
		// If range, add brush, add custom handles with titles
		for(const annotation in this.props.annotations) {
			const gBrush = d3.select(`brush-${annotation.id}`);
			switch(annotation.constructor) {
				case OnsetBrush:
					gBrush.selectAll('.brush>.handle').remove();
					
					gBrush.attr("class", "brush point");

					// Move the brush to the startTime + a fixed width
					gBrush.call(brush.move, [that.x(annotation.get_start()), that.x(annotation.get_start()) + 2]);

					// Remove the handles so can't be resized
					break;
				case RangeBrush:
					gBrush.attr("class", "brush range");

					// Move the brush to the startTime and endTime
					gBrush.call(brush.move, [ annotation.get_start(), annotation.get_end() ].map(this.x));
					
					// add titles as custom handles
					break;
					
			}
		}
	}

	render = () => <div>
		{ !this.state.is_annotating ? null :
			<AnnotateView
				annotation={this.props.annotations.get(this.state.annotating_id) /* for existing annotations */}
				startTime={this.props.startTime}
				screenPosY={this.state.screenPosY}
				screenPosX={this.state.screenPosX}
				onSubmit={annotation => {
					const annotating_id = this.state.annotating_id;
					this.props.onAnnotate(annotation);
					this.setState(state_ => {
						const ret = { is_annotating: false }
						if(state_.annotating_id === annotating_id)
							ret.annotating_id = null;
						
						return ret;
					});
				}}
				onCancel={() => this.setState({ is_annotating: false })}
				annot_id={this.props.annot_id}
			/>
		}
		<svg ref={this.svg} width={this.props.width} height={this.props.height}>
			<g ref={this.area}></g>
			<g ref={this.gBrushes} className="brushes"></g>
			<rect id="zoom" className="zoom" style={{ display: this.props.is_editing ? 'none' : 'block' }} width={this.props.width} height={this.props.height} ref={this.zoom} />
		</svg>
		<svg ref={this.minimap_svg} width={this.props.width} height={this.props.height}>
			<g ref={this.minimap_area}></g>
		</svg>
	</div>

	onDatasetUpdate = () => {
		// TODO account for initial zooms in props
		
		// DATA SETUP //
		const domain1 = [new Date(this.props.dataset_meta.tstart), new Date(this.props.dataset_meta.tstart + FULL_RES_INTERVAL)];
		const data_controller = new DataController(
			this.props.dataset_meta
		);
		
		// UI SETUP //
		this.x = d3.scaleTime()
		            .range([0, +this.$svg.attr('width')])
		            .domain(domain1);
		const x0 = this.x.copy();
		const y = d3.scaleLinear()
		            .range([+this.$svg.attr('height'), 0])
		            .domain([-200, 200]); // d3.extent(channels.map(ch => flat_data.map(packet => packet[1][ch])).reduce((acc, packet) => acc.concat(packet))));

		const x_ax = d3.axisBottom(this.x),
		      y_ax = d3.axisLeft(y);
		               
		const h_x_ax = this.$area.append('g').attr('class', 'axis axis--x').call(x_ax);
		const h_y_ax = this.$area.append('g').attr('class', 'axis axis--y').call(y_ax);

		const channel_offset = (y.domain()[1]-y.domain()[0])/(NUM_CH + 2); // +2 leaves gap at bottom and top
		const offset = i => (i + 0.5 - NUM_CH / 2) * channel_offset;
		
		const line = d3.line()
		               .curve(d3.curveMonotoneX)
		               .x(d => x0(new Date(d[0])))
		               .y(d => y(d[1]));

		const h_lines =
			channels.map(ch =>
				this.$area.append('path')
		        	.attr('class', 'line line-num-'+ch)
		   );
		
		const zoom_subj = new Subject();
		this.zoomFunc = d3.zoom()
		               .extent([[0, 0], [+this.$svg.attr('width'), +this.$svg.attr('height')]])
		               .on('zoom', e => {
		               	// I think 
		               	// h_line.attr('d', line);
		               	const tf = d3.event.transform;
		               	// if has_zoomed is false, the new domain should be the one passed by props
		               	const new_domain =  tf.rescaleX(x0).domain();//this.props.has_zoomed ? t_domain : this.props.zoom_times;
		               	zoom_subj.next(new_domain);
		               	this.x.domain(new_domain);
		               	h_lines.forEach(h_line => {
		               		const tf_str = `translate(${tf.x} 0) scale(${tf.k} 1)`;;
			               	h_line.attr('transform', tf_str); // assuming non-scaling stroke; much better performance
			               	// this.$gBrushes.attr('transform', tf_str);
			               	// this.$gBrushes.selectAll('.handle').attr('width', 6/tf.k);
			               	// h_line.attr('d', line) // without non-scaling stroke, quite wasteful
		               	}); //Object.assign({}, , { y: 1 }))); // scale only X
		               	h_x_ax.call(x_ax);

		               	// update brushes through x()
		               	this.updateBrushes();

		               });
		
		this.$zoom.call(this.zoomFunc);
		
		// force resampling of data when zoom is done manually
		const resampleData = new_domain => {
			data_controller.maybe_update(new_domain)
				.then(did_update => {
					if(did_update) {
						const data = data_controller.get_data(new_domain);
						// destroy the boundaries between chunks and use graph interpolate
						// debugger;
						for(let i = 0; i < NUM_CH; i++) {
							// debugger;
							h_lines[i].attr(
								'd',
								line(
									data.map(packet => [packet[0], packet[1][channels[i]] / (NUM_CH + 2) + offset(channels[i])])
								)
							);
						}
					}
				}, console.log).catch(console.log)
		};
		
		zoom_subj.pipe(
			bufferCount(10),
			debounceTime(200),
			map(buffer => buffer[buffer.length - 1].map(d => d.getTime())) // when rate falls below 10 events per 200ms
		)
			.subscribe(resampleData);

		resampleData(domain1);
		
		
		// MINIMAP SETUP
		
	}
}