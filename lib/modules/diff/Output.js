'use strict';

const Utils = require('../shared/Utils');
const indentInc   = 3;
const memberOrder = [
    'configs',
    'properties',
    'property', //doc error?
    'static-properties',
    'methods',
    'method', //doc error?
    'mixins',
    'static-methods',
    'events',
    'event', //doc error?
    'vars'
];

class Output {
    constructor (config) {        
        Utils.apply(this, config);
    }

    get encoders () {
        return {
            access : function(value) {
                return value ? value : 'public';
            }
        };
    }

    get styles () {
        return {
            method : function (value) {
                return '`' + value + '`';
            }
        }
    }

    prettyJson () {
        console.log(JSON.stringify(this.diff, null, 4));
    }

    markdown () {
        let output = [];

        this
            .output('added',    output)
            .output('modified', output)
            .output('removed',  output);

        if (output.length) {
            output.unshift('### ' + this.diff.name);

            return output.join('\n');
        }
    }

    _capitalize (text) {
        return text.substr(0, 1).toUpperCase() + text.substr(1);
    }

    output (type, output) {
        let me        = this,
            Type      = me._capitalize(type),
            diff      = me.diff,
            obj       = diff[type],
            count     = 0,
            altCount  = 0,
            indention = 0,
            key;

        if (obj) {            
            memberOrder.forEach(function(order) {
                let members = obj[order];

                if (members) {
                    count = members.length;

                    for (key in me.outputOptions) {
                        altCount = count - me.getMemberCountByFlag(members, key);

                        if (!me.outputOptions[key] && !altCount) {
                            return false;
                        }
                    }

                    indention = (indention > 0) ? indention : 0;

                    me.addBullet(Type + ' ' + me._capitalize(order), output, indention);

                    members.forEach(function(member) {
                        indention += indentInc;
                        if (typeof member === 'object') {
                            if (me.canDisplay(member)) {
                                me.addObject(member, member.name, 'method', output, indention);
                            }                            
                        } else {
                            me.addBullet(member, output, indention);
                        }

                        indention -= indentInc;
                    });

                    indention -= indentInc;
                }
            });
        }

        return me;
    }

    getMemberCountByFlag (members, flag) {
        var count = 0;

        members.forEach(function(member) {
            if (typeof member === 'object' && member[flag]) {
                count++;
            }
        });

        return count;
    }

    addBullet (text, output, indention) {
        output.push(new Array(indention + 1).join(' ') + '- ' + text);
    }

    addObject (obj, display, style, output, indention, skipDebug) {
        let me       = this,
            encoders = me.encoders,
            simple   = true,
            styles   = me.styles,
            styled   = styles[style] ? styles[style](display) : display,
            encoder, newValue, oldValue, action;

        if (obj.isPrivate) {
            styled += ' (private)';
        }

        if (obj.isDeprecated) {
            styled += ' (deprecated)';
        }

        me.addBullet(styled, output, indention);

        if (obj.newValue || obj.oldValue) {
            encoder  = encoders[obj.key];
            newValue = encoder ? encoder(obj.newValue) : obj.newValue;
            oldValue = encoder ? encoder(obj.oldValue) : obj.oldValue

            indention += indentInc;

            if (simple) {
                me.addBullet(
                    '**' + obj.key + '** is ' + newValue + (oldValue ? ' (was ' + oldValue + ')' : ''),
                    output,
                    indention
                );
            } else {
                me.addBullet('**' + obj.key + '**', output, indention);

                indention += indentInc;

                me.addBullet(
                    'is ' + (encoder ? encoder(obj.newValue) : obj.newValue),
                    output,
                    indention
                );

                me.addBullet(
                    'was ' + (encoder ? encoder(obj.oldValue) : obj.oldValue),
                    output,
                    indention
                );
            }
        }

        if (obj.items) {
            for (action in obj.items) {
                obj.items[action].forEach(function(member) {
                    if (me.canDisplay(member)) {
                        let display = me._capitalize(action) + ' _' + member.name + '_ ' + member.$type;
                        me.addObject(member, display, null, output, (indention + (indentInc*2)), true);
                    } 
                });
            }
        }

        if (me.includeDebugOutput && !skipDebug) {
            output.push('<pre>' + JSON.stringify(obj, null, 4) + '</pre>');
        }
    }

    canDisplay (member) {
        var me = this,
            key, flag;

        for (key in me.outputOptions) {
            flag = 'is' + Utils.capitalize(key);

            if (!me.outputOptions[key] && member[flag]) {
                return false;
            }
        }

        return true;
    }
}

module.exports = Output;
