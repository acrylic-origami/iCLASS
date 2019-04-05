const hdf5 = require('hdf5').hdf5;
const h5lt = require('hdf5').h5lt;
const express = require('express');
const path = require('path');
const { lstatSync, readdirSync, existsSync, createReadStream } = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const csv = require('csv-parser');
const app = express();
const Frac = require('fraction.js');
const { FULL_RES_INTERVAL } = require('./src/consts.js');
const Q = require('q');
var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


const ann_server = require('./annotation_server.js');

const data = new Map([ // TEMP
	// ['EDMSE_pat_FR_1096_002.mat', [
	// 	f, g, Fs[0], tstart,
	// 	f_aux, g_aux
	// ]],
	// ['EDMSE_pat_FR_1096_050.mat', [
	// 	f, g, Fs[0], tstart,
	// 	f_aux, g_aux
	// ]],
]);
Map.prototype.flatten = function() {
	const r = [];
	for(const [k, v] of this)
		r.push([k, v]);

	return r;
}

function data_id(patient, dataset) {
	return `${patient}/${dataset}`;
}

// Fetch directory names in directory 'source'
const isDirectory = source => lstatSync(source).isDirectory();
const getDirectories = source =>
  		readdirSync(source).map(name => path.join(source, name)).filter(isDirectory).map(x => path.win32.basename(x));
// Fetch .mat file names in directory 'source'
const isMat = source => path.extname(source).toLowerCase() == '.mat';
const getMatFiles = source =>
  		readdirSync(source).map(name => path.join(source, name)).filter(isMat).map(x => path.win32.basename(x));

function add_dataset(patient, dataset) {
	const patient_root = `${process.argv[2]}/${patient}`;
	const f_aux = new hdf5.File(`${patient_root}/${dataset.substring(0, dataset.length - 4)}.comp.h5`, require('hdf5/lib/globals.js').ACC_RDONLY)
	const g_aux = f_aux.openGroup('data');

	const f = new hdf5.File(`${patient_root}/${dataset.substring(0, dataset.length - 4)}.mat`, require('hdf5/lib/globals.js').ACC_RDONLY)
	const g = f.openGroup('data');
	const Fs = h5lt.readDataset(g.id, 'Fs');
	const tstart = Date.parse(String.fromCharCode.apply(null, h5lt.readDataset(g.id, 'tstart')).replace('-', ' '));
	
   return new Promise(resolve => {
		const results = new Map();
		const annotation_path = path.join(`${process.argv[2]}/${patient}/${dataset}_annotations.csv`);
		
		if(existsSync(annotation_path)) {
			createReadStream(annotation_path)
			  .pipe(csv())
			  .on('data', ({id, ...rest}) => {
			    results.set(parseInt(id), Object.assign({}, rest, { id }));
			  })
			  .on('end', () => {
			    resolve(results);
			  });
		}
		else {
			// defer actually creating it for the first annotations being sent in; it overwrites anyways
			// when this moves to diffs, then we'll have to create it here
			resolve(results);
		}
	}).then(annotations => data.set(data_id(patient, dataset), [
			f, g, Fs[0], tstart,
			f_aux, g_aux, annotations
		]), // TODO this is really bloating; turn to object so we can reference fields instead of indices
	console.log);
	
	
}

function unflatten(buf, dims, dtype='f', idx=[]) {
	const TypedArray = dtype === 'f' ? Float32Array : Float64Array;
	const n_bytes = TypedArray.BYTES_PER_ELEMENT;
	
	let flat_idx = idx[idx.length - 1];
	for(let i = idx.length - 1; i > 0; i--) {
		flat_idx += idx[i - 1] * dims[i];
	}
	
	switch(dims.length - idx.length) {
		case 1:
			return [].slice.call(new TypedArray(buf.slice(flat_idx * dims[idx.length] * n_bytes, (flat_idx * dims[idx.length] + dims[dims.length - 1]) * n_bytes)));
		// case 2:
		// 	const chunk = [];
		// 	bytes_per_slice = n_bytes * dims[dims.length - 1];
		// 	for(let i = 0; i < dims[dims.length - 2]; i++) {
		// 		chunk.push(new TypedArray(buf.slice(flat_idx + i * bytes_per_slice, flat_idx + (i + 1) * bytes_per_slice)));
		// 	}
		// 	return chunk;
		default:
			const chunks = [];
			for(let i = 0; i < dims[idx.length]; i++)
				chunks.push(unflatten(buf, dims, dtype, idx.concat([i])));
			return chunks;
	}
}

