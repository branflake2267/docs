'use strict';

const fs     = require('fs');
const argv   = require('argv');
const Parser = require('./Parser');
const Output = require('./Output');
const Utils  = require('./Utils');
const mkdirp = require('mkdirp');
const debug  = require('./Debug');

const categories = [{
    name  : 'configs',
    label : 'Configs'
},{
    name  : 'properties',
    label : 'Properties'
},{
    name  : 'property',
    label : 'Property'
},{
    name  : 'static-properties',
    label : 'Static Properties'
},{
    name  : 'methods',
    label : 'Methods'
},{
    name  : 'method',
    label : 'Method'
},{
    name  : 'static-methods',
    label : 'Static Methods'
},{
    name  : 'events',
    label : 'Events'
},{
    name  : 'event',
    label : 'Event'
},{
    name  : 'vars',
    label : 'Vars'
}];

const classProps = [{
    name  : 'alias',
    label : 'Alias'
},{
    name  : 'alternateClassNames',
    label : 'Alternate Class Names'
},{
    name  : 'extends',
    label : 'Extends'
},{
    name  : 'mixins',
    label : 'Mixins'
},{
    name  : 'uses',
    label : 'Uses'
},{
    name  : 'singleton',
    label : 'Singleton'
},{
    name  : 'access',
    label : 'Access'
},{
    name  : 'requires',
    label : 'Requires'
}];

//enable the logger but disable the log level, info and error will still show
debug.enable();
debug.disable('log');

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
class Diff {
    constructor (targets, options) {

        Diff.register(argv);

        let args = argv.run();

        this.options = options = args.options;

        this.targets = args.targets;

        this.summary = {};
        this.includeDebugOutput = options['include-debug-output'];
        this.includeVerboseSummary = options['verbose-summary'];
        this.countMasterKey = 'all';
        this.countTypes = ['all', 'private', 'deprecated'];
        this.outputOptions = {
            private: options['include-private'],
            deprecated: options['include-deprecated'],
            class: options['include-class-details']
        };

        this.run();
    }

    get defaultOptions () {
        return {
            destination : {
                type  : 'path',
                value : __dirname + '/../../output/'
            },
            'include-private': true,
            'include-deprecated': true,
            'include-debug-output': false,
            'include-class-details': true,
            'verbose-summary': false
        };
    }

