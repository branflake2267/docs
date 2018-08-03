/* jshint node: true */
'use strict';

const Chalk            = require('chalk'),
      StringSimilarity = require('string-similarity');

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
        log : {
            alias       : 'l',
            default     : 'error',
            description : 'The level of logging output allowed.  Possible options are: log, info, and error.',
            example     : 'node index read-source -log=true',
            array       : true
        },
        product : {
            alias       : 'prod',
            type        : 'string',
            description : 'The product being processed',
            example     : 'node index read-source -product=extjs'
        },
        version : {
            alias       : 'v',
            type        : 'string',
            description : 'The product version being processed',
            example     : 'node index read-source -product=extjs -version=6.2.1'
        },
        toolkit : {
            alias       : 'tk',
            type        : 'string',
            description : 'The product toolkit being processed',
            example     : 'node index read-source -product=extjs -version=6.2.1 -toolkit=classic'
        },
        forceDoxi : {
            type        : 'boolean',
            default     : null,
            description : 'Force doxi to parse the SDK source files',
            example     : 'node index read-source -product=extjs -version=6.2.1 -toolkit=classic'
        },
        syncRemote : {
            type        : 'boolean',
            default     : null,
            description : 'Force a sync between SDK folder and Git',
            example     : 'node index read-source -product=extjs -version=6.2.1 -toolkit=classic'
        },
        production : {
            type        : 'boolean',
            default     : false,
            description : 'Minifies files for production',
            example     : 'node --max-old-space-size=4076 index create-app-html runGuides --product=extjs --version=6.2.1 --production'
        },
        skipSourceFiles : {
            type        : 'boolean',
            default     : false,
            description : 'Skips the creation of the source HTML files for API docs',
            example     : 'node --max-old-space-size=4076 index create-app-html runGuides --product=extjs --version=6.2.1 --skipSourceFiles'
        },
        skipGuides : {
            type        : 'boolean',
            default     : false,
            description : 'Skips the creation of guides',
            example     : 'node --max-old-space-size=4076 index create-app-html runGuides --product=extjs --version=6.2.1 --skipGuides'
        },
        audioAlert : {
            type        : 'boolean',
            default     : true,
            description : 'Skips the audio alert at the end of a build',
            example     : 'node --max-old-space-size=4076 index create-app-html runGuides --product=extjs --version=6.2.1 --audioAlert=false'
        },
        
        cmdPath : {
            type        : 'string',
            description : 'Stipulates the sencha directory -vs- using what\'s on PATH',
            example     : 'node --max-old-space-size=4076 index create-app-html runGuides --product=extjs --version=6.2.1 --cmdPath=../../sencha_cmd/sencha'
        },
        
        buildConfigsDir : {
          required : true,
          type        : 'string',
          description : 'Stipulates the build & configs directory for the site build configs or base output directory is in.',
          example     : 'node --max-old-space-size=4076 index create-app-html runGuides --buildConfigsDir=~/git/docs/build_config_sencha --product=extjs --version=6.2.1 --cmdPath=../../sencha_cmd/sencha'
      },
        
        modifiedOnly : {
            type        : 'boolean',
            default     : false,
            description : 'Outputs only classes whose file is modified',
            example     : 'node --max-old-space-size=4076 index create-app-html runGuides --product=extjs --version=6.2.1 --modifiedOnly'
        },
        
        
        new : {
            type        : 'string',
            default     : null,
            description : 'Provides the new version of the framework from which to execute a diff',
            example     : 'node --max-old-space-size=4076 index create-diff-md --new=6.2.1 --old=6.2.0 --newFile=../foo.json --oldFile=../bar.json'
        },
        old : {
            type        : 'string',
            default     : null,
            description : 'Provides the old version of the framework from which to execute a diff',
            example     : 'node --max-old-space-size=4076 index create-diff-md --new=6.2.1 --old=6.2.0 --newFile=../foo.json --oldFile=../bar.json'
        },
        newFile : {
            type        : 'string',
            default     : null,
            description : 'Provides the new "all file" of the framework from which to execute a diff',
            example     : 'node --max-old-space-size=4076 index create-diff-md --new=6.2.1 --old=6.2.0 --newFile=../foo.json --oldFile=../bar.json'
        },
        oldFile : {
            type        : 'string',
            default     : null,
            description : 'Provides the old "all file" of the framework from which to execute a diff',
            example     : 'node --max-old-space-size=4076 index create-diff-md --new=6.2.1 --old=6.2.0 --newFile=../foo.json --oldFile=../bar.json'
        },
        'verbose-summary' : {
            type        : 'boolean',
            default     : false,
            description : 'True to include verbose summary details, false to keep it simple. Defaults to false'
        },
        'include-class-details' : {
            type        : 'boolean',
            default     : true,
            description : 'True to include class detail changes in the output, false to exclude it. Defaults to true'
        },
        'include-debug-output' : {
            type        : 'boolean',
            default     : false,
            description : 'True to include debug output, false to exclude it. Defaults to false'
        },
        'include-deprecated' : {
            type        : 'boolean',
            default     : false,
            description : 'True to include deprecated changes, false to exclude theme. Defaults to true'
        },
        'include-private' : {
            type        : 'boolean',
            default     : true,
            description : 'True to include private changes, false to exclude theme. Defaults to true'
        },
        
        
        doxiBuild : {
            type        : 'string',
            default     : false,
            description : 'Setting doxiBuild tells the parser to export a particular build target and then stop',
            example     : 'node --max-old-space-size=4076 index create-app-html --product=extjs --version=6.2.1 --doxiBuild=all-classes-flatten'
        },
        diffTarget : {
            type        : 'string',
            description : 'The target product (newer) to diff against',
            example     : 'node --max-old-space-size=4076 index create-diff --diffTarget=extjs --diffTargetVersion=6.2.1 --diffSource=extjs --diffSourceVersion=6.2.0'
        },
        diffTargetVersion : {
            type        : 'string',
            description : 'The target version (newer) to diff against',
            example     : 'node --max-old-space-size=4076 index create-diff --diffTarget=extjs --diffTargetVersion=6.2.1 --diffSource=extjs --diffSourceVersion=6.2.0'
        },
        diffSource : {
            type        : 'string',
            description : 'The source product (older) to diff against',
            example     : 'node --max-old-space-size=4076 index create-diff --diffTarget=extjs --diffTargetVersion=6.2.1 --diffSource=extjs --diffSourceVersion=6.2.0'
        },
        diffSourceVersion : {
            type        : 'string',
            description : 'The source version (older) to diff against',
            example     : 'node --max-old-space-size=4076 index create-diff --diffTarget=extjs --diffTargetVersion=6.2.1 --diffSource=extjs --diffSourceVersion=6.2.0'
        },
        diffTargetPath : {
            type        : 'string',
            description : 'The path to the doxi generated parse of the target (newer) product / version',
            example     : 'node --max-old-space-size=4076 index create-diff --diffTargetPath=/Applications/htdocs/input/extjs/6.2.1/all-classes-flatten/modern_all-classes-flatten.json --diffSourcePath=/Applications/htdocs/input/extjs/6.2.0/all-classes-flatten/modern_all-classes-flatten.json'
        },
        diffSourcePath : {
            type        : 'string',
            description : 'The path to the doxi generated parse of the source (older) product / version',
            example     : 'node --max-old-space-size=4076 index create-diff --diffTargetPath=/Applications/htdocs/input/extjs/6.2.1/all-classes-flatten/modern_all-classes-flatten.json --diffSourcePath=/Applications/htdocs/input/extjs/6.2.0/all-classes-flatten/modern_all-classes-flatten.json'
        },
        diffIgnorePrivate : {
            type        : 'boolean',
            default     : false,
            description : 'True to disregard private classes / members in the diff',
            example     : 'node --max-old-space-size=4076 index create-diff --product=extjs --version=6.2.1 --diffIgnorePrivate'
        },
        forceDiff : {
            type        : 'boolean',
            default     : false,
            description : 'True to force a diff to be created -vs- an existing diff beign returned from disc',
            example     : 'node --max-old-space-size=4076 index create-diff --product=extjs --version=6.2.1 --forceDiff=true'
        },
        skipCreateDiffs : {
            type        : 'boolean',
            default     : false,
            description : 'True to skip creating diffs for the current and past versions (used to auto-populate the @since tags)',
            example     : 'node --max-old-space-size=4076 index create-diff --product=extjs --version=6.2.1 --skipCreateDiffs=true'
        },
        jsonDiffPath : {
            type        : 'string',
            description : 'Path to the json diff file used with the `outputDiffToMarkdown` method',
            example     : 'node --max-old-space-size=4076 index create-diff --product=extjs --version=6.2.1 --jsonDiffFile=diff/output/path'
        },
        diffTitle : {
            type        : 'string',
            description : 'The title to be used in the diff output',
            example     : 'node --max-old-space-size=4076 index create-diff --product=extjs --version=6.2.1 --diffTitle="Example Title"'
        }
    })
    .command('command', 'Module to run', { alias : 'command' })
    .help('h')
    .alias('h', 'help')
    .wrap()
    .argv;

