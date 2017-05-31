/* jshint node: true */
'use strict';

const fs     = require('fs');
const path   = require('path');
const mkdirp = require('mkdirp');
const debug  = require('../../Debug');

const Parser = require('./parser');
const Output = require('./output');
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
 *  - --product       required The product that you are diffing
 *  - --new           required The version of the new API.
 *  - --old           required The version of the old API.
 *  - --oldFile       required The Doxi "all" file of the new version.
 *  - --oldFile       required The Doxi "all" file of the old version.
 *  - --destination   (optional) The location the generated markdown will be placed.
 *
 * Sample commands to invoke this class:
 *
 *     node --max-old-space-size=4076 index create-diff-md --product=extjs --new=6.2.1 --old=6.2.0 --newFile=../difflib/input/621modern_all-classes.json --oldFile=../difflib/input/620modern_all-classes.json
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
        let summaryOutput = [
                '',
                '## Summary'
            ];

        this.formatSummaryType('classes', 'Classes', summaryOutput);

        categories.forEach((category) => {
            this.formatSummaryType(category.name, category.label, summaryOutput);
        });

        totalOutput.push(summaryOutput.join('\n'));
    }

    getSummaryActionLine (type, action, title, totals) {
        let content = '',
            subtotals;

        if (totals[action]) {
            content = '   - ' + Utils.formatNumber(totals[action]) + ' ' + Utils.capitalize(action);

            this.countTypes.forEach((countType) => {
                subtotals = this.getSummaryTotals(type, countType);
                if (this.outputOptions[countType] && subtotals[action]) {
                    content += ' (' + Utils.formatNumber(subtotals[action]) + ' ' + Utils.capitalize(countType) + ')';
                }
            });
        }

        return content;
    }

    formatSummaryType (type, title, summaryOutput) {
        let keys        = ['added', 'modified', 'removed'],
            summaryType = this.summary[type],
            totals, summaryLine;

        if (summaryType) {
            if (!summaryOutput) {
                summaryOutput = title;
                title         = null;
            }

            if (!title) {
                title = Utils.capitalize(type);
            }

            totals = this.getSummaryTotals(type, this.countMasterKey, true);

            if (totals.total) {
                summaryOutput.push(' - ' + Utils.formatNumber(totals.total) + (type === 'classes' ? ' ' : ' Class ') + title);

                if (this.includeVerboseSummary) {
                    keys.forEach((key) => {
                        summaryLine = this.getSummaryActionLine(type, key, title, totals);

                        if (summaryLine) {
                            summaryOutput.push(summaryLine);
                        }
                    });
                }    
            }        
        }
    }

    getSummaryTotals (type, bucket, isMain) {
        let summaryType = this.summary[type],
            keys        = ['total', 'added', 'modified', 'removed'],
            totals      = {};

        if (summaryType && summaryType[bucket]) {
            keys.forEach((key) => {
                totals[key] = summaryType[bucket][key];

                if (isMain) {
                    this.countTypes.forEach((countType) => {
                        if (countType !== this.countMasterKey && !this.outputOptions[countType]) {
                            totals[key] -= summaryType[countType][key] || 0;
                        }
                    });
                }
            });
        }

        return totals;
    }

    addParserCounts (parser) {
        let summary = this.summary;

        categories.forEach((category) => {
            let type        = category.name,
                keys        = this.countTypes,
                summaryType = summary[type],
                name, count, numKey;

            if (!summaryType) {
                summaryType = summary[type] = keys.reduce((result, key) => {
                    result[key + 'Changes'] = 0;
                    return result;
                }, {});
            }

            keys.forEach((key) => {
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
            clsCount = summary.classes = this.countTypes.reduce((result, key) => {
                result[key] = {};
                return result;
            }, {});
        }

        if (clsCount[masterKey][action] === null) {
            clsCount[masterKey][action] = 0;
        }

        ++clsCount[masterKey][action];
    }

    run () {
        let dt = new Date();
        let options        = this.options,
            newAllClasses  = JSON.parse(fs.readFileSync(options.newFile, 'utf8')).global.items,
            oldAllClasses  = JSON.parse(fs.readFileSync(options.oldFile, 'utf8')).global.items,
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

            this.addClassCount('total');

            if (oldCls) {

                parser = new Parser(Object.assign(this.options, {
                    newData         : newCls,
                    oldData         : oldCls,
                    outputOptions   : this.outputOptions,
                    countTypes      : this.countTypes,
                    countMasterKey  : this.countMasterKey,
                    categories      : categories,
                    classProps      : classProps
                }));

                diff = parser.exec();

                this.addParserCounts(parser);

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

                        this.addClassCount('modified');
                        modifiedOutput.push(markdown);
                    }
                }
            } else {
                this.addClassCount('added');
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
                this.addClassCount('removed');

                removedOutput.push(' - ' + oldCls.name);
            }
        }

        this.formatChange('Added',    addedOutput,    totalOutput);
        this.formatChange('Removed',  removedOutput,  totalOutput);
        this.formatChange('Modified', modifiedOutput, totalOutput);

        if (!totalOutput.length) {
            totalOutput.push('No changes found!!!');
        }

        totalOutput.unshift('# Diff between ' + newVersion + ' and ' + oldVersion);

        this.formatSummary(totalOutput);

        mkdirp.sync(outputDir);

        filename = oldVersion + '_to_' + newVersion + '_changes.md';

        fs.writeFile(path.join(outputDir, filename), totalOutput.join('\n'), 'utf8', (err) => {
            if (err) {
                return console.log(err);
            }
            debug.info('Diff was written to ' + path.join(outputDir, filename));
        });
        
        console.log(`Diffed in: ${this.getElapsed(dt)}`);
    }
}

module.exports = Diff;
