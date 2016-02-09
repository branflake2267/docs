(function(define) {
    'use strict';

    ExtL.get('menu-icon').onclick = onToggleClassTreeClick;

    /**
     * Handles the click of the toggle class tree button
     */
    function onToggleClassTreeClick() {
        toggleTreeVisibility();
    };

    /**
     * Set class tree visibility
     * @param {Boolean} visible false to hide - defaults to true
     */
    function setTreeVisibility(visible) {
        var tree = ExtL.get('class-tree-ct'),
            members = ExtL.get('rightMembers'),
            hiddenCls = 'tree-hidden',
            visible = (visible === false) ? false : true;

        ExtL.toggleCls(tree, hiddenCls, !visible);
        ExtL.toggleCls(members, hiddenCls, !visible);
    }

    /**
     * Toggle class tree visibility
     */
    function toggleTreeVisibility() {
        var tree = ExtL.get('class-tree-ct'),
            hiddenCls = 'tree-hidden';

        setTreeVisibility(ExtL.hasCls(tree, hiddenCls));
    }

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
            function TreeView(data, node, prefix) {
                this.handlers = {};
                this.node = node;
                this.nodeEl = document.getElementById(node);
                this.prefix = prefix;
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
                        var me = this,
                            leaf    = document.createElement('div'),
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

                        if ((!item.children) || (item.name == item.className) || (item.name == item.path)) {
                            if (item.className) {
                                text.href = item.className + '.html';
                            } else {
                                text.href = (this.prefix || '') + item.path + '.html';
                            }
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
                                var childLeaf = renderLeaf.call(me, child);

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
