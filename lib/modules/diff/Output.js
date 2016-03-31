'use strict';

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
    constructor (diff, includePrivates, includeDebugOutput) {
        this.diff = diff;
        this.includePrivates = includePrivates;
        this.includeDebugOutput = includeDebugOutput;
    }

    get encoders () {
        return {
            access : function(value) {
                return value ? value : 'public';
            }
        };
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
            pCount    = 0,
            diffCount = 0,
            indention = 0;

        if (obj) {            
            memberOrder.forEach(function(order) {
                let members = obj[order];

                if (members) {
                    count = members.length;
                    pCount = me.getPrivateMemberCount(members);
                    diffCount = count-pCount;

                    if (!me.includePrivates && !diffCount) {
                        return false;
                    }

                    indention = (indention > 0) ? indention : 0;

                    me.addBullet(Type + ' ' + me._capitalize(order), output, indention);

                    members.forEach(function(member) {
                        indention += indentInc;
                        if (typeof member === 'object') {
                            if (me.includePrivates || (!me.includePrivates && !member.isPrivate)) {
                                me.addObject(member, output, indention);
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

    getPrivateMemberCount (members) {
        var count = 0;

        members.forEach(function(member) {
            if (typeof member === 'object' && member.isPrivate) {
                count++;
            }
        });

        return count;
    }

    addBullet (text, output, indention) {
        output.push(new Array(indention + 1).join(' ') + '- ' + text);
    }

    addObject (obj, output, indention) {
        let me       = this,
            encoders = me.encoders,
            simple   = true,
            encoder, newValue, oldValue;

        if (obj.isPrivate) {
            obj.name += ' (private)';
        }

        me.addBullet('`' + obj.name + '`', output, indention);

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

        if (me.includeDebugOutput) {
            output.push('<pre>' + JSON.stringify(obj, null, 4) + '</pre>');
        }
    }
}

module.exports = Output;
