'use strict';

const fs     = require('fs');
const path   = require('path');
const mkdirp = require('mkdirp');
const debug  = require('./Debug');

const Parser = require('./Parser');
const Output = require('./Output');
const Utils  = require('../shared/Utils');
const Base   = require('../base');

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
class Diff extends Base {
    constructor (options) {
        super(options);

        this.summary                = {};
        this.includeDebugOutput     = options['include-debug-output'];
        this.includeVerboseSummary  = options['verbose-summary'];
        this.countMasterKey         = 'all';
        this.countTypes             = ['all', 'private', 'deprecated'];
        this.outputOptions = {
            private     : options['include-private'],
            deprecated  : options['include-deprecated'],
            class       : options['include-class-details']
        };
    }

    get defaultOptions () {
        return {
            destination : {
                type  : 'path',
                value : __dirname + '/../../output/'
            },
            'include-private'       : true,
            'include-deprecated'    : true,
            'include-debug-output'  : false,
            'include-class-details' : true,
            'verbose-summary'       : false
        };
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
        let me      = this,
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
        let me          = this,
            keys        = ['added', 'modified', 'removed'],
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
        let me          = this,
            summaryType = this.summary[type],
            keys        = ['total', 'added', 'modified', 'removed'],
            totals      = {};

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
        let me      = this,
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
        let summary   = this.summary,
            clsCount  = summary.classes,
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
            options        = me.options,
            newAllClasses  = JSON.parse(fs.readFileSync(options.oldFile, 'utf8')).global.items,
            oldAllClasses  = JSON.parse(fs.readFileSync(options.newFile, 'utf8')).global.items,
            newVersion     = options.new,
            oldVersion     = options.old,
            outputDir      = options.destination || './output',
            length         = newAllClasses.length,
            addedOutput    = [], modifiedOutput = [], removedOutput = [], totalOutput = [],
            i = 0, newCls, oldCls, parser, diff, output, markdown, filename;

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
                    newData         : newCls,
                    oldData         : oldCls,
                    outputOptions   : this.outputOptions,
                    countTypes      : this.countTypes,
                    countMasterKey  : this.countMasterKey,
                    categories      : categories,
                    classProps      : classProps
                });

                diff = parser.exec();

                me.addParserCounts(parser);

                if (parser.totalCount) {
                    output   = new Output({
                        diff                : diff,
                        outputOptions       : this.outputOptions,
                        countTypes          : this.countTypes,
                        countMasterKey      : this.countMasterKey,
                        includeDebugOutput  : this.includeDebugOutput,
                        categories          : categories,
                        classProps          : classProps
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

        length = oldAllClasses.length;

        for (i=0; i < length; i++) {
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

        filename = oldVersion + '_to_' + newVersion + '_changes.md';

        fs.writeFile(path.join(outputDir, filename), totalOutput.join('\n'), 'utf8', function(err) {
            if (err) {
                return console.log(err);
            }
            debug.info('Diff was written to ' + path.join(outputDir, filename));
        });
    }
}

module.exports = Diff;
