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
                        e = e || window.event;
                        var parent = (e.target || e.currentTarget || e.srcElement).parentNode,
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
                            expando = document.createElement('span'),
                            clstype = document.createElement('span'),
                            curId   = container.id,
                            prefix  = './' + (me.prefix || ''),
                            //children, guideTree, apiTree, clsTypeClasses;
                            children, clsTypeClasses;

                        leaf.setAttribute('class', 'tree-leaf');

                        content.setAttribute('class', 'tree-leaf-content' + (item.leaf ? ' isLeaf' : ''));
                        content.setAttribute('data-item', JSON.stringify(item));
                        content.setAttribute('id', self.createNodeId(item.className || item.slug));
                        content.setAttribute('isLeaf', item.leaf);

                        text.setAttribute('class', 'tree-leaf-text');
                        text.innerHTML = item.name;

                        if ((!item.children) || (item.name == item.className) || (item.name == item.path)) {
                            if (item.className) {
                                text.href = prefix + item.className + '.html';
                            } else {
                                if (item.link) {
                                    text.href = item.link;
                                    //text.target = '_blank';
                                } else {
                                    text.href = prefix + item.path + '.html';
                                }
                            }
                        }

                        if (item.leaf === false) {
                            clsTypeClasses = 'folder-type';
                        } else if (item.slug && item.leaf === true) {
                            clsTypeClasses = 'guide-type'
                        } else {
                            clsTypeClasses = (item.type) ? item.type + '-type ' : 'class-type';
                        }

                        if(item.first) {
                            clsTypeClasses += " first";
                        }

                        clstype.setAttribute('class', clsTypeClasses);

                        expando.setAttribute('class', 'tree-expando' + (item.expanded ? ' expanded' : ''));
                        expando.innerHTML = item.expanded ? '▿' : '▸';

                        content.appendChild(expando);
                        content.appendChild(clstype);
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
                    },
                    outer = [];

                if (ExtL.isArray(self.data)) {
                    forEach(self.data, function(item) {
                        leaves.push(renderLeaf.call(self, item));
                    });

                    ExtL.each(leaves, function (leaf) {
                        outer.push(leaf.outerHTML);
                    });
                    container.innerHTML = outer.join('');
                }

                ExtL.each(ExtL.fromNodeList(container.children), function (node) {
                    self.cascade(node, function (n) {
                        var childNodes = self.getChildNodes(n),
                            isPublic = false;

                        if (childNodes) {
                            ExtL.each(childNodes, function (child) {
                                if (!ExtL.hasCls(child, 'tree-member-private')) {
                                    isPublic = true;
                                }
                            });
                            if (!isPublic) {
                                ExtL.addCls(n, 'tree-member-private');
                            }
                        }
                    });
                });

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

                //if (events.indexOf(name) > -1) {
                if (ExtL.indexOf(events, name)) {
                    if (instance.handlers[name] && instance.handlers[name] instanceof Array) {
                        forEach(instance.handlers[name], function(handle) {
                            window.setTimeout(function() {
                                handle.callback.apply(handle.context, args);
                            }, 0);
                        });
                    }
                } else {
                    //throw new Error(name + ' event cannot be found on TreeView.');
                }
            }

            /**
             * Expands a leaflet by the expando or the leaf text
             * @param {DOMElement} node The parent node that contains the leaves
             * @param {DOMElement} leaves The leaves wrapper element
             */
            TreeView.prototype.expand = function(node, leaves, selectNode) {
                if (ExtL.isString(node)) {
                    node = ExtL.get(node);
                }

                if (node) {
                    leaves = leaves || node.parentNode.querySelector('.tree-child-leaves');

                    var expando = node.querySelector('.tree-expando');

                    expando.innerHTML = '▿';

                    if (selectNode) {
                        ExtL.addCls(node, 'selected-node');
                    }

                    if (leaves) {
                        leaves.classList.remove('hidden');
                    }

                    emit(this, 'expand', {
                        target: node,
                        leaves: leaves
                    });
                }
            };

            /**
             *
             */
            TreeView.prototype.getNode = function (node) {
                if (ExtL.isString(node)) {
                    node = (node.indexOf('node-') === 0) ? node : ('node-' + node);
                    node = ExtL.get(node);
                }
                return node;
            };

            /**
             *
             */
            TreeView.prototype.getChildNodes = function (node) {
                var children = node.children,
                    childNodes = false;

                if (children.length) {
                    ExtL.each(ExtL.fromNodeList(children), function (direct) {
                        if (ExtL.hasCls(direct, 'tree-child-leaves')) {
                            childNodes = ExtL.fromNodeList(direct.children);
                        }
                    });
                }
                return childNodes;
            }

            /**
             *
             */
            TreeView.prototype.cascade = function (node, fn) {
                node = this.getNode(node);

                var me = this,
                    childNodes = me.getChildNodes(node);

                if (childNodes) {
                    ExtL.each(childNodes, function (n) {
                        me.cascade(n, fn);
                    })
                }
                fn.call(me, node);
            }

            /**
             * Expands the tree to the passed node
             * @param {HTMLElement/String} node The target node / leaf element to expand
             * to or the id of the target node.
             */
            TreeView.prototype.expandTo = function(node) {
                var ct, original;

                node = this.getNode(node);

                original = node;

                if (node) {
                    while (ct = this.findLeavesCt(node)) {
                    ct = this.findLeavesCt(node);
                        this.expand(ct.previousElementSibling, ct);
                        node = ct;
                    }
                }

                if (original) {
                    ExtL.addCls(original, 'selected-node');
                    this.scrollIntoView(original);
                }
            }

            TreeView.prototype.expandTreeToClass = function() {
                var path = window.location.pathname,
                    name = path.substring(path.lastIndexOf('/')+1),
                    node = name.replace(/([\d\D]+).html/, '$1'),
                    id = this.createNodeId(node),
                    el = ExtL.get(id);

                if (el) {
                    this.expandTo(el);
                }
            }

            TreeView.prototype.scrollIntoView = function(node) {
                var tree = ExtL.get('tree'),
                    height = tree.offsetHeight,
                    curPos = node.getBoundingClientRect().top;

                if (curPos > height) {
                    tree.scrollTop = curPos - 250;
                }
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
                if (ExtL.isString(node)) {
                    node = ExtL.get(node);
                }

                if (node) {
                    leaves = leaves || node.parentNode.querySelector('.tree-child-leaves');

                    var expando = node.querySelector('.tree-expando');

                    expando.innerHTML = '▸';

                    leaves.classList.add('hidden');

                    emit(this, 'collapse', {
                        target: node,
                        leaves: leaves
                    });
                }
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

            TreeView.prototype.createNodeId = function (className) {
                var parts = className.split('.'),
                    len = parts.length,
                    nodeId = 'node',
                    i;

                for (i=0; i<len; i++) {
                    nodeId += '-' + parts[i].toLowerCase();
                }

                return nodeId;
            }

            return TreeView;
        }());
    }));
}(window.define));
