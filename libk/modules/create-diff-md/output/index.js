/* jshint node: true */
'use strict';

const Utils  = require('../../shared/Utils');

const indentInc = 3;

class Output {
    constructor (config) {        
        Object.assign(this, config);
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
        let Type      = this._capitalize(type),
            diff      = this.diff,
            obj       = diff[type],
            count     = 0,
            hideCount = 0,
            indention = 0,
            key;

        if (obj) {
            // normal member entries
            this.categories.forEach((category) => {
                let order = category.name,
                    members = obj[order];

                if (members) {
                    count = members.length;
                    hideCount = 0;

                    for (key in this.outputOptions) {
                        if (!this.outputOptions[key]) {
                            hideCount += this.getMemberCountByFlag(members, key);
                        }
                    }

                    if (hideCount===count) {
                        return false;
                    }

                    indention = (indention > 0) ? indention : 0;

                    this.addBullet(Type + ' ' + this._capitalize(order), output, indention);

                    members.forEach((member) => {
                        indention += indentInc;
                        if (typeof member === 'object') {
                            if (this.canDisplay(member)) {
                                this.addObject(member, member.name, 'method', output, indention);
                            }
                        } else {
                            this.addBullet(member, output, indention);
                        }

                        indention -= indentInc;
                    });

                    indention -= indentInc;
                }
            });

            // process class property changes
            let members = obj.classProps;
            
            if (members && this.outputOptions['class']) {
                indention = (indention > 0) ? indention : 0;

                this.addBullet(Type + ' Class Details', output, indention);

                members.forEach((member) => {
                    this.addObject(member, member.name, null, output, indention, false);
                });

                indention -= indentInc;
            }
        }

        return this;
    }

    getMemberCountByFlag (members, flag) {
        var count = 0,
            flag = 'is' + Utils.capitalize(flag);

        members.forEach((member) => {
            if (typeof member === 'object' && member[flag]) {
                count++;
            }
        });

        return count;
    }

    addBullet (text, output, indention) {
        output.push(new Array(indention + 1).join(' ') + '- ' + text);
    }

    addObject (obj, display, style, output, indention, skipDebug, skipName) {
        let encoders = this.encoders,
            simple   = true,
            styles   = this.styles,
            styled   = styles[style] ? styles[style](display) : display,
            encoder, newValue, oldValue, action;

        if (obj.isPrivate) {
            styled += ' (private)';
        }

        if (obj.isDeprecated) {
            styled += ' (deprecated)';
        }

        if (!obj.isClass) {
            this.addBullet(styled, output, indention);
        }

        if (obj.newValue || obj.oldValue) {
            encoder  = encoders[obj.key];
            newValue = encoder ? encoder(obj.newValue) : obj.newValue;
            oldValue = encoder ? encoder(obj.oldValue) : obj.oldValue

            indention += indentInc;

            if (simple) {
                this.addBullet(
                    '**' + obj.key + '** is ' + newValue + (oldValue ? ' (was ' + oldValue + ')' : ''),
                    output,
                    indention
                );
            } else {
                this.addBullet('**' + obj.key + '**', output, indention);

                indention += indentInc;

                this.addBullet(
                    'is ' + (encoder ? encoder(obj.newValue) : obj.newValue),
                    output,
                    indention
                );

                this.addBullet(
                    'was ' + (encoder ? encoder(obj.oldValue) : obj.oldValue),
                    output,
                    indention
                );
            }
        }

        if (obj.items) {
            for (action in obj.items) {
                obj.items[action].forEach((member) => {
                    if (this.canDisplay(member)) {
                        let display = this._capitalize(action) + ' _' + member.name + '_ ' + member.$type;

                        this.addObject(member, display, null, output, (indention + (indentInc)), true);
                    }
                });
            }
        }

        if (this.includeDebugOutput && !skipDebug) {
            output.push('<pre>' + JSON.stringify(obj, null, 4) + '</pre>');
        }
    }

    canDisplay (member) {
        var key, flag;

        for (key in this.outputOptions) {
            flag = 'is' + Utils.capitalize(key);

            if (!this.outputOptions[key] && member[flag]) {
                return false;
            }
        }

        return true;
    }
}

module.exports = Output;
