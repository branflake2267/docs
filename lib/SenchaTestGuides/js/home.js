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

    ExtL.hasCls = function(el, cls) {
        return !!el.className.match(new RegExp('(\\s|^)'+cls+'(\\s|$)'));
    };
    ExtL.addCls = function(el, cls) {
        this.toggleCls(el, cls, true);
    };
    ExtL.removeCls = function(el, cls) {
        this.toggleCls(el, cls, false);
    };

    ExtL.toggleCls = function(el, cls, state) {
        var reg;

        if (state !== true && state !== false) {
            state = !ExtL.hasCls(el, cls);
        }

        if (state) {
            if (!this.hasCls(el, cls)) {
                el.className += ' ' + cls.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
            }
        } else {
            if (ExtL.hasCls(el, cls)) {
                reg = new RegExp('(\\s|^)' + cls + '(\\s|$)');
                el.className = el.className.replace(reg, ' ');
            }
        }
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

    ExtL.isString = function(value) {
        return typeof value === 'string';
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
        /*var me = this,
            target = el,
            topmost = document.documentElement,
            depth = 0,
            limit = 50;

        while (target && target.nodeType === 1 && depth < limit && target !== topmost) {
            if (me.is(target, selector)) {
                return target;
            }
            depth++;
            target = target.parentNode;
        }
        return null;*/
    }

    ExtL.is = function (el, selector) {
        return el[matchesSelector](selector);
    };
})();

