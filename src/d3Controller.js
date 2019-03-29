import React from 'react';
import * as d3 from 'd3';
import * as d3_multi from 'd3-selection-multi';
import Q from 'q';
import Frac from 'fraction.js';
import {fromEvent, Subject} from 'rxjs';
import {debounceTime, bufferCount, map} from 'rxjs/operators';

// import DataController from './DataController';
import DataController from './FlatData';
import {BASEGRAPH_ZOOM, EPS, FULL_RES_INTERVAL} from './consts';
import AnnotateView from './AnnotateView';

import {PointBrush, OnsetBrush, OffsetBrush, RangeBrush, SeizureBrush} from './Annotations';

const channels = [...Array(16).keys()];
const NUM_CH = channels.length;
const Y_DOMAIN = [-200, 200]; // TODO make this user-adjustable via props
const OVERSCALING = 10;

export default class extends React.Component {
	constructor(props) {
		super(props); // brushes are also included here
		// basic dataset dataset_meta is also included here
		
		this.data_controller = new DataController(
			props.dataset_meta
		);
		
		this.svg = React.createRef();
		this.zoom = React.createRef();
		this.area = React.createRef();
		this.gBrushes = React.createRef();
		
		this.minimap_svg = React.createRef();
		this.minimap_area = React.createRef();
		
		this.minimap_canvas = React.createRef();
		this.area_canvas = React.createRef();
		
		this.state = {
			is_annotating: false,
			annotating_id: null,
			px_ratio: window.devicePixelRatio
		};
		
		// D3 STATE
		this.px_x_shift = 0; // should this be done through state?
		this.domain1 = [new Date(this.props.dataset_meta.tstart), new Date(this.props.dataset_meta.tstart + 30000)];
		
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
		this.minimap_ctx = this.minimap_canvas.current.getContext('2d');
		
		this.area_ctx.moveTo(0, 0);
		this.area_ctx.strokeStyle = '#000 solid 1px';
		this.area_ctx.fillStyle = '#000';
		
		this.$zoom.on("dblclick.zoom", null);
		
		
		// TODO account for initial zooms in props
		// DATA SETUP //
		
		// UI SETUP //
		(() => {
			// yes, there is a race condition against this variable vs. any props change that forces a resampleData
			this.x0 = d3.scaleTime()
			            .range([0, +this.$svg.attr('width')])
			            .domain(this.domain1); // TODO: consider replacing with a representation relative to the whole dataset width
			const x = this.x0.copy();
			
			this.y = d3.scaleLinear()
			            .range([+this.$svg.attr('height'), 0])
			            .domain(Y_DOMAIN); // d3.extent(channels.map(ch => flat_data.map(packet => packet[1][ch])).reduce((acc, packet) => acc.concat(packet))));

			const x_ax = d3.axisBottom(x),
			      y_ax = d3.axisLeft(this.y);
			               
			const h_x_ax = this.$area.append('g').attr('class', 'axis axis--x').call(x_ax);
			const h_y_ax = this.$area.append('g').attr('class', 'axis axis--y').call(y_ax);
			
			// const line = d3.line()
			//                .curve(d3.curveLinear)
			//                .x(d => this.x0(d[0]))
			//                .y(d => y(d[1]));

			// const h_lines =
			// 	channels.map(ch =>
			// 		this.$area.append('path')
			//         	.attr('class', 'line line-num-'+ch)
			//    );
			
			const zoom_subj = new Subject();
			this.zoomFunc = d3.zoom()
			               .extent([[0, 0], [+this.$svg.attr('width'), +this.$svg.attr('height')]])
			               .on('zoom', e => {
			               	const new_domain = d3.event.transform.rescaleX(this.x0).domain();
			               	zoom_subj.next(new_domain); // this might miiiight be a race condition against the React data plumbing
			               	
			               	x.domain(new_domain);
			               	h_x_ax.call(x_ax);
			               	this.props.onZoom(d3.event.transform)
			               });
			
			this.$zoom.call(this.zoomFunc).on('dblclick.zoom', null);
			
			this.$svg.on("dblclick", e => {
				this.setState(state_ => ({
					is_annotating: true,
					annotating_at: x.invert(d3.event.layerX),
					left_px: d3.event.clientX,
					annotating_id: null
				}));
			});
			
			zoom_subj.pipe(
				debounceTime(200),
				map(t => t.map(d => d.getTime())) // when rate falls below 10 events per 200ms
				// buffer[buffer.length - 1]
			)
				.subscribe(this.resampleData);

			this.resampleData(this.domain1);
		})();
		
		// MINIMAP SETUP
		(() => {
			const domain0 = [new Date(this.props.dataset_meta.tstart), this.props.dataset_meta.tstart + this.props.dataset_meta.point_count / this.props.dataset_meta.Fs * 1000];
			const x = d3.scaleTime()
			            .range([0, +this.$minimap_svg.attr('width')])
			            .domain([domain0]);
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
				    	const annotation_ = Object.create(Object.getPrototypeOf(annotation), annotation); // TODO crap. I want to preserve object type but also can't mutate a props object (assuming it's the same memory as the parent's reference)
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
		
		if(this.props.tf !== prevProps.tf)
			this.zoom_to(this.props.tf);
		
		if(this.props.annotating_id != null && this.props.annotating_id !== prevProps.annotating_id) { // second condition might be covered by setState matching
			console.log(this.props.tf);
			// this.zoom_to(d3.transform.)
			this.setState({
				is_annotating: true,
				annotating_id: this.props.annotating_id
			});
		}
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
					gBrush.call(brush.move, [ annotation.get_start(), annotation.get_end() ].map(x));
					
					// add titles as custom handles
					break;
					
			}
		}
	}

