/*! matchMedia() polyfill - Test a CSS media type/query in JS. Authors & copyright (c) 2012: Scott Jehl, Paul Irish, Nicholas Zakas. Dual MIT/BSD license */
/*! NOTE: If you're already including a window.matchMedia polyfill via Modernizr or otherwise, you don't need this part */

(function(w){
    "use strict";
    w.matchMedia = w.matchMedia || (function( doc, undefined ) {

            var bool,
                docElem = doc.documentElement,
                refNode = docElem.firstElementChild || docElem.firstChild,
            // fakeBody required for <FF4 when executed in <head>
                fakeBody = doc.createElement( "body" ),
                div = doc.createElement( "div" );

            div.id = "mq-test-1";
            div.style.cssText = "position:absolute;top:-100em";
            fakeBody.style.background = "none";
            fakeBody.appendChild(div);

            return function(q){

                div.innerHTML = "&shy;<style media=\"" + q + "\"> #mq-test-1 { width: 42px; }</style>";

                docElem.insertBefore( fakeBody, refNode );
                bool = div.offsetWidth === 42;
                docElem.removeChild( fakeBody );

                return {
                    matches: bool,
                    media: q
                };

            };

        }( w.document ));
}( this ));

// Add a getElementsByClassName function if the browser doesn't have one
// Limitation: only works with one class name
// Copyright: Eike Send http://eike.se/nd
// License: MIT License

if (!document.getElementsByClassName) {
    document.getElementsByClassName = function(search) {
        var d = document, elements, pattern, i, results = [];
        if (d.querySelectorAll) { // IE8
            return d.querySelectorAll("." + search);
        }
        if (d.evaluate) { // IE6, IE7
            pattern = ".//*[contains(concat(' ', @class, ' '), ' " + search + " ')]";
            elements = d.evaluate(pattern, d, null, 0, null);
            while ((i = elements.iterateNext())) {
                results.push(i);
            }
        } else {
            elements = d.getElementsByTagName("*");
            pattern = new RegExp("(^|\\s)" + search + "(\\s|$)");
            for (i = 0; i < elements.length; i++) {
                if ( pattern.test(elements[i].className) ) {
                    results.push(elements[i]);
                }
            }
        }
        return results;
    };
}

// Source: https://github.com/Alhadis/Snippets/blob/master/js/polyfills/IE8-child-elements.js
if(!("previousElementSibling" in document.documentElement)){
    Object.defineProperty(Element.prototype, "previousElementSibling", {
        get: function(){
            var e = this.previousSibling;
            while(e && 1 !== e.nodeType)
                e = e.previousSibling;
            return e;
        }
    });
}