const targets = [ 'create-app-html', 'create-rext-app-html', 'create-app-ext', 'source-api',
                   'source-guides', 'landing', 'create-diff-md', 'reports/locale',
                   'create-diff' ],
      // the target module to run
      [
          targetMod,
          method = 'run'
      ]      = args._,
      canRun = targets.indexOf(targetMod) > -1;

// check to see if a valid module name was passed
// i.e. "node index read-source"
if (canRun) {
    // get the default project options and merge them with the app config
    // TODO see if the 'productIndex' of projectDefaults is even needed after we're all done
    let options = args;

    options._args   = args;

    // Resolve the buildConfigsDir directory, consider directories that might start with ~/ to point to home. 
    console.log('Starting Sencha docs generator...');
    console.log(`CONFIG: options.buildConfigsDir='${options.buildConfigsDir}'`);
    options._myRoot = resolveDirectory(options.buildConfigsDir);
    console.log(`CONFIG: options._myRoot='${options._myRoot}'`);

    // Persist the execution root
    options._execRoot = __dirname;

    // create the designated module
    let cls = require('./modules/' + targetMod);

    cls = new cls(options);

    // if the module instance doesn't have the passed method then throw an error
    if (!cls[method]) {
        console.log(`
            ${Chalk.white.bgRed('ERROR :')} ${targetMod} does not have the method: '${method}'
        `);
        process.exit();
    } else {
        // else, run the method
        cls[method]();
    }
} else {
    let match = StringSimilarity.findBestMatch(
        targetMod,
        targets
    ),
    proposed = match.bestMatch.target;

    console.log(`
        ${Chalk.white.bgRed('ERROR :')} '${Chalk.gray(targetMod)}' is not a valid module name'
        Possible match : ${Chalk.gray(proposed)}
    `);
    process.exit();
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
