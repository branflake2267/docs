'use strict';

const fs         = require('fs');
const util       = require('util');
const mkdirp     = require('mkdirp');
const Base       = require('../base');
const Sort       = require('../shared/Sort');
const Utils      = require('../shared/Utils');
const totalEndRe = /total$/i;

class Info extends Base {
    constructor (targets, options) {
        super(targets, options);

        this.map    = {};
        this.totals = {
            total : 0
        };

        options.destination = Utils.path(options.destination || __dirname + '/../../output/');
    }

    static register (argv) {
        argv.mod({
            mod         : 'member-info',
            description : 'Find info about members',
            options     : [
                {
                    name        : 'destination',
                    short       : 'd',
                    type        : 'string',
                    description : 'The destination location of the generated markdown. Defaults to "./output".',
                    example     : '`index member-info --destination=./output` or `index member-info -d ./output`'
                }
            ]
        });
    }

    run () {
        let me      = this,
            targets = me.targets;

        targets.forEach(function(target) {
            let allClasses = JSON.parse(fs.readFileSync(target, 'utf8')).global.items

            allClasses.forEach(function(cls) {
                let types = cls.items;

                if (types) {
                    types.forEach(function(type) {
                        let members = type.items;

                        if (members) {
                            members.forEach(function(member) {
                                me.addCount(cls.name, type.$type, member.ignore, true);
                            });
                        } else {
                            me.addCount(cls.name);
                        }
                    });
                } else {
                    //class doesn't have
                    me.addCount(cls.name);
                }
            });

            me.output(target);
        });
    }

    addCount (name, type, ignore, count) {
        let me     = this,
            map    = me.map,
            totals = me.totals,
            obj    = map[name],
            totalName;

        if (!obj) {
            obj = map[name] = {
                total : 0
            };
        }

        if (count) {
            ++obj.total;
            ++totals.total;

            if (type) {
                if (ignore) {
                    totalName = type + 'IgnoreTotal';
                } else {
                    totalName = type + 'Total';
                }

                if (totals[totalName] == null) {
                    totals[totalName] = 0;
                } else {
                    ++totals[totalName];
                }

                if (ignore) {
                    if (!obj.ignore) {
                        obj.ignore = 0;
                    }

                    ++obj.ignore;
                } else {
                    if (!obj[type]) {
                        obj[type] = 0;
                    }

                    ++obj[type];
                }
            }
        }
    }

    output (target) {
        let outputDir = this.options.destination,
            totals    = this.totals,
            arr       = [],
            output    = [],
            map       = this.map,
            sort      = new Sort([
                'name'
            ]),
            name;

        output.push('## Totals');

        for (name in totals) {
            output.push(' - ' + Utils.formatNumber(totals[name]) + ' total ' + name.replace(totalEndRe, '').replace(/([a-z]+)(ignore)$/i, '$2 $1').toLowerCase());
        }

        output.push('');

        for (name in map) {
            arr.push({
                name   : name,
                counts : map[name]
            });
        }

        arr = sort.sort(arr);

        arr.forEach(function(item) {
            let counts = item.counts,
                type;

            output.push('## ' + item.name);

            for (type in counts) {
                output.push(' - ' + Utils.formatNumber(counts[type]) + ' ' + type);
            }

            output.push('');
        });

        mkdirp.sync(outputDir);

        fs.writeFile(outputDir + 'member_info_' + target.split('/').pop().replace(/\.json/, '') + '.md', output.join('\n'), 'utf8');
    }
}

module.exports = Info;