function unflatten_transpose(data_view, dims, time_dim, dtype='f') {
	const n_bytes = dtype === 'f' ? Float32Array.BYTES_PER_ELEMENT : Float64Array.BYTES_PER_ELEMENT;
	
	const other_dims = dims.slice(0, time_dim).concat(dims.slice(time_dim));
	const new_dims = [dims[time_dim]].concat(other_dims);
	
	function make(dims, dim_idx) {
		if(dim_idx < dims.length - 1)
			return [...Array(dims[dim_idx]).keys()].map(_ => make(dims, dim_idx + 1));
		else {
			return new Float64Array(dims[dim_idx]);
		}
	}
	
	const unflat_data = [...Array(dims[time_dim]).keys()].map(_ => make(other_dims, 0));
	
	(function reshape(idx, dim_idx) {
		if(dim_idx < dims.length) {
			for(let i = 0; i < dims[dim_idx]; i++)
				reshape(idx.concat([i]), dim_idx + 1);
		}
		else {
			let flat_idx = idx[idx.length - 1];
			for(let i = idx.length - 1; i > 0; i--) {
				flat_idx += idx[i - 1] * dims[i];
			}
			
			let A = unflat_data[idx[time_dim]];
			let i = 0;
			for(; i < idx.length - 2; i++) {
				A = A[idx[i + (i >= time_dim)]];
			}
			
			try {
				const fl = (dtype === 'f' ? data_view.getFloat32 : data_view.getFloat64).call(data_view, flat_idx * n_bytes, true);
				A[idx[i + (i >= time_dim)]] = fl; // by the order of iteration, we could just use "next bytes" if this was a true buffer
			}
			catch(e) {
				console.log(dims, idx, flat_idx);
				throw e;
			}
		}
	})([], 0);
	
	// const flat_stride = n_bytes * n_rows; // assume row-major
	// const unflat_data = [...Array(n_rows).keys()].map(_ => new Float64Array(n_channels));
	// for(let i = 0; i < n_channels; i++) {
	// 	const packet = new Float64Array(uint8_buf.buffer.slice(i * flat_stride * n_bytes, (i + 1) * flat_stride * n_bytes));
	// 	for(let j = 0; j < n_rows; j++) {
	// 		const stamp = tstart.add(j * stride).mul(1000).div(Fs).valueOf(); // use millis // TODO fix the coefficient `stride / unflat_stride`
	// 		unflat_data[j][i] = [stamp, packet[j]];
	// 	}
	// }
	return unflat_data;
}

app.get('/data', (req, res) => {
	// CONSISTENCY RULE: lower limit is included if equal; upper limit is excluded if equal
	// expect req.query.zoom, req.query.start_N, req.query.start_D, req.query.end_N, req.query.end_D
	// also expect (2^-zoom) divides (start - end)
	const meta = data.get(data_id(req.query.patient, req.query.dataset));
	const dims = meta[0].getDatasetDimensions('/data/signal');
	
	const frac_start = (parseInt(req.query.start_N) * parseInt(req.query.start_D) > 0) ? 
		new Frac(parseInt(req.query.start_N)).div(parseInt(req.query.start_D)) :
		new Frac(0);
	const frac_end = parseInt(req.query.end_N) <= parseInt(req.query.end_D) ?
		new Frac(parseInt(req.query.end_N)).div(parseInt(req.query.end_D)) :
		new Frac(1);
	const inc = new Frac(1).div((1 << parseInt(req.query.zoom)));
	const new_chunks = [];
	for(let running_end = frac_start.add(inc); running_end.compare(frac_end) <= 0; running_end = running_end.add(inc)) {
		const running_start = running_end.sub(inc);
		const int_range = [
			running_start.mul(dims[0]).floor(),
			running_end.mul(dims[0]).sub(1).ceil()
		];
		
		let maybe_stride = int_range[1].sub(int_range[0]).div((FULL_RES_INTERVAL * meta[2])).floor();
		const stride = maybe_stride.compare(1) < 0 ? 1 : maybe_stride.valueOf();
		const count = int_range[1].sub(int_range[0]).div(stride).floor();
		console.log(int_range.map(v => v.valueOf()), stride, count.valueOf());
		const options = { start: [int_range[0].valueOf(), 0], stride: [stride.valueOf(), 1], count: [count.valueOf(), dims[1]]};
		const flat_data_buf = h5lt.readDatasetAsBuffer(meta[1].id, 'signal', options).buffer;
		
		new_chunks.push(unflatten(flat_data_buf, options.count, 'd'));
		
		// new_chunks.push(unflatten(new DataView(flat_data_buf), options.count, 1, 'd'));
	}
	res.send(new_chunks); // let the client figure out the timings
})