(function () {

    if (typeof window.Element === "undefined" || "classList" in document.documentElement) return;

    var prototype = Array.prototype,
        push = prototype.push,
        splice = prototype.splice,
        join = prototype.join;

    function DOMTokenList(el) {
        this.el = el;
        // The className needs to be trimmed and split on whitespace
        // to retrieve a list of classes.
        var classes = el.className.replace(/^\s+|\s+$/g,'').split(/\s+/);
        for (var i = 0; i < classes.length; i++) {
            push.call(this, classes[i]);
        }
    }

    DOMTokenList.prototype = {
        add: function(token) {
            if(this.contains(token)) return;
            push.call(this, token);
            this.el.className = this.toString();
        },
        contains: function(token) {
            return this.el.className.indexOf(token) != -1;
        },
        item: function(index) {
            return this[index] || null;
        },
        remove: function(token) {
            if (!this.contains(token)) return;
            for (var i = 0; i < this.length; i++) {
                if (this[i] == token) break;
            }
            splice.call(this, i, 1);
            this.el.className = this.toString();
        },
        toString: function() {
            return join.call(this, ' ');
        },
        toggle: function(token) {
            if (!this.contains(token)) {
                this.add(token);
            } else {
                this.remove(token);
            }

            return this.contains(token);
        }
    };

    window.DOMTokenList = DOMTokenList;

    function defineElementGetter (obj, prop, getter) {
        if (Object.defineProperty) {
            Object.defineProperty(obj, prop,{
                get : getter
            });
        } else {
            obj.__defineGetter__(prop, getter);
        }
    }

    defineElementGetter(Element.prototype, 'classList', function () {
        return new DOMTokenList(this);
    });

})();

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
    var arrayPrototype = Array.prototype;
    var supportsIndexOf = 'indexOf' in arrayPrototype;

    /**
     * Checks if the specified CSS class exists on this element's DOM node.
     * @param {Element} el The element to check
     * @param (String) cls The CSS to check for
     */
    ExtL.hasCls = function(el, cls) {
        return !!( el && el.className.match(new RegExp('(\\s|^)'+cls+'(\\s|$)')));
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
        return Object.prototype.toString.call(value) === '[object Date]';
    };

    /**
     * Returns true if the passed value is a JavaScript Array, false otherwise.
     * @param {Object} value The target to test.
     * @return {Boolean}
     */
    ExtL.isArray = ('isArray' in Array) ? Array.isArray : function(value) {
        return Object.prototype.toString.call(value) === '[object Array]';
    };

    /**
     * Returns true if the passed value is a JavaScript Object, false otherwise.
     * @param {Object} value The value to test.
     * @return {Boolean}
     */
    ExtL.isObject = (Object.prototype.toString.call(null) === '[object Object]') ?
        function(value) {
            // check ownerDocument here as well to exclude DOM nodes
            return value !== null && value !== undefined && Object.prototype.toString.call(value) === '[object Object]' && value.ownerDocument === undefined;
        } :
        function(value) {
            return Object.prototype.toString.call(value) === '[object Object]';
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
     * @method
     * Get the index of the provided `item` in the given `array`, a supplement for the
     * missing arrayPrototype.indexOf in Internet Explorer.
     *
     * @param {Array} array The array to check.
     * @param {Object} item The item to find.
     * @param {Number} from (Optional) The index at which to begin the search.
     * @return {Number} The index of item in the array (or -1 if it is not found).
     */
    ExtL.indexOf = supportsIndexOf ? function(array, item, from) {
        return arrayPrototype.indexOf.call(array, item, from);
     } : function(array, item, from) {
        var i, length = array.length;

        for (i = (from < 0) ? Math.max(0, length + from) : from || 0; i < length; i++) {
            if (array[i] === item) {
                return i;
            }
        }

        return -1;
    };

    ExtL.bindReady = function (handler){
        var called = false,
            isFrame;

        function ready() {
            if (called)
                return;
            called = true;
            handler();
        }

        if ( document.addEventListener ) { // native event
            document.addEventListener( "DOMContentLoaded", ready, false );
        } else if ( document.attachEvent ) {  // IE

            try {
                isFrame = window.frameElement != null;
            } catch(e) {}

            // IE, the document is not inside a frame
            if (document.documentElement.doScroll && !isFrame ) {
                function tryScroll(){
                    if (called) 
                        return;
                    try {
                        document.documentElement.doScroll("left");
                        ready();
                    } catch(e) {
                        setTimeout(tryScroll, 10);
                    }
                }
                tryScroll();
            }

            // IE, the document is inside a frame
            document.attachEvent("onreadystatechange", function(){
                if ( document.readyState === "complete" ) {
                    ready();
                }
            });
        }

        // Old browsers
        ExtL.on(window, 'load', ready);
    };

    /**
     *
     */
    ExtL.monitorMouseLeave = function (el, delay, handler, scope) {
        var timer;

        ExtL.on(el, 'mouseleave', function (e) {
            e = e || window.event;
            var obj = {
                target : e.target || e.srcElement
            };
            timer = setTimeout(function () {
                handler.call(scope || ExtL, obj);
            }, delay);
        });

        ExtL.on(el, 'mouseenter', function () {
            clearTimeout(timer);
        });
    };

    /**
     *
     */
    ExtL.monitorMouseEnter = function (el, delay, handler, scope) {
        var timer;

        ExtL.on(el, 'mouseenter', function (e) {
            e = e || window.event;
            var obj = {
                target : e.target || e.srcElement
            };
            timer = setTimeout(function () {
                handler.call(scope || ExtL, obj);
            }, delay);
        });
        ExtL.on(el, 'mouseleave', function () {
            clearTimeout(timer);
        });
    };

    ExtL.on = function (el, event, handler) {
        if (el.addEventListener) {
            el.addEventListener(event, handler);
        } else if (el.attachEvent)  {
            el.attachEvent('on' + event, handler);
        }

        return el;
    };

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
    };

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

    /**
     *
     */
    ExtL.capitalize = function (text) {
        return text.substr(0, 1).toUpperCase() + text.substr(1);
    };

    /**
     * @private
     * Helper method for the up method
     */
    ExtL.collectionHas = function(a, b) { //helper function for up()
        for(var i = 0, len = a.length; i < len; i ++) {
            if(a[i] == b) return true;
        }
        return false;
    };

    /**
     * Finds the parent node matching the passed selector
     */
    ExtL.up = function (el, selector) {
        /*var all = document.querySelectorAll(selector),
            cur = el.parentNode;

        while(cur && !this.collectionHas(all, cur)) { //keep going up until you find a match
            cur = cur.parentNode; //go up
        }
        return cur; //will return null if not found*/
        var target = el.parentNode || null;

        while (target && target.nodeType === 1) {
            if (ExtL.is(target, selector)) {
                return target;
            }
            target = target.parentNode;
        }

        //return target;
        return false;
    };

    ExtL.is = function (el, selector) {
        if (matchesSelector) {
            return el[matchesSelector](selector);
        } else {
            return (function () {
                // http://tanalin.com/en/blog/2012/12/matches-selector-ie8/
                var elems = el.parentNode.querySelectorAll(selector),
                    count = elems.length;

                for (var i = 0; i < count; i++) {
                    if (elems[i] === el) {
                        return true;
                    }
                }
                return false;
            })();
        }
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

    /**
         * Trims whitespace from either end of a string, leaving spaces within the string intact.  Example:
         * @param {String} string The string to trim.
         * @return {String} The trimmed string.
         */
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
     *
     */
    ExtL.isIE8 = function () {
        return typeof XDomainRequest !== "undefined";
    }

    /**
     *
     */
    ExtL.isIE9 = function () {
        return (typeof XDomainRequest !== "undefined" && typeof window.msPerformance !== "undefined");
    }

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
    };

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
    };

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
    };

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
