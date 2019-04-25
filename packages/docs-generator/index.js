#!/usr/bin/env node --max_old_space_size=4096

/* jshint node: true */
'use strict';

const Chalk = require('chalk'),
    StringSimilarity = require('string-similarity'),
    Path = require('path');

/**
 * Get all the args
 * create a new instance of the module indicated in the CLI command
 * pass the args to the module instance
 *  - run the passed method if one was passed, else run run()
 *  // commonly this will be create-something-app's run()
 */

// set up the arguments handler
const args = require('yargs')
    .options({
        'log': {
            'alias': 'l',
            'default': 'error',
            'description': 'The level of logging output allowed.  Possible options are: log, info, and error.',
            'example': 'sencha-docs-generator read-source -log=true',
            'array': true
        },
        'product': {
            'alias': 'prod',
            'type': 'string',
            'description': 'The product being processed',
            'example': 'sencha-docs-generator read-source -product=extjs'
        },
        'productVersion': {
            'alias': 'pv',
            'type': 'string',
            'description': 'The product version being processed',
            'example': 'sencha-docs-generator read-source -product=extjs -version=6.2.1'
        },
        'toolkit': {
            'alias': 'tk',
            'type': 'string',
            'description': 'The product toolkit being processed',
            'example': 'sencha-docs-generator read-source -product=extjs -version=6.2.1 -toolkit=classic'
        },
        'forceDoxi': {
            'type': 'boolean',
            'default': null,
            'description': 'Force doxi to parse the SDK source files',
            'example': 'sencha-docs-generator read-source -product=extjs -version=6.2.1 -toolkit=classic'
        },
        'syncRemote': {
            'type': 'boolean',
            'default': null,
            'description': 'Force a sync between SDK folder and Git',
            'example': 'sencha-docs-generator read-source -product=extjs -version=6.2.1 -toolkit=classic'
        },
        'production': {
            'type': 'boolean',
            'default': false,
            'description': 'Minifies files for production',
            'example': 'sencha-docs-generator create-app-html runGuides --product=extjs --version=6.2.1 --production'
        },
        'skipSourceFiles': {
            'type': 'boolean',
            'default': false,
            'description': 'Skips the creation of the source HTML files for API docs',
            'example': 'sencha-docs-generator create-app-html runGuides --product=extjs --version=6.2.1 --skipSourceFiles'
        },
        'skipGuides': {
            'type': 'boolean',
            'default': false,
            'description': 'Skips the creation of guides',
            'example': 'sencha-docs-generator create-app-html runGuides --product=extjs --version=6.2.1 --skipGuides'
        },

        'buildConfigsDir': {
            'required': true,
            'type': 'string',
            'description': 'Stipulates the build & configs directory for the site build configs or base output directory is in.',
            'example': 'sencha-docs-generator create-app-html runGuides --buildConfigsDir=~/build-config-sencha --product=extjs --version=6.2.1'
        },

        'modifiedOnly': {
            'type': 'boolean',
            'default': false,
            'description': 'Outputs only classes whose file is modified',
            'example': 'sencha-docs-generator create-app-html runGuides --product=extjs --version=6.2.1 --modifiedOnly'
        },


        'new': {
            'type': 'string',
            'default': null,
            'description': 'Provides the new version of the framework from which to execute a diff',
            'example': 'sencha-docs-generator create-diff-md --new=6.2.1 --old=6.2.0 --newFile=../foo.json --oldFile=../bar.json'
        },
        'old': {
            'type': 'string',
            'default': null,
            'description': 'Provides the old version of the framework from which to execute a diff',
            'example': 'sencha-docs-generator create-diff-md --new=6.2.1 --old=6.2.0 --newFile=../foo.json --oldFile=../bar.json'
        },
        'newFile': {
            'type': 'string',
            'default': null,
            'description': 'Provides the new "all file" of the framework from which to execute a diff',
            'example': 'sencha-docs-generator   create-diff-md --new=6.2.1 --old=6.2.0 --newFile=../foo.json --oldFile=../bar.json'
        },
        'oldFile': {
            'type': 'string',
            'default': null,
            'description': 'Provides the old "all file" of the framework from which to execute a diff',
            'example': 'sencha-docs-generator create-diff-md --new=6.2.1 --old=6.2.0 --newFile=../foo.json --oldFile=../bar.json'
        },
        'verbose-summary': {
            'type': 'boolean',
            'default': false,
            'description': 'True to include verbose summary details, false to keep it simple. Defaults to false'
        },
        'include-class-details': {
            'type': 'boolean',
            'default': true,
            'description': 'True to include class detail changes in the output, false to exclude it. Defaults to true'
        },
        'include-debug-output': {
            'type': 'boolean',
            'default': false,
            'description': 'True to include debug output, false to exclude it. Defaults to false'
        },
        'include-deprecated': {
            'type': 'boolean',
            'default': false,
            'description': 'True to include deprecated changes, false to exclude theme. Defaults to true'
        },
        'include-private': {
            'type': 'boolean',
            'default': true,
            'description': 'True to include private changes, false to exclude theme. Defaults to true'
        },


        'doxiBuild': {
            'type': 'string',
            'default': false,
            'description': 'Setting doxiBuild tells the parser to export a particular build target and then stop',
            'example': 'sencha-docs-generator create-app-html --product=extjs --version=6.2.1 --doxiBuild=all-classes-flatten'
        },
        'diffTarget': {
            'type': 'string',
            'description': 'The target product (newer) to diff against',
            'example': 'sencha-docs-generator create-diff --diffTarget=extjs --diffTargetVersion=6.2.1 --diffSource=extjs --diffSourceVersion=6.2.0'
        },
        'diffTargetVersion': {
            'type': 'string',
            'description': 'The target version (newer) to diff against',
            'example': 'sencha-docs-generator create-diff --diffTarget=extjs --diffTargetVersion=6.2.1 --diffSource=extjs --diffSourceVersion=6.2.0'
        },
        'diffSource': {
            'type': 'string',
            'description': 'The source product (older) to diff against',
            'example': 'sencha-docs-generator create-diff --diffTarget=extjs --diffTargetVersion=6.2.1 --diffSource=extjs --diffSourceVersion=6.2.0'
        },
        'diffSourceVersion': {
            'type': 'string',
            'description': 'The source version (older) to diff against',
            'example': 'sencha-docs-generator create-diff --diffTarget=extjs --diffTargetVersion=6.2.1 --diffSource=extjs --diffSourceVersion=6.2.0'
        },
        'diffTargetPath': {
            'type': 'string',
            'description': 'The path to the doxi generated parse of the target (newer) product / version',
            'example': 'sencha-docs-generator create-diff --diffTargetPath=/Applications/htdocs/input/extjs/6.2.1/all-classes-flatten/modern_all-classes-flatten.json --diffSourcePath=/Applications/htdocs/input/extjs/6.2.0/all-classes-flatten/modern_all-classes-flatten.json'
        },
        'diffSourcePath': {
            'type': 'string',
            'description': 'The path to the doxi generated parse of the source (older) product / version',
            'example': 'sencha-docs-generator create-diff --diffTargetPath=/Applications/htdocs/input/extjs/6.2.1/all-classes-flatten/modern_all-classes-flatten.json --diffSourcePath=/Applications/htdocs/input/extjs/6.2.0/all-classes-flatten/modern_all-classes-flatten.json'
        },
        'diffIgnorePrivate': {
            'type': 'boolean',
            'default': false,
            'description': 'True to disregard private classes / members in the diff',
            'example': 'sencha-docs-generator create-diff --product=extjs --version=6.2.1 --diffIgnorePrivate'
        },
        'forceDiff': {
            'type': 'boolean',
            'default': false,
            'description': 'True to force a diff to be created -vs- an existing diff beign returned from disc',
            'example': 'sencha-docs-generator create-diff --product=extjs --version=6.2.1 --forceDiff=true'
        },
        'jsonDiffPath': {
            'type': 'string',
            'description': 'Path to the json diff file used with the `outputDiffToMarkdown` method',
            'example': 'sencha-docs-generator create-diff --product=extjs --version=6.2.1 --jsonDiffFile=diff/output/path'
        },
        'diffTitle': {
            'type': 'string',
            'description': 'The title to be used in the diff output',
            'example': 'sencha-docs-generator create-diff --product=extjs --version=6.2.1 --diffTitle="Example Title"'
        }
    })
    .command('sencha-docs-generator', 'Choose entry module: [create-app-html, create-rext-app-html, source-api, source-guides, landing, create-diff-md, reports/locale, create-diff] [options]')
    .help()
    .argv;

