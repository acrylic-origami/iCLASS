import React from 'react';
import * as d3 from 'd3';
import * as d3_multi from 'd3-selection-multi';
import Q from 'q';
import Frac from 'fraction.js';
import {fromEvent, Subject} from 'rxjs';
import {debounceTime, bufferCount, map} from 'rxjs/operators';
import AnnotateView from './AnnotateView';

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
		
		this.area_canvas = React.createRef();
		
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
		
		this.area_ctx = this.area_canvas.current.getContext('2d');
		
		this.area_ctx.moveTo(0, 0);
		this.area_ctx.strokeStyle = '#000 solid 1px';
		this.area_ctx.fillStyle = '#000';
		
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
		<div className="plot-container">
			<canvas
				className="plot" ref={this.area_canvas}
				width={this.props.width * window.devicePixelRatio * 10}
				height={this.props.height * window.devicePixelRatio}
				style={{
					width: `${this.props.width * 10}px`,
					height: `${this.props.height}px`,
				}}
			/>
		</div>
		<svg className="plot" ref={this.svg} width={this.props.width} height={this.props.height}>
			<g ref={this.area}></g>
			<g ref={this.gBrushes} className="brushes"></g>
			<rect id="zoom" className="zoom" style={{ display: this.props.is_editing ? 'none' : 'block' }} width={this.props.width} height={this.props.height} ref={this.zoom} />
		</svg>
		<svg ref={this.minimap_svg} width={this.props.width} height={100}>
			<g ref={this.minimap_area}></g>
		</svg>
	</div>

	onDatasetUpdate = () => {
		// TODO account for initial zooms in props
		let px_ratio = window.devicePixelRatio;
		
		// DATA SETUP //
		let px_x_shift = 0; // amount of shift of the canvas relative to the starting position, due to wraparounds
		let visible_set = new Set();
		const domain1 = [new Date(this.props.dataset_meta.tstart), new Date(this.props.dataset_meta.tstart + 30000)];
		const data_controller = new DataController(
			this.props.dataset_meta
		);
		
		// UI SETUP //
		(() => {
			this.x = d3.scaleTime()
			            .range([0, +this.$svg.attr('width')])
			            .domain(domain1); // TODO: consider replacing with a representation relative to the whole dataset width
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
			               .curve(d3.curveLinear)
			               .x(d => x0(d[0]))
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
			               	console.log(new_domain);
			               	if(new_domain[0] > data_controller.domain0[0] && new_domain[1] < data_controller.domain0[1]) {
			               		// limit to dataset window
			               		zoom_subj.next(new_domain);
			               		// this.x.domain(new_domain);
			               		
			               		const tf_str = `translate(${tf.x}px, 0) scale(${tf.k}, 1)`;
			               		this.area_canvas.current.style.transform = tf_str;
			               		h_x_ax.call(x_ax);

			               		// update brushes through x()
			               		this.updateBrushes();
			               	}
			               });
			
			this.$zoom.call(this.zoomFunc).on('dblclick.zoom', null);
			
			// force resampling of data when zoom is done manually
			const resampleData = new_domain => {
				data_controller.get_data(new_domain)
					.then(data => {
						if(data.length > 0) {
							const did_wrap_right = this.x(data[0][data[0].length - 1][0]) > this.area_canvas.current.width,
							      did_wrap_left = this.x(data[0][0][0]) < 0;
							if(did_wrap_left || did_wrap_right) {
								data_controller.clear_visible();
								// this.buffer_ctx.clearRect(0, 0, this.buffer_area.current.width, this.buffer_area.current.height);
								if(did_wrap_right) {
									// wrap around right ; new data will draw off canvas
									// for now, just assume a single data frame is in view
									// when using `this.x` to transform the x-shift in time, we assume that `this.x` is a linear scale; if logarithmic or something else funky then we have to convert that time delta to a px delta more carefully
									px_x_shift = this.x(enclosing_domain[0] - domain1[0]);
								}
								else if(did_wrap_left) {
									px_x_shift = this.x(enclosing_domain[1]) - this.area_canvas.current.width;
								}
								
								// adjust the positioning of canvas
								const tf = d3.zoomTransform(this.$zoom.node());
								this.area_ctx.clearRect(0, 0, this.area_canvas.current.width, this.area_canvas.current.height);
								this.area_canvas.current.style.transform = `translate(${tf.x - px_x_shift}px, 0) scale(${tf.k}, 1)`;
								return data_controller.get_data(new_domain); // refetch data with new visibilities
							}
							else {
								return data;
							}
						}
						else return data;
					}, console.log)
					.then(data => {
						// draw the data
						// const COLORS = ['#F00', '#0F0', '#00F', '#0FF', '#F0F'];
						if(data.length > 0) {
							console.log(data[0][0][0], this.x(data[0][0][0]), data[data.length - 1][data[data.length - 1].length - 1][0], this.x(data[data.length - 1][data[data.length - 1].length - 1][0]), data.length);
							for(let ch = 0; ch < data[0][0][1].length; ch++) {
								for(let chunk_idx = 0; chunk_idx < data.length; chunk_idx++) {
									const chunk = data[chunk_idx];
									// this.area_ctx.strokeStyle = COLORS[chunk_idx];
									let first_point = true;
									this.area_ctx.beginPath();
									for(const [t, sample] of chunk) {
										(first_point ? this.area_ctx.moveTo : this.area_ctx.lineTo).call(
											this.area_ctx,
											(this.x(t) - px_x_shift) * px_ratio, (y(sample[ch] / (NUM_CH + 2) + offset(channels[ch])) * px_ratio)
										);
										first_point = false;
									}
									this.area_ctx.stroke();
								}
							}
						}
					}).catch(console.log)
			};
			
			zoom_subj.pipe(
				debounceTime(200),
				map(t => t.map(d => d.getTime())) // when rate falls below 10 events per 200ms
				// buffer[buffer.length - 1]
			)
				.subscribe(resampleData);

			resampleData(domain1);
		})();
		
		// MINIMAP SETUP
		(() => {
			const domain0 = [new Date(this.props.dataset_meta.tstart), this.props.dataset_meta.tstart + this.props.dataset_meta.point_count / this.props.dataset_meta.Fs * 1000];
			const x = d3.scaleTime()
			            .range([0, +this.$minimap_svg.attr('width')])
			            .domain([domain0]);
			// console.log(x);
			const x0 = this.x.copy();
			const y = d3.scaleLog()
			            .range([+this.$minimap_svg.attr('height'), 0])
			            .domain([1E-3, 10000]); // d3.extent(channels.map(ch => flat_data.map(packet => packet[1][ch])).reduce((acc, packet) => acc.concat(packet))));

			const x_ax = d3.axisBottom(x),
			      y_ax = d3.axisLeft(y);
			      
			const h_x_ax = this.$minimap_area.append('g').attr('class', 'axis axis--x').call(x_ax);
			const h_y_ax = this.$minimap_area.append('g').attr('class', 'axis axis--y').call(y_ax);
			
			const that = this;
			this.$minimap_area.selectAll('line')
			                  .data(this.props.dataset_meta.subsamples)
			                  .enter()
			                  .append('line')
			                  .each(function (d, i) {
			                  	d3.select(this).attrs({
				                  	'class': 'minimap-chart-ele',
				                  	'x1': `${i / that.props.dataset_meta.subsamples.length * 100}%`,
				                  	'x2': `${i / that.props.dataset_meta.subsamples.length * 100}%`,
				                  	'y1': y(Math.max(d[0][0] - d[0][1], 1E-2)), // 1-sigma
				                  	'y2': y(d[0][0] + d[0][1])
				                  })
			                  });
		})();
	}
}