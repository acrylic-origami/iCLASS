const hdf5 = require('hdf5').hdf5;
const h5lt = require('hdf5').h5lt;
const express = require('express');
const app = express();
const Frac = require('fraction.js');

const DENSITY = 100; // 100 data points per window width
const f = new hdf5.File('/Users/derek-lam/dev/ISML_N2BL_Sonali_Dey/EU_DATASET/RAW_EU/EDMSE_pat_FR_1096_002.mat', require('hdf5/lib/globals.js').ACC_RDONLY)
const g = f.openGroup('data');
const Fs = h5lt.readDataset(g.id, 'Fs');
const tstart = Date.parse(String.fromCharCode.apply(null, h5lt.readDataset(g.id, 'tstart')).replace('-', ' '));
const data = new Map([ // TEMP
	['EDMSE_pat_FR_1096_002.mat', [f, g, Fs[0], tstart]]
]);
// app.get('/data', (req, res, next) => {
// 	if(req.query.annotation != null && (req.query.start == null || req.query.range == null)) {
// 		req.query.start = 4; // TEMP: to make into promise w/ db call
// 		req.query.range = 2;
// 		next();
// 	}
// 	else {
// 		next();
// 	}
// });
app.get('/data', (req, res) => {
	// CONSISTENCY RULE: lower limit is included if equal; upper limit is excluded if equal
	// expect req.query.zoom, req.query.start_N, req.query.start_D, req.query.end_N, req.query.end_D
	// also expect (2^-zoom) divides (start - end)
	const meta = data.get('EDMSE_pat_FR_1096_002.mat');
	const dims = meta[0].getDatasetDimensions('/data/signal');
	
	const frac_start = new Frac(parseInt(req.query.start_N)).div(parseInt(req.query.start_D));
	const frac_end = new Frac(parseInt(req.query.end_N)).div(parseInt(req.query.end_D));
	const inc = new Frac(1).div((1 << parseInt(req.query.zoom)));
	const new_chunks = [];
	for(let running_end = frac_start.add(inc); running_end.compare(frac_end) <= 0; running_end = running_end.add(inc)) {
		const running_start = running_end.sub(inc);
		const int_range = [
			running_start.mul(dims[1]).floor(),
			running_end.mul(dims[1]).sub(1).ceil()
		];
		console.log(int_range.map(v => v.valueOf()));
		
		let maybe_stride = int_range[1].sub(int_range[0]).div(DENSITY).floor();
		const stride = maybe_stride.compare(1) < 0 ? 1 : maybe_stride;
		const count = int_range[1].sub(int_range[0]).div(stride).floor();
		const options = { start: [0, int_range[0].valueOf()], stride: [1, stride.valueOf()], count: [dims[0], count.valueOf()]};
		// console.log(options);
		const flat_data_buf = h5lt.readDatasetAsBuffer(meta[1].id, 'signal', options);
		const unflat_data = [];
		const unflat_stride = Float64Array.BYTES_PER_ELEMENT * dims[0]; // assume row-major
		for(let i = 0; i < flat_data_buf.length; i += unflat_stride) {
			const packet = new Float64Array(flat_data_buf.buffer.slice(i, i + unflat_stride));
			const stamp = meta[3] + int_range[0].add(i * stride / unflat_stride).mul(1000).div(meta[2]).valueOf(); // use millis
			// console.log(int_range[0].add(i * stride / unflat_stride))
			unflat_data.push([stamp, packet]);
		}
		
		new_chunks.push(unflat_data);
	}
	res.send(new_chunks);
})
// TODO some redundancy in the data methods: fix later
app.get('/annotation', (req, res) => {
	res.send({ dataset: 'EDMSE_pat_FR_1096_002.mat', start: 4, range: 2 });
})
app.get('/dataset_meta', (req, res) => {
	// TODO: annotation <-> dataset
	const meta = data.get(req.query.dataset);
	res.send({ point_count: meta[0].getDatasetDimensions('/data/signal')[1], Fs: meta[2], tstart: meta[3] });
})
app.use(express.static('public'));

app.listen(8080);
// const g = f.openGroup('data');
// const b = h5lt.readDatasetAsBuffer(g.id, 'signal', { start: [0, 0], stride: [1, 1], count: [2, 2] });
// const vs = new Float64Array(b.buffer);
// console.log(vs);