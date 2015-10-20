var path = require('path');

module.exports = {
    capitalize : function(text) {
        return text.substr(0, 1).toUpperCase() + text.substr(1);
    },

    formatNumber : function(num) {
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
    },

    getMatch : function(key, value, arr) {
        var match;

        if (arr) {
            arr.forEach(function(item) {
                if (!match && item[key] === value) {
                    match = item;
                }
            });
        }

        return match;
    },

    path : function(location) {
        if (location.substr(-1) !== '/') {
            location += '/';
        }

        return path.normalize(location);
    },

    forEach : function(arr, callback, scope) {
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
    },

    doApply : function(undef, destination, source) {
        if (source) {
            var name;

            for (name in source) {
                if (!undef || destination[name] === undefined) {
                    destination[name] = source[name];
                }
            }
        }

        return destination;
    },

    apply : function(destination, source) {
        return this.doApply(false, destination, source);
    },

    applyIf : function(destination, source) {
        return this.doApply(true, destination, source);
    }
};
