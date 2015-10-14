var argv    = require('argv'),
    package = require('./package.json'),
    debug   = require('./lib/Debug'),
    args;

argv.version('v' + package.version);
argv.info(package.description);

argv.option([
    {
        name        : 'new',
        short       : 'n',
        type        : 'string',
        description : 'Provides the version of the new framework.'
    },
    {
        name        : 'old',
        short       : 'o',
        type        : 'string',
        description : 'Provides the version of the old framework.'
    },
    {
        name        : 'output',
        short       : 'out',
        type        : 'string',
        description : 'The location where the markdown files should be created.'
    }
]);

debug.enable();
debug.disable('log');

args = argv.run();

if (args.options.new && args.options.old && args.options.output) {
    require('./tests/args')(args);
} else {
    console.log('new, old and output arguments are required.');
}

//require('./tests/single')(inputDir, outputDir, newVersion, oldVersion);
//require('./tests/all')(inputDir, outputDir, newVersion, oldVersion);
