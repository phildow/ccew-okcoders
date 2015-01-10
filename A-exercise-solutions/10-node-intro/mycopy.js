
var fs = require('fs');

var src = process.argv[2];
var dest = process.argv[3];

fs.readFile(src, function(err, data) {
  if (err) {
    console.log("Unable to read file " + src);
  } else {
    fs.writeFile(dest, data, function (err) {
		  if (err) {
		  	console.log("Error writing file to " + dest);
		  } else {
		  	console.log("Copied from " + src + " to " + dest);
		  }
		});
  }
});
