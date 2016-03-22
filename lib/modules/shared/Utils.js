'use strict';

const path = require('path');

class Utils {
    static capitalize (text) {
        return text.substr(0, 1).toUpperCase() + text.substr(1);
    }

    static formatNumber (num) {
        if (num) {
            if (num.toLocaleString) {
                num = num.toLocaleString();
            } else {
                var parts  = ('' + (num < 0 ? -num : num)).split('.'),
                    str    = parts[0],
                    i      = str.length,
                    length = str.length,
                    o      = '';

                while (i--) {
                    o = (i === 0 ? '' : ((length - i) % 3 ? '' : ',')) + str.charAt(i) + o;
                }

                num = (num < 0 ? '-' : '') + o + (parts[1] ? '.' + parts[1] : '');
            }
        }

        return num;
    }

    static getMatch (key, value, arr) {
        var match;

        if (arr) {
            arr.forEach(function(item) {
                if (!match && item[key] === value) {
                    match = item;
                }
            });
        }

        return match;
    }

    static path (location) {
        if (location.substr(-1) !== '/') {
            location += '/';
        }

        return path.normalize(location);
    }

    static forEach (arr, callback, scope) {
        scope = scope || this;

        var i      = 0,
            length = arr.length,
            item;

        for (; i < length; i++) {
            item = arr[i];

            if (callback.call(scope, item, i, arr) === false) {
                break;
            }
        }
    }

    static doApply (undef, destination, source) {
        if (source) {
            var name;

            for (name in source) {
                if (!undef || destination[name] === undefined) {
                    destination[name] = source[name];
                }
            }
        }

        return destination;
    }

    static apply (destination, source) {
        return this.doApply(false, destination, source);
    }

    static applyIf (destination, source) {
        return this.doApply(true, destination, source);
    }

    /**
     * @param {String} tokenized string
     * @params {String...} The values to replace tokens {0}, {1}, etc in order.
     */
    static format () {
        let args = (arguments.length === 1?[arguments[0]]:Array.apply(null, arguments)),
            string = args.shift(),
            len = args.length,
            i = 0;

        for (; i < len; i++) {
            string = string.replace(new RegExp("\\{"+i+"\\}","g"),args[i]);
        }

        return string;
    }

    /**
     *
     */
    static striphtml (variable) {
        if (variable != 'undefined' && variable) {
            variable = variable.replace('</h1>', ' ').replace(/<(?:.|\n)*?>/gm, '').replace(/\r?\n|\r/g, '');
            return variable.substring(0, 157) + '...';
        }
        return '';
    }
}

module.exports = Utils;
