'use strict';

const fs     = require('fs');
const util   = require('util');
const Base   = require('../base');
const Parser = require('./Parser');
const Output = require('./Output');
const Utils  = require('../shared/Utils');
const mkdirp = require('mkdirp');

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

class Diff extends Base {
    constructor (targets, options) {
        super(targets, options);

        this.summary = {};
        this.includePrivates = options['include-privates'];
        this.includeDebugOutput = options['include-debug-output'];
    }

    get defaultOptions () {
        return {
            destination : {
                type  : 'path',
                value : __dirname + '/../../output/'
            },
            'include-privates': true,
            'include-debug-output': false
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
                    name        : 'include-privates',
                    short       : 'p',
                    type        : 'boolean',
                    description : 'True to include private changes, false to exclude theme. Defaults to true',
                    example     : '`index json-parser --include-privates=true` or `index json-parser -p false`'
                },
                {
                    name        : 'include-debug-output',
                    short       : 'j',
                    type        : 'boolean',
                    description : 'True to include debug output, false to exclude it. Defaults to false',
                    example     : '`index json-parser --include-debug-output=true` or `index json-parser -j false`'
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

        me.formatSummaryType('classes',                                summaryOutput);
        me.formatSummaryType('configs',                                summaryOutput);
        me.formatSummaryType('properties',                             summaryOutput);
        me.formatSummaryType('property',                               summaryOutput); //doc error?
        me.formatSummaryType('static-properties', 'Static Properties', summaryOutput);
        me.formatSummaryType('methods',                                summaryOutput);
        me.formatSummaryType('method',                                 summaryOutput); //doc error?
        me.formatSummaryType('static-methods',    'Static Methods',    summaryOutput);
        me.formatSummaryType('events',                                 summaryOutput);
        me.formatSummaryType('event',                                  summaryOutput); //doc error?
        me.formatSummaryType('vars',                                   summaryOutput);

        totalOutput.push(summaryOutput.join('\n'));
    }

    formatSummaryType (type, title, summaryOutput) {
        let summaryType = this.summary[type],
            totals, privateTotals;
        if (summaryType) {
            if (!summaryOutput) {
                summaryOutput = title;
                title         = null;
            }

            if (!title) {
                title = Utils.capitalize(type);
            }
            totals = this.getSummaryTotals(type, 'everything', !this.includePrivates);
            privateTotals = this.getSummaryTotals(type, 'privates');

            summaryOutput.push(' - ' + Utils.formatNumber(totals.total) + (type === 'classes' ? ' ' : ' Class ') + title);

            if (totals.added) {
                summaryOutput.push('   - ' + Utils.formatNumber(totals.added) + ' Added');
            }

            if (this.includePrivates && privateTotals.added) {
                summaryOutput.push('(' + Utils.formatNumber(privateTotals.added) + ' Private)');
            }

            if (totals.modified) {
                summaryOutput.push('   - ' + Utils.formatNumber(totals.modified) + ' Modified');
            }

            if (this.includePrivates && privateTotals.modified) {
                summaryOutput.push('(' + Utils.formatNumber(privateTotals.modified) + ' Private)');
            }

            if (totals.removed) {
                summaryOutput.push('   - ' + Utils.formatNumber(totals.removed) + ' Removed');
            }

            if (this.includePrivates && privateTotals.removed) {
                summaryOutput.push('(' + Utils.formatNumber(privateTotals.removed) + ' Private)');
            }
        }
    }

    getSummaryTotals (type, bucket, excludePrivate) {
        let summaryType = this.summary[type],
            keys = ['total', 'added', 'modified', 'removed'],
            totals = {};

        if (summaryType && summaryType[bucket]) {
            keys.forEach(function(key) {
                totals[key] = summaryType[bucket][key];

                if (excludePrivate) {
                    totals[key] -= summaryType['privates'][key] || 0;
                }
            });
        }

        return totals;
    }

    addParserCounts (parser) {
        let summary = this.summary,
            types   = [
                'configs',
                'properties',
                'property', //doc error?
                'static-properties',
                'methods',
                'method', //doc error?
                'mixins',
                'static-methods',
                'events',
                'events', //doc error?
                'vars'
            ];

        types.forEach(function(type) {
            let keys        = ['everything', 'privates'],
                summaryType = summary[type],
                name, count, key, numKey, i;

            if (!summaryType) {
                summaryType = summary[type] = {
                    numChanges : 0,
                    numPrivateChanges: 0
                };
            }

            for (i=0; i<keys.length; i++) {
                key = keys[i];
                count = parser[type + 'Count'][key];
                numKey = key === 'privates' ? 'numPrivateChanges' : 'numChanges';
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
            }            
        });
    }

    addClassCount (action) {
        let summary  = this.summary,
            clsCount = summary.classes;

        if (!clsCount) {
            clsCount = summary.classes = {
                everything: {},
                privates: {}
            };
        }

        if (clsCount['everything'][action] == null) {
            clsCount['everything'][action] = 0;
        }

        ++clsCount['everything'][action];
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

            me.addClassCount('total');

            if (oldCls) {
                parser = new Parser(newCls, oldCls);
                diff   = parser.exec();

                me.addParserCounts(parser);

                if (parser.totalCount) {
                    output   = new Output(diff, this.includePrivates, this.includeDebugOutput);
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
            if (!newCls && oldCls.$type==='class') {
                me.addClassCount('removed');

                removedOutput.push(' - ' + oldCls.name);
            }
        }

        me.formatChange('Added',    addedOutput,    totalOutput);
        me.formatChange('Removed',  removedOutput,  totalOutput);
        me.formatChange('Modified', modifiedOutput, totalOutput);

        if (!totalOutput.length) {
            totalOutput.push('No changes found');
        }

        totalOutput.unshift('# Diff between ' + newVersion + ' and ' + oldVersion);

        me.formatSummary(totalOutput);

        mkdirp.sync(outputDir);

        fs.writeFile(outputDir + oldVersion + '_to_' + newVersion + '_changes.md', totalOutput.join('\n'), 'utf8');
    }
}

module.exports = Diff;
