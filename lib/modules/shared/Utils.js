'use strict';

const path = require('path');
const trimRegex = /^[\x09\x0a\x0b\x0c\x0d\x20\xa0\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000]+|[\x09\x0a\x0b\x0c\x0d\x20\xa0\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000]+$/g;

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
     * Returns true if the passed value is a string.
     * @param {Object} value The value to test.
     * @return {Boolean}
     */
    static isString (value) {
        return typeof value === 'string';
    };

    /** 
     * Returns a trimmed string
     * @param {String} string The string to trim
     * @return {String}
     */
    static trim (string) {
        if (string && this.isString(string)) {
            string = string.replace(trimRegex, "");
        }
        return string || '';
    }

    /**
     * Returns true if the passed value is a JavaScript Object, false otherwise.
     * @param {Object} value The value to test.
     * @return {Boolean}
     */
    static isObject (value) {
        return Object.prototype.toString.call(value) === '[object Object]';
    };

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