    static register (argv) {
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
                },
                {
                    name        : 'include-private',
                    short       : 'p',
                    type        : 'boolean',
                    description : 'True to include private changes, false to exclude theme. Defaults to true',
                    example     : '`index json-parser --include-private=true` or `index json-parser -p false`'
                },
                {
                    name        : 'include-deprecated',
                    short       : 'x',
                    type        : 'boolean',
                    description : 'True to include deprecated changes, false to exclude theme. Defaults to true',
                    example     : '`index json-parser --include-deprecated=true` or `index json-parser -x false`'
                },
                {
                    name        : 'include-debug-output',
                    short       : 'j',
                    type        : 'boolean',
                    description : 'True to include debug output, false to exclude it. Defaults to false',
                    example     : '`index json-parser --include-debug-output=true` or `index json-parser -j false`'
                },
                {
                    name        : 'include-class-details',
                    short       : 'c',
                    type        : 'boolean',
                    description : 'True to include class detail changes in the output, false to exclude it. Defaults to true',
                    example     : '`index json-parser --include-class-details=true` or `index json-parser -c false`'
                },
                {
                    name        : 'verbose-summary',
                    short       : 'v',
                    type        : 'boolean',
                    description : 'True to include verbose summary details, false to keep it simple. Defaults to false',
                    example     : '`index json-parser --verbose-summary=true` or `index json-parser -v false`'
                }
            ]
        });
    }

    checkArgs () {
        let options = this.options;

        return options.new && options.old && this.targets.length === 2;
    }

    formatChange (title, arr, totalOutput) {
        if (arr.length) {
            if (totalOutput.length) {
                totalOutput.push('');
            }

            totalOutput.push('## ' + title);

            totalOutput.push(arr.join('\n'));
        }
    }

    formatSummary (totalOutput) {
        let me            = this,
            summary       = me.summary,
            summaryOutput = [
                '',
                '## Summary'
            ];

        me.formatSummaryType('classes', 'Classes', summaryOutput);

        categories.forEach(function(category) {
            me.formatSummaryType(category.name, category.label, summaryOutput);
        });

        totalOutput.push(summaryOutput.join('\n'));
    }

    getSummaryActionLine (type, action, title, totals) {
        let me = this,
            content = '',
            subtotals;

        if (totals[action]) {
            content = '   - ' + Utils.formatNumber(totals[action]) + ' ' + Utils.capitalize(action);

            me.countTypes.forEach(function(countType) {
                subtotals = me.getSummaryTotals(type, countType);
                if (me.outputOptions[countType] && subtotals[action]) {
                    content += ' (' + Utils.formatNumber(subtotals[action]) + ' ' + Utils.capitalize(countType) + ')';
                }
            });
        }

        return content;
    }

    formatSummaryType (type, title, summaryOutput) {
        let me = this,
            keys = ['added', 'modified', 'removed'],
            summaryType = me.summary[type],
            totals, summaryLine;

        if (summaryType) {
            if (!summaryOutput) {
                summaryOutput = title;
                title         = null;
            }

            if (!title) {
                title = Utils.capitalize(type);
            }

            totals = this.getSummaryTotals(type, me.countMasterKey, true);

            if (totals.total) {
                summaryOutput.push(' - ' + Utils.formatNumber(totals.total) + (type === 'classes' ? ' ' : ' Class ') + title);

                if (me.includeVerboseSummary) {
                    keys.forEach(function(key) {
                        summaryLine = me.getSummaryActionLine(type, key, title, totals);

                        if (summaryLine) {
                            summaryOutput.push(summaryLine);
                        }
                    });
                }    
            }        
        }
    }

    getSummaryTotals (type, bucket, isMain) {
        let me = this,
            summaryType = this.summary[type],
            keys = ['total', 'added', 'modified', 'removed'],
            totals = {};

        if (summaryType && summaryType[bucket]) {
            keys.forEach(function(key) {
                totals[key] = summaryType[bucket][key];

                if (isMain) {
                    me.countTypes.forEach(function(countType) {
                        if (countType !== me.countMasterKey && !me.outputOptions[countType]) {
                            totals[key] -= summaryType[countType][key] || 0;
                        }
                    });
                }
            });
        }

        return totals;
    }

    addParserCounts (parser) {
        let me = this,
            summary = this.summary;

        categories.forEach(function(category) {
            let type        = category.name,
                keys        = me.countTypes,
                summaryType = summary[type],
                name, count, numKey;

            if (!summaryType) {
                summaryType = summary[type] = keys.reduce(function(result, key) {
                    result[key + 'Changes'] = 0;
                    return result;
                }, {});
            }

            keys.forEach(function(key) {
                count = parser[type + 'Count'][key];
                numKey = key + 'Changes';
                for (name in count) {
                    if (summaryType[key] == null) {
                        summaryType[key] = {};
                    }
                    if (summaryType[key][name] == null) {
                        summaryType[key][name] = 0;
                    }

                    summaryType[key][name] += count[name];

                    if (name !== 'total') {
                        summaryType[numKey] += count[name];
                    }
                }
            })         
        });
    }

    addClassCount (action) {
        let summary  = this.summary,
            clsCount = summary.classes,
            masterKey = this.countMasterKey;

        if (!clsCount) {
            clsCount = summary.classes = this.countTypes.reduce(function(result, key) {
                result[key] = {};
                return result;
            }, {});
        }

        if (clsCount[masterKey][action] == null) {
            clsCount[masterKey][action] = 0;
        }

        ++clsCount[masterKey][action];
    }

    run () {
        let me             = this,
            targets        = me.targets,
            options        = me.options,
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
            totalOutput    = [],
            newCls, oldCls,
            parser, diff,
            output, markdown;

        for (; i < length; i++) {
            newCls = newAllClasses[i];
            oldCls = Utils.getMatch('name', newCls.name, oldAllClasses);

            // skip any ignored classes
            if (newCls.ignore) {
                continue;
            }

            me.addClassCount('total');

            if (oldCls) {
                parser = new Parser({
                    newData: newCls,
                    oldData: oldCls,
                    outputOptions: this.outputOptions,
                    countTypes: this.countTypes,
                    countMasterKey: this.countMasterKey,
                    categories: categories,
                    classProps: classProps
                });

                diff   = parser.exec();

                me.addParserCounts(parser);

                if (parser.totalCount) {
                    output   = new Output({
                        diff: diff,
                        outputOptions: this.outputOptions,
                        countTypes: this.countTypes,
                        countMasterKey: this.countMasterKey,
                        includeDebugOutput: this.includeDebugOutput,
                        categories: categories,
                        classProps: classProps
                    });
                    markdown = output.markdown();

                    if (markdown) {
                        if (modifiedOutput.length) {
                            modifiedOutput.push('');
                        }

                        me.addClassCount('modified');

                        modifiedOutput.push(markdown);
                    }
                }
            } else {
                me.addClassCount('added');

                addedOutput.push(' - ' + newCls.name);
            }
        }

        i      = 0;
        length = oldAllClasses.length;

        for (; i < length; i++) {
            oldCls = oldAllClasses[i];
            newCls = Utils.getMatch('name', oldCls.name, newAllClasses);

            // we only want to count it if the item is a class; we don't care about detached comments
            // also skip any ignored classes
            if (!newCls && oldCls.$type==='class' && !oldCls.ignore) {
                me.addClassCount('removed');

                removedOutput.push(' - ' + oldCls.name);
            }
        }

        me.formatChange('Added',    addedOutput,    totalOutput);
        me.formatChange('Removed',  removedOutput,  totalOutput);
        me.formatChange('Modified', modifiedOutput, totalOutput);

        if (!totalOutput.length) {
            totalOutput.push('No changes found!!!');
        }

        totalOutput.unshift('# Diff between ' + newVersion + ' and ' + oldVersion);

        me.formatSummary(totalOutput);

        mkdirp.sync(outputDir);

        fs.writeFile(outputDir + oldVersion + '_to_' + newVersion + '_changes.md', totalOutput.join('\n'), 'utf8');
    }
}

module.exports = Diff;

new Diff();