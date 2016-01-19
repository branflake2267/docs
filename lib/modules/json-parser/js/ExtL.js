(function() {
    ExtL = ExtL || {};

    // cache of document elements
    var els = {};

    ExtL.hasClass = function(ele, cls) {
        return !!ele.className.match(new RegExp('(\\s|^)'+cls+'(\\s|$)'));
    };
    ExtL.addClass = function(ele, cls) {
        if (!this.hasClass(ele, cls)) {
            ele.className += ' ' + cls.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
        }
    };
    ExtL.removeClass = function(ele, cls) {
        if (ExtL.hasClass(ele, cls)) {
            var reg = new RegExp('(\\s|^)' + cls + '(\\s|$)');

            ele.className = ele.className.replace(reg, ' ');
        }
    };
    ExtL.onExpandToggleClick = function(dom) {
        var isExpanded = /collapse/i.test(dom.innerHTML);

        dom.innerHTML = isExpanded ? 'expand' : 'collapse';

        ExtL[isExpanded ? 'addClass' : 'removeClass'](document.body, 'related-collapsed');
    };

    /**
     * Return an element by id
     */
    ExtL.get = function (id) {
        return els[id] || (els[id] = document.getElementById(id));
    };

    ExtL.isDate = function(value) {
        return toString.call(value) === '[object Date]';
    };

    ExtL.isArray = ('isArray' in Array) ? Array.isArray : function(value) {
        return toString.call(value) === '[object Array]';
    };

    ExtL.encodeValue = function(value){
        var flat = '',
            i = 0,
            enc, len, key;

        if (value == null) {
            return 'e:1';
        } else if(typeof value === 'number') {
            enc = 'n:' + value;
        } else if(typeof value === 'boolean') {
            enc = 'b:' + (value ? '1' : '0');
        } else if(ExtL.isDate(value)) {
            enc = 'd:' + value.toUTCString();
        } else if(ExtL.isArray(value)) {
            for (len = value.length; i < len; i++) {
                flat += ExtL.encodeValue(value[i]);
                if (i !== len - 1) {
                    flat += '^';
                }
            }
            enc = 'a:' + flat;
        } else if (typeof value === 'object') {
            for (key in value) {
                if (typeof value[key] !== 'function' && value[key] !== undefined) {
                    flat += key + '=' + ExtL.encodeValue(value[key]) + '^';
                }
            }
            enc = 'o:' + flat.substring(0, flat.length-1);
        } else {
            enc = 's:' + value;
        }
        return escape(enc);
    };

    ExtL.decodeValue = function(value){

        // a -> Array
        // n -> Number
        // d -> Date
        // b -> Boolean
        // s -> String
        // o -> Object
        // -> Empty (null)

        var re = /^(a|n|d|b|s|o|e)\:(.*)$/,
            matches = re.exec(unescape(value)),
            all, type, keyValue, values, vLen, v;

        if (!matches || !matches[1]) {
            return; // non state
        }

        type = matches[1];
        value = matches[2];
        switch (type) {
            case 'e':
                return null;
            case 'n':
                return parseFloat(value);
            case 'd':
                return new Date(Date.parse(value));
            case 'b':
                return (value === '1');
            case 'a':
                all = [];
                if (value) {
                    values = value.split('^');
                    vLen   = values.length;

                    for (v = 0; v < vLen; v++) {
                        value = values[v];
                        all.push(ExtL.decodeValue(value));
                    }
                }
                return all;
           case 'o':
                all = {};
                if (value) {
                    values = value.split('^');
                    vLen   = values.length;

                    for (v = 0; v < vLen; v++) {
                        value = values[v];
                        keyValue         = value.split('=');
                        all[keyValue[0]] = ExtL.decodeValue(keyValue[1]);
                    }
                }
                return all;
           default:
                return value;
        }
    };
})();
