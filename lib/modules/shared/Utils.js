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
}

module.exports = Utils;
