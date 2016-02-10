(function() {
    ExtL = ExtL || {};

    var matchesSelector = (function () {
        var el = document.documentElement,
            w3 = 'matches',
            wk = 'webkitMatchesSelector',
            ms = 'msMatchesSelector',
            mz = 'mozMatchesSelector';

        return el[w3] ? w3 : el[wk] ? wk : el[ms] ? ms : el[mz] ? mz : null;
    })();

    // cache of document elements
    var els = {};

    /**
     * Checks if the specified CSS class exists on this element's DOM node.
     * @param {Element} el The element to check
     * @param (String) cls The CSS to check for
     */
    ExtL.hasCls = function(el, cls) {
        return !!el.className.match(new RegExp('(\\s|^)'+cls+'(\\s|$)'));
    };

    /**
     * Adds a CSS class to the top level element representing this component.
     * @param {Element} el The target element to add the class to
     * @param (String) cls The CSS to add
     */
    ExtL.addCls = function(el, cls) {
        this.toggleCls(el, cls, true);
    };

    /**
     * Removes a CSS class from the top level element representing this component.
     * @param {Element} el The target element to remove the class from
     * @param (String) cls The CSS to remove
     */
    ExtL.removeCls = function(el, cls) {
        this.toggleCls(el, cls, false);
    };

    /**
     * Toggles the specified CSS class on this element (removes it if it already exists,
     * otherwise adds it).
     * @param {Element} el The target element to toggle the class on
     * @param (String) cls The CSS to toggle
     * #param {Boolean} state (optional) If specified as true, causes the class to be
     * added. If specified as false, causes the class to be removed.
     */
    ExtL.toggleCls = function(el, cls, state) {
        var reg;

        if (this.isEmpty(state)) {
            state = !this.hasCls(el, cls);
        } else {
            state = !!state;
        }

        if (state == true) {
            if (!this.hasCls(el, cls)) {
                //el.className += ' ' + cls.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
                el.className += ' ' + this.trim(cls);
                el.className = ExtL.trim(el.className);
            }
        } else {
            if (ExtL.hasCls(el, cls)) {
                //reg = new RegExp('(\\s|^)' + cls + '(\\s|$)');
                reg = new RegExp(cls + '(?:\\s|$)');
                el.className = el.className.replace(reg, '');
            }
        }
    };

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
    ExtL.isEmpty = function(value, allowEmptyString) {
        return (value == null) || (!allowEmptyString ? value === '' : false) || (this.isArray(value) && value.length === 0);
    };

    /**
     * Return an element by id
     * @return {Element} The element with the passed id.
     */
    ExtL.get = function (id) {
        return els[id] || (els[id] = document.getElementById(id));
    };

    /**
     * Returns true if the passed value is a JavaScript Date object, false otherwise.
     * @param {Object} value The object to test.
     * @return {Boolean}
     */
    ExtL.isDate = function(value) {
        return toString.call(value) === '[object Date]';
    };

    /**
     * Returns true if the passed value is a JavaScript Array, false otherwise.
     * @param {Object} value The target to test.
     * @return {Boolean}
     */
    ExtL.isArray = ('isArray' in Array) ? Array.isArray : function(value) {
        return toString.call(value) === '[object Array]';
    };

    /**
     * Returns true if the passed value is a JavaScript Object, false otherwise.
     * @param {Object} value The value to test.
     * @return {Boolean}
     */
    ExtL.isObject = (toString.call(null) === '[object Object]') ?
        function(value) {
            // check ownerDocument here as well to exclude DOM nodes
            return value !== null && value !== undefined && toString.call(value) === '[object Object]' && value.ownerDocument === undefined;
        } :
        function(value) {
            return toString.call(value) === '[object Object]';
        };

    /**
     * Returns true if the passed value is a string.
     * @param {Object} value The value to test.
     * @return {Boolean}
     */
    ExtL.isString = function(value) {
        return typeof value === 'string';
    };

    /**
     *
     */
    ExtL.monitorMouseLeave = function (el, delay, handler, scope) {
        var timer;

        /*el.onmouseleave = function (e) {
            timer = setTimeout(function () {
                handler.call(scope || ExtL, e);
            }, delay);
        };
        el.onmouseenter = function () {
            clearTimeout(timer);
        }*/
        ExtL.on(el, 'mouseleave', function (e) {
            timer = setTimeout(function () {
                handler.call(scope || ExtL, e);
            }, delay);
        });
        ExtL.on(el, 'mouseenter', function () {
            clearTimeout(timer);
        });
    }

    /**
     *
     */
    ExtL.monitorMouseEnter = function (el, delay, handler, scope) {
        var timer;

        /*el.onmouseenter = function (e) {
            timer = setTimeout(function () {
                handler.call(scope || ExtL, e);
            }, delay);
        };
        el.onmouseleave = function () {
            clearTimeout(timer);
        }*/
        ExtL.on(el, 'mouseenter', function (e) {
            timer = setTimeout(function () {
                handler.call(scope || ExtL, e);
            }, delay);
        });
        ExtL.on(el, 'mouseleave', function () {
            clearTimeout(timer);
        });
    }

    ExtL.on = function (el, event, handler) {
        if (el.addEventListener) {
            el.addEventListener(event, handler, false);
        } else if (el.attachEvent)  {
            el.attachEvent(event, handler);
        }

        return el;
    }

    /**
     * @param {Element} el The element to apply the styles to
     * @param {String/Object} The styles to apply to the element.  This can be a string
     * to append to the element's style attribute directly or an object of style key /
     * value pairs.
     */
    ExtL.applyStyles = function (el, styles) {
        var style;

        if (ExtL.isObject(styles)) {
            ExtL.each(styles, function (key, val) {
                el.style[key] = val;
            });
        } else {
            style = el.getAttribute('style') || '';
            el.setAttribute('style', style + styles);
        }
    }

    /**
     *
     */
    ExtL.fromNodeList = function (nodelist) {
        var len = nodelist.length,
            i = 0,
            arr = [];

        for (; i < len; i++) {
            arr.push(nodelist.item(i));
        }

        return arr;
    }

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

    /**
     *
     */
    ExtL.capitalize = function (text) {
        return text.substr(0, 1).toUpperCase() + text.substr(1);
    }

    /**
     * @private
     * Helper method for the up method
     */
    ExtL.collectionHas = function(a, b) { //helper function for up()
        for(var i = 0, len = a.length; i < len; i ++) {
            if(a[i] == b) return true;
        }
        return false;
    }

    /**
     * Finds the parent node matching the passed selector
     */
    ExtL.up = function (el, selector) {
        var all = document.querySelectorAll(selector),
            cur = el.parentNode;

        while(cur && !this.collectionHas(all, cur)) { //keep going up until you find a match
            cur = cur.parentNode; //go up
        }
        return cur; //will return null if not found
    }

    ExtL.is = function (el, selector) {
        return el[matchesSelector](selector);
    };

    ExtL.createBuffered = function(fn, buffer, scope, args) {
        var timerId;

        return function() {
            var callArgs = args || Array.prototype.slice.call(arguments, 0),
                me = scope || this;

            if (timerId) {
                clearTimeout(timerId);
            }

            timerId = setTimeout(function(){
                fn.apply(me, callArgs);
            }, buffer);
        };
    };

    ExtL.trim = function (str) {
        return str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
    };

    /**
     * Converts a value to an array if it's not already an array; returns an the param
     * wrapped as an array (or the array itself if it's an already an array)
     * @return {Array}
     */
    ExtL.from = function (obj) {
        return ExtL.isArray(obj) ? obj : [obj];
    };

    /**
     * Creates a DOM element
     * @param {String} tag The tag type to create
     * @param {Array} attributes (optional) An array of attributes to set on the element
     * @param {String} text (optional) Text to insert in the element
     * @param {Array} children (optional) Array, or array of
     * [tag, attributes, text, children] to append to the element
     * @return {Element} The created element
     */
    ExtL.createElement = function (cfg) {
        var tag = cfg.tag || 'div',
            html = cfg.html,
            children = cfg.cn,
            el = document.createElement(tag),
            textNode;

        delete cfg.tag;
        delete cfg.html;
        delete cfg.cn;

        /*if (attributes) {
            ExtL.each(attributes, function (key, val) {
                el.setAttribute(key, val);
            });
        }*/

        ExtL.each(cfg, function (key, val) {
            el.setAttribute(key, val);
        });

        if (html) {
            textNode = document.createTextNode(html);
            el.appendChild(textNode);
        }

        if (children) {
            children = ExtL.from(children);
            ExtL.each(children, function (child) {
                el.appendChild(ExtL.createElement(child));
            });
        }

        return el;
    };

    /**
     *
     */
    ExtL.removeChildNodes = function (el) {
        while (el.firstChild) {
            el.removeChild(el.firstChild);
        }
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
    ExtL.each = function (object, fn, scope) {
        if (ExtL.isEmpty(object)) {
            return;
        }

        if (scope === undefined) {
            scope = object;
        }

        if (ExtL.isArray(object)) {
            ExtL.arrEach.call(ExtL, object, fn, scope);
        }
        else {
            ExtL.objEach.call(ExtL, object, fn, scope);
        }
    }

    /**
     *
     */
    ExtL.format = function () {
        var args = (arguments.length === 1?[arguments[0]]:Array.apply(null, arguments)),
            string = args.shift(),
            len = args.length,
            i = 0;

        for (; i < len; i++) {
            string = string.replace(new RegExp("\\{"+i+"\\}","g"),args[i]);
        }

        return string;
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
    ExtL.arrEach = function (array, fn, scope, reverse) {
        array = ExtL.from(array);

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
    };

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
    ExtL.objEach = function (object, fn, scope) {
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
    };

    /**
     * Convert certain characters (&, <, >, ', and ") to their HTML character equivalents
     * for literal display in web pages
     * @param {String} value The string to encode
     * @return {String} The encoded text
     */
    ExtL.htmlEncode = function (html) {
        return document.createElement( 'a' ).appendChild(
            document.createTextNode( html ) ).parentNode.innerHTML;
    };

})();
