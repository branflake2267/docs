'use strict';

/**
 * Get all the args
 * create a new instance of the module indicated in the CLI command
 * pass the args to the module instance
 *  - run the passed method if one was passed, else run run()
 *  // commonly this will be create-something-app's run()
 */


// set up the arguments handler
const args = require('yargs')
    .option({
        'log': {
            alias       : 'l',
            //type        : 'string',
            description : 'The level of logging output allowed.  Possible options are: log, info, and error.',
            example     : 'node index read-source -log=true',
            array       : true
        },
        'product': {
            alias       : 'prod',
            type        : 'string',
            description : 'The product being processed',
            example     : 'node index read-source -product=extjs'
        },
        'version': {
            alias       : 'v',
            type        : 'string',
            description : 'The product version being processed',
            example     : 'node index read-source -product=extjs -version=6.2.1'
        },
        'toolkit': {
            alias       : 'tk',
            type        : 'string',
            description : 'The product toolkit being processed',
            example     : 'node index read-source -product=extjs -version=6.2.1 -toolkit=classic'
        },
        'forceDoxi': {
            type        : 'boolean',
            description : 'Force doxi to parse the SDK source files',
            example     : 'node index read-source -product=extjs -version=6.2.1 -toolkit=classic'
        },
        'forceSyncRemote': {
            type        : 'boolean',
            description : 'Force a sync between SDK folder and Git',
            example     : 'node index read-source -product=extjs -version=6.2.1 -toolkit=classic'
        }
    })
    .command('command', 'Module to run', { alias: 'command' })
    .help('h')
    .alias('h', 'help')
    .wrap()
    .argv;

//const targets   = ['read-source', 'build-html', 'build-app', 'landing'],
const targets   = ['create-app-html', 'create-app-ext', 'source-api', 'source-guides', 'landing'],
      targetMod = args._[0], // the target module to run
      method    = args._[1] || 'run',
      canRun    = targets.indexOf(targetMod) > -1;

// check to see if a valid module name was passed
// i.e. "node index read-source"
if (canRun) {
    // get the default project options and merge them with the app config
    // TODO see if the 'productIndex' of projectDefaults is even needed after we're all done
    let options = require('./configs/projectDefaults');
    options = Object.assign(options, require('./configs/app'));
    // then merge the CLI params on top of that
    options = Object.assign(options, args);
    options._myRoot = __dirname;

    // create the designated module
    let cls = require('./modules/' + targetMod);
    new cls(options)[method]();
}