(function(define) {
    'use strict';

    (function(root, factory) {
        if (typeof define === 'function' && define.amd) {
            define(factory);
        } else if (typeof exports === 'object') {
            module.exports = factory();
        } else {
            root.TreeView = factory();
        }
    }(window, function() {
        return (function() {

            /** List of events supported by the tree view */
            var events = ['expand', 'collapse', 'select'];

            /**
             * @constructor
             * @property {object} handlers The attached event handlers
             * @property {object} data The JSON object that represents the tree structure
             * @property {DOMElement} node The DOM element to render the tree in
             */
            function TreeView(data, node) {
                this.handlers = {};
                this.node = node;
                this.nodeEl = document.getElementById(node);
                this.data = data;
                render(this);
            }

            /**
             * A forEach that will work with a NodeList and generic Arrays
             * @param {array|NodeList} arr The array to iterate over
             * @param {function} callback Function that executes for each element. First parameter is element, second is index
             * @param {object} The context to execute callback with
             */
            function forEach(arr, callback, scope) {
                var i      = 0,
                    length = arr.length;

                for (; i < length; i++) {
                    callback.call(scope, arr[i], i);
                }
            }

            /**
             * Renders the tree view in the DOM
             */
            function render(self) {
                var container  = document.getElementById(self.node),
                    leaves     = [],
                    click      = function(e) {
                        var parent = (e.target || e.currentTarget).parentNode,
                            data   = JSON.parse(parent.getAttribute('data-item')),
                            leaves = parent.parentNode.querySelector('.tree-child-leaves');

                        if (leaves) {
                            if (leaves.classList.contains('hidden')) {
                                self.expand(parent, leaves);
                            } else {
                                self.collapse(parent, leaves);
                            }
                        } else {
                            emit(self, 'select', {
                                target: e,
                                data: data
                            });
                        }
                    },
                    renderLeaf = function(item) {
                        var leaf    = document.createElement('div'),
                            content = document.createElement('div'),
                            text    = document.createElement('a'),
                            expando = document.createElement('div'),
                            children;

                        leaf.setAttribute('class', 'tree-leaf');

                        content.setAttribute('class', 'tree-leaf-content');
                        content.setAttribute('data-item', JSON.stringify(item));
                        content.setAttribute('isLeaf', item.leaf);

                        text.setAttribute('class', 'tree-leaf-text');
                        text.innerHTML = item.name;

                        if ((!item.children) || (item.name == item.className)) {
                            text.href = item.className + '.html';
                        }

                        expando.setAttribute('class', 'tree-expando' + (item.expanded ? ' expanded' : ''));
                        expando.textContent = item.expanded ? '▿' : '▸';

                        content.appendChild(expando);
                        content.appendChild(text);

                        leaf.appendChild(content);

                        if (item.children && item.children.length > 0) {
                            children = document.createElement('div');

                            children.setAttribute('class', 'tree-child-leaves' + (item.expanded ? '' : ' hidden'));

                            forEach(item.children, function(child) {
                                var childLeaf = renderLeaf(child);

                                children.appendChild(childLeaf);
                            });

                            leaf.appendChild(children);
                        } else {
                            expando.classList.add('hidden');
                        }

                        return leaf;
                    };

                forEach(self.data, function(item) {
                    leaves.push(renderLeaf.call(self, item));
                });

                container.innerHTML = leaves.map(function(leaf) {
                    return leaf.outerHTML;
                }).join('');

                forEach(container.querySelectorAll('.tree-leaf-text'), function(node) {
                    node.onclick = click;
                });
                forEach(container.querySelectorAll('.tree-expando'), function(node) {
                    node.onclick = click;
                });
            };

            /**
             * Emit an event from the tree view
             * @param {string} name The name of the event to emit
             */
            function emit(instance, name) {
                var args = [].slice.call(arguments, 2);

                if (events.indexOf(name) > -1) {
                    if (instance.handlers[name] && instance.handlers[name] instanceof Array) {
                        forEach(instance.handlers[name], function(handle) {
                            window.setTimeout(function() {
                                handle.callback.apply(handle.context, args);
                            }, 0);
                        });
                    }
                } else {
                    throw new Error(name + ' event cannot be found on TreeView.');
                }
            }

            /**
             * Expands a leaflet by the expando or the leaf text
             * @param {DOMElement} node The parent node that contains the leaves
             * @param {DOMElement} leaves The leaves wrapper element
             */
            TreeView.prototype.expand = function(node, leaves) {
                var expando = node.querySelector('.tree-expando');

                expando.textContent = '▿';

                leaves.classList.remove('hidden');

                emit(this, 'expand', {
                    target: node,
                    leaves: leaves
                });
            };

            /**
             *
             */
            TreeView.prototype.expandTo = function(node) {
                var ct, original;

                if (ExtL.isString(node)) {
                    node = this.nodeEl.querySelector(node);
                }
                original = node;

                if (node) {
                    while (ct = this.findLeavesCt(node)) {
                    ct = this.findLeavesCt(node);
                        this.expand(ct.previousElementSibling, ct);
                        node = ct;
                    }
                }

                ExtL.addCls(original, 'selected-node');
            }

            TreeView.prototype.findLeavesCt = function(node) {
                var ct, prev;

                if (ExtL.isString(node)) {
                    node = this.nodeEl.querySelector(node);
                }

                if (node) {
                    ct = ExtL.up(node, '.tree-child-leaves');
                    if (ct) {
                        return ct;
                    }
                }
                return false;
            }

            /**
             * Collapses a leaflet by the expando or the leaf text
             * @param {DOMElement} node The parent node that contains the leaves
             * @param {DOMElement} leaves The leaves wrapper element
             */
            TreeView.prototype.collapse = function(node, leaves) {
                var expando = node.querySelector('.tree-expando');

                expando.textContent = '▸';

                leaves.classList.add('hidden');

                emit(this, 'collapse', {
                    target: node,
                    leaves: leaves
                });
            };

            /**
             * Attach an event handler to the tree view
             * @param {string} name Name of the event to attach
             * @param {function} callback The callback to execute on the event
             * @param {object} scope The context to call the callback with
             */
            TreeView.prototype.on = function(name, callback, scope) {
                if (events.indexOf(name) > -1) {
                    if (!this.handlers[name]) {
                        this.handlers[name] = [];
                    }

                    this.handlers[name].push({
                        callback: callback,
                        context: scope
                    });
                } else {
                    throw new Error(name + ' is not supported by TreeView.');
                }
            };

            /**
             * Deattach an event handler from the tree view
             * @param {string} name Name of the event to deattach
             * @param {function} callback The function to deattach
             */
            TreeView.prototype.off = function(name, callback) {
                var found = false,
                    index;

                if (this.handlers[name] instanceof Array) {
                    this.handlers[name].forEach(function(handle, i) {
                        index = i;

                        if (handle.callback === callback && !found) {
                            found = true;
                        }
                    });

                    if (found) {
                        this.handlers[name].splice(index, 1);
                    }
                }
            };

            return TreeView;
        }());
    }));
}(window.define));
