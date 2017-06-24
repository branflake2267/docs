/* jshint node: true */
'use strict';

const _      = require('lodash');

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

    output (type, output) {
        let Type      = _.capitalize(type),
            diff      = this.diff,
            obj       = diff[type],
            count     = 0,
            hideCount = 0,
            indention = 0,
            key;

        if (obj) {
            let categories = this.categories,
                len        = categories.length,
                i          = 0;
            
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

                    this.addBullet(Type + ' ' + _.capitalize(order), output, indention);

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

                let membersLen = members.length,
                    j          = 0;
                
                for (; j < membersLen; j++) {
                    let member = members[j];
                    
                    this.addObject(member, member.name, null, output, indention, false);
                }

                indention -= indentInc;
            }
        }

        return this;
    }

    getMemberCountByFlag (members, flag) {
        flag = `is${_.capitalize(flag)}`;
        
        let count = 0,
            len   = members.length,
            i     = 0;
        
        for (; i < len; i++) {
            let member = members[i];
            
            if (typeof member === 'object' && member[flag]) {
                count++;
            }
        }

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
                        let display = _.capitalize(action) + ' _' + member.name + '_ ' + member.$type;

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
        let outputOptions = this.outputOptions,
            keys          = Object.keys(outputOptions),
            len           = keys.length,
            i             = 0,
            canReturn     = true;
        
        for (; i < len; i++) {
            let key  = keys[i],
                flag = `is${_.capitalize(key)}`;
            
            if (!this.outputOptions[key] && member[flag]) {
                canReturn = false;
                break;
            }
        }
        
        return canReturn;
    }
}

module.exports = Output;