	render = () => <div>
		{ !this.state.is_annotating ? null :
			<AnnotateView
				annotation={this.props.annotations.get(this.state.annotating_id) /* for existing annotations */}
				startTime={this.state.annotating_at}
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
				width={this.props.width * this.state.px_ratio * OVERSCALING}
				height={this.props.height * this.state.px_ratio}
				style={{
					width: `${this.props.width * OVERSCALING}px`,
					height: `${this.props.height}px`,
				}}
			/>
		</div>
		<svg className="plot" ref={this.svg} width={this.props.width} height={this.props.height}>
			<g ref={this.area}></g>
			<g ref={this.gBrushes} className="brushes"></g>
			<rect id="zoom" className="zoom" style={{ display: this.props.is_editing ? 'none' : 'block' }} width={this.props.width} height={this.props.height} ref={this.zoom} />
		</svg>
		<canvas ref={this.minimap_canvas} style={{ width: `${this.props.width}px`, height: `${this.props.height}px` }} width={this.props.width * this.state.px_ratio} height={100 * this.state.px_ratio}></canvas>
		<svg ref={this.minimap_svg} width={this.props.width} height={100}>
			<g ref={this.minimap_area} />
		</svg>
	</div>

	// force resampling of data when zoom is done manually
	resampleData = new_domain => {
		// console.log(new_domain);
		const channel_offset = (this.y.domain()[1]-this.y.domain()[0])/(NUM_CH + 2); // +2 leaves gap at bottom and top
		const offset = i => (i + 0.5 - NUM_CH / 2) * channel_offset;
		
		const enclosing_domain = this.data_controller.expand_domain(new_domain);
		this.data_controller.get_data(new_domain)
			.then(data => {
				// draw the data
				// const COLORS = ['#F00', '#0F0', '#00F', '#0FF', '#F0F'];
				if(data.length > 0) {
					// console.log(data[0][0][0], x(data[0][0][0]), data[data.length - 1][data[data.length - 1].length - 1][0], x(data[data.length - 1][data[data.length - 1].length - 1][0]), data.length);
					for(let ch = 0; ch < data[0][0][1].length; ch++) {
						for(let chunk_idx = 0; chunk_idx < data.length; chunk_idx++) {
							const chunk = data[chunk_idx];
							// this.area_ctx.strokeStyle = COLORS[chunk_idx];
							let first_point = true;
							this.area_ctx.beginPath();
							for(const [t, sample] of chunk) {
								(first_point ? this.area_ctx.moveTo : this.area_ctx.lineTo).call(
									this.area_ctx,
									(this.x0(t) - this.px_x_shift) * this.state.px_ratio, (this.y(sample[ch] / (NUM_CH + 2) + offset(channels[ch])) * this.state.px_ratio)
								);
								first_point = false;
							}
							// if(px_x_shift > 0)
							// 	debugger;
							this.area_ctx.stroke();
						}
					}
				}
			}).catch(console.log)
	}
	
	zoom_to = tf => {
		// if has_zoomed is false, the new domain should be the one passed by props
		const new_domain = tf.rescaleX(this.x0).domain();//this.props.has_zoomed ? t_domain : this.props.zoom_times;
		if(new_domain[0] > this.data_controller.domain0[0] && new_domain[1] < this.data_controller.domain0[1]) {
			// limit to dataset window

			const enclosing_domain = this.data_controller.expand_domain(new_domain);
			const did_wrap_right = (this.x0(new_domain[1]) - this.px_x_shift) * this.state.px_ratio > this.area_canvas.current.width,
			did_wrap_left = (this.x0(new_domain[0]) - this.px_x_shift) < 0;
			if(did_wrap_left || did_wrap_right) {
				this.data_controller.clear_visible();
				this.area_ctx.clearRect(0, 0, this.area_canvas.current.width, this.area_canvas.current.height);
				if(did_wrap_right) {
					// wrap around right ; new data will draw off canvas
					// for now, just assume a single data frame is in view
					// when using `this.x` to transform the x-shift in time, we assume that `this.x` is a linear scale; if logarithmic or something else funky then we have to convert that time delta to a px delta more carefully
					this.px_x_shift = this.x0(enclosing_domain[0]) - this.x0(this.domain1[0]);
				}
				else if(did_wrap_left) {
					this.px_x_shift = this.x0(enclosing_domain[1]) - this.area_canvas.current.width / this.state.px_ratio;
				}
			}

			const tf_str = `translate(${tf.x + this.px_x_shift}px, 0) scale(${tf.k}, 1)`;
			this.area_canvas.current.style.transform = tf_str;
			
			// update brushes through x()
			this.updateBrushes();
			
			if(did_wrap_left || did_wrap_right)
				return this.resampleData(new_domain);
			else
				return Q();
		}
	}
}