const targets = [
        'create-app-html',
        'create-rext-app-html',
        'source-api',
        'source-guides',
        'landing',
        'create-diff-md',
        'reports/locale',
        'create-diff'
    ];
const [ targetMod, method = 'run' ] = args._;

// Only run if a target has been provided
const canRun = targets.indexOf(targetMod) > -1;
if (!canRun) {
    let match = StringSimilarity.findBestMatch(targetMod, targets);
    let proposed = match.bestMatch.target;
    console.log(`
        ${Chalk.white.bgRed('ERROR :')} '${Chalk.gray(targetMod)}' is not a valid module name'
        Possible match : ${Chalk.gray(proposed)} `);
    process.exit();
}

console.log('\n\nStarting the Sencha docs generator...');

var pjson = require('./package.json');
console.log('Docs Site Generator app version=' + pjson.version + '\n');

// Get the default project options and merge them with the app config
// TODO see if the 'productIndex' of projectDefaults is even needed after we're all done
let options = args;
options._args = args;
// TODO rename version to productVersion. This is because yargs, supports version as the bin process version.
options.version = args.productVersion;

// TODO add argument for building offlinedocs, turning on or off
options.outputOffline = true;

// Resolve the buildConfigsDir directory, consider directories that might start with ~/ to point to home. 
options._myRoot = resolveDirectory(options.buildConfigsDir);

// Persist the execution root
options._execRoot = __dirname;

console.log(`CONFIG: options._execRoot=${options._execRoot} - execution root.`);
console.log(`CONFIG: options._myRoot=${options._myRoot} - build configs project root.`);

// Load target module and execute it
let cls = require('./modules/' + targetMod);
cls = new cls(options);

// if the module instance doesn't have the passed method then throw an error
if (!cls[method]) {
    console.log(`${Chalk.white.bgRed('ERROR :')} ${targetMod} does not have the method: '${method}'`);
    process.exit();
} else {
    cls[method](); // else, run the method
}


// TODO test with windows home %dir%
function resolveDirectory(dir) {
    const path = require('path');

    // pass the directory on, possibly nothing to resolve
    var p = dir;

    // resolve *nix systems home var
    if (dir.includes('~')) {
        p = path.join(process.env.HOME, dir.slice(1));
    }

    return p;
}