app.get('/dataset_meta', (req, res) => {
	// TODO: annotation <-> dataset
	const id = data_id(req.query.patient, req.query.dataset);
	(!data.has(id) ? add_dataset(req.query.patient, req.query.dataset) : Promise.resolve()).then(() => {
		const meta = data.get(id);
		const dims = meta[4].getDatasetDimensions('data/subsamples');
		const flat_subsamples_buf = h5lt.readDatasetAsBuffer(meta[5].id, 'subsamples');
		console.log(meta);
		res.send({
			point_count: meta[0].getDatasetDimensions('/data/signal')[0],
			Fs: meta[2],
			tstart: meta[3],
			subsamples: unflatten(flat_subsamples_buf.buffer, dims),
			annotations: meta[6].flatten()
		});
	})
})

app.get('/get_patients', (req, res) => {
  	const directories = getDirectories(path.join(`${process.argv[2]}/`));
	res.send({patients: directories});
})

app.get('/get_datasets', (req, res) => {
  	const datasets = getMatFiles(path.join(`${process.argv[2]}/${req.query.patientId}`));
	var previous_time = 0;
	let time_covered = 0;
	Q.all(datasets.map(dataset => {
		const id = data_id(req.query.patientId, dataset);
		return (!data.has(id) ? add_dataset(req.query.patientId, dataset) : Promise.resolve()).then(() => {
			const meta = data.get(id);
			const ds = {
				title: dataset,
				start: previous_time + meta[3], // tstart
				end: previous_time + meta[3] + (meta[0].getDatasetDimensions('/data/signal')[0])*(1000/meta[2]) // point_count * (1000/Fs)
			};
			previous_time += 7.8E6;
			time_covered += ds.end - ds.start;
			return ds;
		});
	}), console.log).then(ds => {
		ds.sort((a, b) => {
		  return a.start - b.start;
		});
		// previous_time += ((index == 1) ? 2 : 1) * (datasets[index].end - datasets[index].start);
		// time_covered += (datasets[index].end - datasets[index].start);
		
		res.send({
			datasets: ds,
			min_start: ds[0].start,
			max_end: ds[ds.length - 1].end,
			cover: time_covered/(ds[ds.length - 1].end - ds[0].start)
		});
	}, console.log).catch(console.log);
})

app.use(express.static('public'));

app.post('/save_annotation', (req, res) => {
	// add_dataset('P0', 'EDMSE_pat_FR_1096_002.mat').then(() => {
	// const req = { body: { patient: 'P0', dataset: 'EDMSE_pat_FR_1096_002.mat', annotation: { id: 0, type: 'onset', startTime: '2018-06-05T01:55:58.000Z', notes: '' } } }
	const csvWriter = createCsvWriter({  
	  path: path.join(`${process.argv[2]}/${req.body.patient}/${req.body.dataset}_annotations.csv`),
	  header: [
	    {id: 'id', title: 'id'},
	    {id: 'type', title: 'type'},
	    {id: 'startTime', title: 'startTime'},
	    {id: 'notes', title: 'notes'}
	  ]
	});
	const meta = data.get(data_id(req.body.patient, req.body.dataset));
	meta[6].set(req.body.annotation.id, req.body.annotation);
	csvWriter
	  .writeRecords(meta[6].flatten().map(([k, v]) => v))
	  .then(() => res.send({success: true}));
	// });
})

// For react-router
app.get('*', (req, res) => {
	res.sendFile(path.join(__dirname + '/public/index.html'));
})

app.listen(8080);
// const g = f.openGroup('data');
// const b = h5lt.readDatasetAsBuffer(g.id, 'signal', { start: [0, 0], stride: [1, 1], count: [2, 2] });
// const vs = new Float64Array(b.buffer);
// console.log(vs);