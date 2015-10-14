var debug      = require('./lib/Debug'),
    newVersion = '6.0.1',
    oldVersion = '6.0.0',
    inputDir   = __dirname + '/json/'
    outputDir  = __dirname + '/output/';

debug.enable();
debug.disable('log');

//require('./tests/single')(inputDir, outputDir, newVersion, oldVersion);
require('./tests/all')(inputDir, outputDir, newVersion, oldVersion);
