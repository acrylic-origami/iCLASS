import React from 'react';
import * as d3 from './d3';
import * as dateFormat from 'dateFormat';
import * as d3_multi from 'd3-selection-multi';

export default class extends React.Component {
	constructor(props) {
		super(props);

		this.d_minimap_svg = React.createRef();
		this.d_minimap_area = React.createRef();
		this.d_minimap_text_area = React.createRef();

		this.gBrushes = React.createRef();

		this.$d_minimap_svg = d3.select(this.d_minimap_svg.current);
		this.$d_minimap_area = d3.select(this.d_minimap_area.current);
		this.$d_minimap_text_area = d3.select(this.d_minimap_text_area.current);


	}

	componentDidMount() {
		this.$d_minimap_svg = d3.select(this.d_minimap_svg.current);
		this.$d_minimap_area = d3.select(this.d_minimap_area.current);
		this.$d_minimap_text_area = d3.select(this.d_minimap_text_area.current);

		this.$gBrushes = d3.select(this.gBrushes.current);

		this.brush = d3.brushX()
    					.extent([[0, 0], [this.props.width, this.props.height]]);

		this.$gBrushes.insert("g", '.brush')
				              .attr("class", "d-minimap-brush")
				              .attr('id', "d-minimap-brush")
				              .call(this.brush);

		this.onDatasetUpdate();
	}

	componentDidUpdate(prevProps, prevState) {
		if(prevProps.brush_t.start !== this.props.brush_t.end) {
			// Move the brush to the correct location
			const gBrush = d3.select('.d-minimap-brush');
			gBrush.call(brush.move, [this.x(this.props.brush_t.start), this.x(this.props.brush_t.end)]);
		}
	}

	render = () =>
		<div>
			<svg ref={this.d_minimap_svg} width={this.props.width} height={this.props.height}>
				<g ref={this.d_minimap_area}></g>
				<g ref={this.d_minimap_text_area}></g>
				<g ref={this.gBrushes} className="d-brushes"></g>
			</svg>
		</div>

	onDatasetUpdate = () => {
		// d_MINIMAP SETUP
		(() => {
			const domain0 = [new Date(this.props.min_start), (new Date(this.props.max_end))];

			this.x = d3.scaleTime()
			            .range([0, +this.$d_minimap_svg.attr('width')])
			            .domain(domain0);

			const y = d3.scaleLog()
			            .range([+this.$d_minimap_svg.attr('height'), 0])
			            .domain([0, this.props.height]);

			const x_ax = d3.axisBottom(this.x),
			      y_ax = d3.axisLeft(y);
			      
			const h_x_ax = this.$d_minimap_area.append('g').attr('class', 'axis axis--x').call(x_ax);
			const h_y_ax = this.$d_minimap_area.append('g').attr('class', 'axis axis--y').call(y_ax);
			
			const that = this;
			this.$d_minimap_area.selectAll('rect')
			                  .data(this.props.datasets)
			                  .enter()
			                  .append('rect')
			                  .each(function (d, i) {
			                  	d3.select(this).attrs({
				                  	'class': 'd_minimap-chart-ele',
				                  	'x': that.x(new Date(d.start)),
				                  	'y': 0,
				                  	'width': that.x(new Date(d.end)) - that.x(new Date(d.start)),
				                  	'height': that.props.height,
				                  	'fill': 'green'
				                  })
			                  	  .style("opacity", 0.5)
			                  });

			const text_selection = this.$d_minimap_text_area.selectAll('text')
			                  .data(this.props.datasets)
			                  .enter();
			text_selection.append('text')
			              .each(function (d, i) {
			                  	d3.select(this).attrs({
				                    'class': 'd_minimap-chart-title',
				                  	'x': that.x(new Date(d.start)),
				                  	'y': ((i + 2)*((that.props.height - 2)/(that.props.datasets.length + 1)))
				                }).text((i + 1) + ": " + d.title)
				                .style("text-anchor", "left")
				                .style("font-size", Math.min(0.7*((that.props.height - 2)/(that.props.datasets.length + 1)), 14))
						  });

			// Move the bruush into place and remove editability
			const gBrush = d3.select('.d-minimap-brush');
			gBrush.call(this.brush.move, [this.x(this.props.brush_t.start), this.x(this.props.brush_t.end)]);

			// text_selection.append('text')
			//               .each(function (d, i) {
			//                   	console.log('were in');
			//                   	console.log(d);
			//                   	d3.select(this).attrs({
			// 	                    'class': 'd_minimap-chart-title',
			// 	                  	'x': x(new Date(d.end)),
			// 	                  	'y': ((i + 2)*((that.props.height - 2)/(that.props.datasets.length + 1)))
			// 	                }).text(i + 1)
			// 	                .style("text-anchor", "middle")
			// 	                .style("font-size", Math.min(0.7*((that.props.height - 2)/(that.props.datasets.length + 1)), 14))
			// 			  });

		})();
	}
}