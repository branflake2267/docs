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
                if (!match && item[key] === value && !item['ignore']) {
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

    static removeAt (arr, i) {
        arr.splice(i, 1);
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
     * Returns a string with a specified number of repetitions a given string pattern.
     * The pattern be separated by a different string.
     *
     *      var s = Ext.String.repeat('---', 4); // = '------------'
     *      var t = Ext.String.repeat('--', 3, '/'); // = '--/--/--'
     *
     * @param {String} pattern The pattern to repeat.
     * @param {Number} count The number of times to repeat the pattern (may be 0).
     * @param {String} sep An option string to separate each pattern.
     */
    static repeat (pattern, count, sep) {
        if (count < 1) {
            count = 0;
        }
        for (var buf = [], i = count; i--; ) {
            buf.push(pattern);
        }
        return buf.join(sep || '');
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
     * Returns true if the passed value is a JavaScript Object, false otherwise.
     * @param {Object} value The value to test.
     * @return {Boolean}
     */
    static isObject (value) {
        return Object.prototype.toString.call(value) === '[object Object]';
    };

    /**
     * Replaces curly-bracket-wrapped tokens or object keys in a string with either n
     * number of arguments or the values from an object.  Format may be used in the
     * following ways:
     * 1)  Allows you to define a tokenized string and pass an arbitrary number of
     * arguments to replace the tokens. Each token must be unique, and must increment in
     * the format {0}, {1}, etc. Example usage:
     *
     *     var cls = 'my-class',
     *         text = 'Some text';
     *     var s = Ext.String.format('<div class="{0}">{1}</div>', cls, text);
     *     alert(s); // '<div class="my-class">Some text</div>'
     *
     * 2) Allows you to define a parameterized string and pass in an key/value hash to
     * replace the parameters.  Example usage:
     *
     *     var obj = {
     *         cls: 'my-class',
     *         text: 'Some text'
     *     };
     *     var s = Ext.String.format('<div class="{cls}">{text}</div>', obj);
     *     alert(s); // '<div class="my-class">Some text</div>'
     *
     * @param {String} string The tokenized string to be formatted.
     * @param {String.../Object} values First param value to replace token `{0}`, then
     * next param to replace `{1}` etc.  May also be an object of key / value pairs to
     * replace `{key}` instance in the passed string with the paired key's value.
     * @return {String} The formatted string.
     */
    static format () {
        var args = (arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments)),
            string = args.shift(),
            len = args.length,
            i = 0,
            key, val, prop;

        if (Object.prototype.toString.call(args[0]) === '[object Object]') {
            for (key in args[0]) {
                if (!args[0].hasOwnProperty(key)) continue;

                val = args[0][key];
                string = string.replace(new RegExp("\\{" + key + "\\}", "g"), val);
            }
        } else {
            for (; i < len; i++) {
                string = string.replace(new RegExp("\\{" + i + "\\}", "g"), args[i]);
            }
        }

        return string;
    }

    /**
     * Processes a comma separated list
     * @param list The array of items to process
     * @param [sort] Sort the array elements
     * @param [trim] Pop the last element.  **Note:** Pop is processed before reverse and 
     * sort.
     * @param [rev] Reverse the list
     */
    static processCommaLists (list, sort, trim, rev) {
        let arr = list.split(',');

        if (trim) {
            arr.pop();
        }

        if (rev) {
            arr.reverse();
        }

        if (sort) {
            arr.sort();
        }

        return arr.join(',');
    }

    /**
     * Converts a value to an array if it's not already an array; returns an the param
     * wrapped as an array (or the array itself if it's an already an array)
     * @return {Array}
     */
    static from (obj) {
        return Array.isArray(obj) ? obj : [obj];
    }

    /**
     * Checks whether or not the given `array` contains the specified `item`.
     *
     * @param {Array} array The array to check.
     * @param {Object} item The item to find.
     * @return {Boolean} `true` if the array contains the item, `false` otherwise.
     */
    static arrayContains (array, item) {
        return (array.indexOf(item) !== -1);
    }

    /**
     * Returns true if the passed value is empty, false otherwise. The value is deemed to
     * be empty if it is either:
     *
     *  - null
     *  - undefined
     *  - a zero-length array
     *  - a zero-length string (Unless the allowEmptyString parameter is set to true)
     *
     * @return {Boolean}
     */
    static isEmpty (value, allowEmptyString) {
        return (value == null) || (!allowEmptyString ? value === '' : false) || (Array.isArray(value) && value.length === 0);
    }

    /**
     * Convenience array / object looping function
     * @param {Object/Array} object The object or array to loop through
     * @param {Function} fn Callback function to call on each array item / object key.
     * The callback is passed the following params:
     *
     *  - array: array item, index, the original array
     *  - object: object key, object value, original object
     *
     * @param {Object} scope (optional) The scope (this reference) in which the specified
     * function is executed.
     */
    static each (object, fn, scope) {
        if (this.isEmpty(object)) {
            return;
        }

        if (scope === undefined) {
            scope = object;
        }

        if (Array.isArray(object)) {
            this.arrEach.call(this, object, fn, scope);
        }
        else {
            this.objEach.call(this, object, fn, scope);
        }
    }

    /**
     * Perform a set difference A-B by subtracting all items in array B from array A.
     *
     * @param {Array} arrayA
     * @param {Array} arrayB
     * @return {Array} difference
     */
    static difference (arrayA, arrayB) {
        return arrayA.filter(x => arrayB.indexOf(x) < 0 );
    }

    /**
     * Iterates an array invokes the given callback function for each item.
     * @param {Array} object The object or array to loop through
     * @param {Function} fn Callback function to call on each array item / object key.
     * The callback is passed the following params:
     *
     *  - array: array item, index, the original array
     *
     * @param {Object} scope (optional) The scope (this reference) in which the specified
     * function is executed.
     * @param {Boolean} reverse (optional) Reverse the iteration order (loop from the end
     * to the beginning).
     */
     static arrEach (array, fn, scope, reverse) {
        array = this.from(array);

        var i,
            ln = array.length;

        if (reverse !== true) {
            for (i = 0; i < ln; i++) {
                if (fn.call(scope || array[i], array[i], i, array) === false) {
                    return i;
                }
            }
        }
        else {
            for (i = ln - 1; i > -1; i--) {
                if (fn.call(scope || array[i], array[i], i, array) === false) {
                    return i;
                }
            }
        }

        return true;
    }

    /**
     * Convenience array / object looping function
     * @param {Object} object The object or array to loop through
     * @param {Function} fn Callback function to call on each array item / object key.
     * The callback is passed the following params:
     *
     *  - object: object key, object value, original object
     *
     * @param {Object} scope (optional) The scope (this reference) in which the specified
     * function is executed.
     */
     static objEach (object, fn, scope) {
        var i, property;

        if (object) {
            scope = scope || object;

            for (property in object) {
                if (object.hasOwnProperty(property)) {
                    if (fn.call(scope, property, object[property], object) === false) {
                        return;
                    }
                }
            }
        }
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
