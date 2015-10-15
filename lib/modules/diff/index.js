var fs     = require('fs'),
    path   = require('path'),
    Parser = require('./Parser'),
    Output = require('./Output'),
    Utils  = require('./Utils'),
    mkdirp = require('mkdirp');

/**
 * Diff class to check API differences between two different versions.
 *
 * @cfg {Array} targets An array of two target JSON files to read APIs from. There
 * **must** be two targets provided, first is the new API and the second is the old API.
 * @cfg {Object} options An object of command line options. Options are:
 *
 *  - --new/-n          required The version of the new API.
 *  - --old/-o          required The version of the old API.
 *  - --destination/-d  required The location the generated markdown will be placed.
 *
 * Sample commands to invoke this class:
 *
 *     node index diff -n 6.0.1 -o 6.0.0 -d ./output ./json/current/classic-all-classes.json ./json/old/classic-all-classes.json
 *     node index diff --new=6.0.1 --old=6.0.0 --destination=./output ./json/current/classic-all-classes.json ./json/old/classic-all-classes.json
 */
function Diff(targets, options) {
    this.options = options;
    this.targets = targets;

    var output = options.destination || __dirname + '/../../output/';

    if (output.substr(-1) !== '/') {
        output += '/';
    }

    options.destination = path.normalize(output);
}

/**
 * Method to register this module's command line arguments.
 *
 * @static
 * @cfg {argv} argv The argv node module.
 */
Diff.register = function(argv) {
    argv.mod({
        mod         : 'diff',
        description : 'Find diff and stuff',
        options     : [
            {
                name        : 'new',
                short       : 'n',
                type        : 'string',
                description : 'Provides the version of the new framework.',
                example     : '`index json-parser --new=6.0.1` or `index json-parser -n 6.0.1`'
            },
            {
                name        : 'old',
                short       : 'o',
                type        : 'string',
                description : 'Provides the version of the old framework.',
                example     : '`index json-parser --old=6.0.1` or `index json-parser -o 6.0.1`'
            },
            {
                name        : 'destination',
                short       : 'd',
                type        : 'string',
                description : 'The destination location of the generated markdown. Defaults to "./output".',
                example     : '`index json-parser --destination=./output` or `index json-parser -d ./output`'
            }
        ]
    });
};

/**
 * Checks to see if the required command line arguments are present.
 *
 * @return {Boolean}
 */
Diff.prototype.checkArgs = function() {
    var options = this.options;

    return options.new && options.old && this.targets.length === 2;
};

/**
 * Runs the diff and generates the markdown in the destination location.
 */
Diff.prototype.run = function() {
    var targets        = this.targets,
        options        = this.options,
        newAllClasses  = JSON.parse(fs.readFileSync(targets[0], 'utf8')).global.items,
        oldAllClasses  = JSON.parse(fs.readFileSync(targets[1], 'utf8')).global.items,
        newVersion     = options.new,
        oldVersion     = options.old,
        outputDir      = options.destination,
        i              = 0,
        length         = newAllClasses.length,
        addedOutput    = [],
        modifiedOutput = [],
        removedOutput  = [],
        totalOutput    = [
            '# Diff between ' + newVersion + ' and ' + oldVersion
        ],
        newCls, oldCls,
        parser, diff,
        output, markdown;

    for (; i < length; i++) {
        newCls = newAllClasses[i];
        oldCls = Utils.getMatch('name', newCls.name, oldAllClasses);

        if (oldCls) {
            parser   = new Parser(newCls, oldCls);
            diff     = parser.exec();
            output   = new Output(diff);
            markdown = output.markdown();

            if (markdown) {
                if (modifiedOutput.length) {
                    modifiedOutput.push('');
                }

                modifiedOutput.push(markdown);
            }
        } else {
            addedOutput.push(' - ' + newCls.name);
        }
    }

    i      = 0;
    length = oldAllClasses.length;

    for (; i < length; i++) {
        oldCls = oldAllClasses[i];
        newCls = Utils.getMatch('name', oldCls.name, newAllClasses);

        if (!newCls) {
            removedOutput.push(' - ' + oldCls.name);
        }
    }

    if (addedOutput.length) {
        if (totalOutput.length) {
            totalOutput.push('');
        }

        totalOutput.push('## Added');

        totalOutput = totalOutput.concat(addedOutput);
    }

    if (removedOutput.length) {
        if (totalOutput.length) {
            totalOutput.push('');
        }

        totalOutput.push('## Removed');

        totalOutput = totalOutput.concat(removedOutput);
    }

    if (modifiedOutput.length) {
        if (totalOutput.length) {
            totalOutput.push('');
        }

        totalOutput.push('## Modified');

        totalOutput = totalOutput.concat(modifiedOutput);
    }

    mkdirp.sync(outputDir);

    fs.writeFile(outputDir + oldVersion + '_to_' + newVersion + '_changes.md', totalOutput.join('\n'), 'utf8');
};

module.exports = Diff;
