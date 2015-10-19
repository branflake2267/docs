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
    }
};
