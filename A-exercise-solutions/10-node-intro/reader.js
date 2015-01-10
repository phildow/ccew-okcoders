
var fs = require('fs');

var filename = process.argv[2];

fs.readFile(filename, function(err, data) {
    if (err) {
        console.log("Unable to read file test.txt");
    } else {
        console.log("File Contents:");
        console.log(data.toString());
    }
});
