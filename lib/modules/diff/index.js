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
    }

    get defaultOptions () {
        return {
            destination : {
                type  : 'path',
                value : __dirname + '/../../output/'
            }
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
        let summaryType = this.summary[type];

        if (summaryType) {
            if (!summaryOutput) {
                summaryOutput = title;
                title         = null;
            }

            if (!title) {
                title = Utils.capitalize(type);
            }

            summaryOutput.push(' - ' + Utils.formatNumber(summaryType.total) + (type === 'classes' ? ' ' : ' Class ') + title);

            if (summaryType.added) {
                summaryOutput.push('   - ' + Utils.formatNumber(summaryType.added) + ' Added');
            }

            if (summaryType.modified) {
                summaryOutput.push('   - ' + Utils.formatNumber(summaryType.modified) + ' Modified');
            }

            if (summaryType.removed) {
                summaryOutput.push('   - ' + Utils.formatNumber(summaryType.removed) + ' Removed');
            }
        }
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
                'static-methods',
                'events',
                'events', //doc error?
                'vars'
            ];

        types.forEach(function(type) {
            let count       = parser[type + 'Count'],
                summaryType = summary[type],
                name;

            if (!summaryType) {
                summaryType = summary[type] = {
                    numChanges : 0
                };
            }

            for (name in count) {
                if (summaryType[name] == null) {
                    summaryType[name] = 0;
                }

                summaryType[name] += count[name];

                if (name !== 'total') {
                    summaryType.numChanges += count[name];
                }
            }
        });
    }

    addClassCount (action) {
        let summary  = this.summary,
            clsCount = summary.classes;

        if (!clsCount) {
            clsCount = summary.classes = {};
        }

        if (clsCount[action] == null) {
            clsCount[action] = 0;
        }

        ++clsCount[action];
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
                    output   = new Output(diff);
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

            if (!newCls) {
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
