const path = require('path');
const csv = require('csv-parser');  
const fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;  

module.exports = {
  annotToCSV: (annotations) => {

	const csvWriter = createCsvWriter({  
	  path: path.join(__dirname +'/patient_data/' + patientId + '/' + patientId + '_annotations.csv'),
	  header: [
	    {id: 'type', title: 'type'},
	    {id: 'startTime', title: 'startTime'},
	    {id: 'notes', title: 'notes'}
	  ]
	});

	csvWriter  
	  .writeRecords(annotations)
	  .then(()=> console.log('The CSV file was written successfully'));
  },
  loadAnnotations: (patientId, dataset) => {
    return new Promise(resolve => {
		console.log('loadAnnotations');

		const results = [];

		fs.createReadStream(path.join(__dirname +'/patient_data/' + patientId + '/' + patientId + '_annotations.csv'))
		  .pipe(csv())
		  .on('data', (row) => {
		  	console.log('push row');
		    results.push(row);
		  })
		  .on('end', () => {
		  	console.log('return results');
		    resolve(results);
		  });
	});
  }
};