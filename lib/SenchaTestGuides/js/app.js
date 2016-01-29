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

(function() {
    var state = {
        showTree: null
    },
        tree;

    if (!document.getElementsByClassName('classMeta')[0].innerHTML.trim()) {
        document.getElementsByClassName('classMeta')[0].style.display = 'none';
        document.getElementsByClassName('classMetaHeader')[0].style.display = 'none';
    }

    /**
     * Convenience array looping function
     */
    function forEach(arr, callback) {
        var i      = 0,
            length = arr.length;

        if (length) {
            for (; i < length; i++) {
                if (callback(arr[i]) === true) {
                    break;
                }
            }
        }
    }

    /**
     * Show / hide members based on whether public, protected, private, or some
     * combination is checked.
     */
    function filterByAccess() {
        var publicCheckbox = ExtL.get('publicCheckbox'),
            protectedCheckbox = ExtL.get('protectedCheckbox'),
            privateCheckbox = ExtL.get('privateCheckbox'),
            publicCls = 'show-public',
            protectedCls = 'show-protected',
            privateCls = 'show-private',
            membersCt = ExtL.get('rightMembers');

        ExtL.toggleCls(membersCt, publicCls, publicCheckbox.checked === true);
        ExtL.toggleCls(membersCt, protectedCls, protectedCheckbox.checked === true);
        ExtL.toggleCls(membersCt, privateCls, privateCheckbox.checked === true);

        setTypeNavAndHeaderVisibility();
    }

    /**
     * Hide type section headers where there are no members shown by the filters
     *
     * Disable the top nav buttons when no members for that type are shown by the filters
     */
    function setTypeNavAndHeaderVisibility () {
        var headers = [],
            types = ['configs', 'properties', 'methods', 'events', 'vars', 'sass-mixins'],
            typeLen = types.length,
            i = 0,
            totalCount = 0,
            typeCt, headersLen,
            els, len, j, hasVisible, count, btn;

        for (; i < typeLen; i++) {
            typeCt = ExtL.get(types[i] + '-ct');
            if (typeCt) {
                headers.push(typeCt);
            }

            // account for the instance / static properties sub-headings
            if (typeCt && types[i] === 'properties') {
                typeCt = ExtL.get('instance-properties-ct');
                if (typeCt) {
                    headers.push(typeCt);
                }
                typeCt = ExtL.get('static-properties-ct');
                if (typeCt) {
                    headers.push(typeCt);
                }
            }

            // account for the instance / static methods sub-headings
            if (typeCt && types[i] === 'methods') {
                typeCt = ExtL.get('instance-methods-ct');
                if (typeCt) {
                    headers.push(typeCt);
                }
                typeCt = ExtL.get('static-methods-ct');
                if (typeCt) {
                    headers.push(typeCt);
                }
            }

            // account for the required / optional configs sub-headings
            if (typeCt && types[i] === 'configs') {
                typeCt = ExtL.get('optional-configs-ct');
                if (typeCt) {
                    headers.push(typeCt);
                }
                typeCt = ExtL.get('required-configs-ct');
                if (typeCt) {
                    headers.push(typeCt);
                }
            }
        }
        headersLen = headers.length;

        for (i = 0; i < headersLen; i++) {
            ExtL.removeCls(headers[i], 'hide-type-header');
        }

        for (i = 0; i < headersLen; i++) {
            ExtL.removeCls(headers[i], 'hide-type-header');
            els = headers[i].querySelectorAll('div.classmembers');
            len = els.length;
            hasVisible = false;
            count = 0;
            for (j = 0; j < len; j++) {
                if (els.item(j).offsetParent) {
                    count++;
                    hasVisible = true;
                }
            }
            totalCount += count;
            btn = ExtL.get(headers[i].id.substring(0, headers[i].id.length - 3) + '-nav-btn');
            if (btn) {
                btn.querySelector('.nav-btn-count').innerHTML = count;
            }
            if (hasVisible) {
                ExtL.removeCls(headers[i], 'hide-type-header');
                if (btn) {
                    ExtL.removeCls(btn, 'disabled');
                }
            } else {
                ExtL.addCls(headers[i], 'hide-type-header');
                if (btn) {
                    ExtL.addCls(btn, 'disabled');
                }
            }
        }

        ExtL.toggleCls(document.body, 'no-visible-members', totalCount === 0);
    };

    function highlightMemberMatch(member, value) {
        var re = new RegExp('(' + value + ')', 'ig');

        forEach(member.children, function(child) {
            if (child.tagName === 'H2') {
                forEach(child.children, function(c) {
                    c.innerHTML = c.textContent.replace(re, '<strong>$1</strong>');

                    return true;
                });

                return true;
            }
        });
    }

    function unhighlightMemberMatch(member) {
        forEach(member.children, function(child) {
            if (child.tagName === 'H2') {
                forEach(child.children, function(c) {
                    c.innerHTML = c.textContent;

                    return true;
                });

                return true;
            }
        });
    }

    /**
     * Returns an object with:
     *  - width: the viewport width
     *  - height: the viewport height
     */
    function getViewportSize(){
        var e = window,
            a = 'inner';

        if (!('innerWidth' in window)){
            a = 'client';
            e = document.documentElement || document.body;
        }
        return {
            width: e[ a+'Width' ],
            height: e[ a+'Height' ]
        }
    }

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

    ExtL.get('box').oninput = function() {
        var value        = this.value.trim(),
            matcher      = new RegExp(value, 'gi'),
            classmembers = document.getElementsByClassName('classmembers'),
            i            = 0,
            length       = classmembers.length,
            classText    = document.getElementsByClassName('classText')[0],
            classMember;

        ExtL.toggleCls(document.body, 'filtered', value);

        for (; i < length; i++) {
            classMember = classmembers[i];

            if (matcher.test(classMember.getAttribute('data-member-name'))) {
                ExtL.removeCls(classMember, 'hide');

                if (value) {
                    highlightMemberMatch(classMember, value);
                    ExtL.addCls(classText, 'hide');
                    backToTop();
                } else {
                    ExtL.removeCls(classText, 'hide');
                    unhighlightMemberMatch(classMember);
                }
            } else {
                ExtL.addCls(classMember, 'hide');
                unhighlightMemberMatch(classMember);
            }
        }

        setTypeNavAndHeaderVisibility();
    }

    if (ExtL.treeData) {
        tree = new TreeView(ExtL.treeData, 'tree');
    }

    /**
     * Returns the vertical scroll position of the page
     */
    function getScrollPosition() {
        var verticalPosition = 0;

        if (pageYOffset) {
            verticalPosition = pageYOffset;
        } else if (document.documentElement.clientHeight) { //ie
            verticalPosition = document.documentElement.scrollTop;
        } else if (document.body) { //ie quirks
            verticalPosition = document.body.scrollTop;
        }

        return verticalPosition;
    }

    /**
     * Listen to the scroll event and show / hide the "scroll to top" element
     * depending on the current scroll position
     */
    function monitorScrollToTop() {
        var vertical_position = getScrollPosition(),
            scrollToTop = ExtL.get('back-to-top');

        ExtL.toggleCls(scrollToTop, 'sticky', vertical_position > 345);
        ExtL.toggleCls(document.body, 'sticky', vertical_position > 345);
    }

    /**
     * Set the top toolbars with a fixed position once the scroll position would
     * otherwise scroll them out of view
     */
    function positionMembersBar() {
        var membersEl = ExtL.get('rightMembers'),
            membersTop = membersEl.getBoundingClientRect().top,
            headerEl = document.querySelectorAll('h1.class')[0],
            headerHeight = headerEl.clientHeight,
            toolbarsEl = ExtL.get('member-toolbars'),
            toolbarsHeight = toolbarsEl.offsetHeight,
            setFloat = membersTop <= headerHeight,
            membersWidth = document.querySelectorAll('.members')[0].clientWidth;

        ExtL.toggleCls(toolbarsEl, 'stickyTypeFilter', setFloat);
        toolbarsEl.style.top = setFloat ? (headerHeight) + 'px' : null;
        toolbarsEl.style.width = setFloat ? membersWidth + 'px' : null;
        toolbarsEl.nextSibling.nextSibling.style.height = setFloat ? toolbarsHeight + 'px' : null;
    }

    /**
     * Highlight the member nav button in the top nav toolbar when that section is
     * scrolled up against the top nav toolbar
     */
    function highlightTypeMenuItem() {
        var memberTypesEl = ExtL.get('toolbar'),
            memberTypeButtons = memberTypesEl.querySelectorAll('div.toolbarButton'),
            memberTypeLen = memberTypeButtons.length,
            memberTypesBottom = memberTypesEl.getBoundingClientRect().bottom,
            typeHeaders = document.querySelectorAll('h2.type'),
            len = typeHeaders.length,
            activeCls = 'active-type-menu-item',
            i = 0,
            item, itemTop, activeItem, activeButtonEl;

        // find the active type header by whichever scrolled above the nav header last
        for (; i < len; i++) {
            item = typeHeaders.item(i);
            itemTop = item.getBoundingClientRect().top;

            // the 10px is to account for the the 10px "shadow" below the fixed toolbar
            if (item.offsetParent && (itemTop + 140 < memberTypesBottom + 10)) {
                activeItem = item;
            }
        }

        // remove the activeCls from all nav buttons
        i = 0;
        for (; i < memberTypeLen; i++) {
            ExtL.removeCls(memberTypeButtons.item(i), activeCls);
        }
        // and then decorate the active one
        if (activeItem) {
            activeButtonEl = memberTypesEl.querySelectorAll('a[href="#' + activeItem.id + '"]').item(0).parentElement;
            ExtL.addCls(activeButtonEl, activeCls);
        }
    }

    /**
     *
     */
    function expandTreeToClass() {
        var name = document.querySelector('.class').innerHTML;

        name = name.substring(0, name.indexOf('\n'));
        tree.expandTo('[data-item*="' + name + '"][isLeaf="true"]');
    };

    /**
     * @private
     */
    function createWrapper(ct, selector, id, title) {
        var items = ct.querySelectorAll(selector),
            wrap, header, textEl, i, len;

        len = items.length;
        if (len) {
            wrap = document.createElement('div');
            wrap.id = id;
            header = document.createElement('div');
            header.className = 'type-sub-category-title';
            textEl = document.createTextNode(title);
            header.appendChild(textEl);
            wrap.appendChild(header);
            ct.insertBefore(wrap, items.item(0));

            for (i = 0; i < len; i++) {
                wrap.appendChild(items.item(i));
            }
        }
    };

    /**
     *
     */
    function wrapSubCategories() {
        var propertiesCt = ExtL.get('properties-ct'),
            methodsCt    = ExtL.get('methods-ct'),
            configsCt    = ExtL.get('configs-ct');

        if (propertiesCt) {
            createWrapper(propertiesCt, 'div.isNotStatic', 'instance-properties-ct', 'Instance Properties');
            createWrapper(propertiesCt, 'div.isStatic', 'static-properties-ct', 'Static Properties');
        }

        if (methodsCt) {
            createWrapper(methodsCt, 'div.isNotStatic', 'instance-methods-ct', 'Instance Methods');
            createWrapper(methodsCt, 'div.isStatic', 'static-methods-ct', 'Static Methods');
        }

        if (configsCt) {
            createWrapper(configsCt, 'div.isNotRequired', 'optional-configs-ct', 'Optional Configs');
            createWrapper(configsCt, 'div.isRequired', 'required-configs-ct', 'Required Configs');
        }
    };

    /**
     *
     */
    function onRelatedClassesToggleClick() {
        toggleRelatedClassesCt();
        saveState();
    };

    /**
     * @param {Boolean} collapse true to collapse the related classes section.  Else the
     * state is toggled from its current condition
     */
    function toggleRelatedClassesCt(collapse) {
        var btn = ExtL.get('related-classes'),
            body = document.body,
            collapsedCls = 'related-collapsed',
            collapsed = ExtL.hasCls(body, collapsedCls),
            collapse = (collapse === true || collapse === false) ? collapse : !collapsed;

        ExtL.toggleCls(body, collapsedCls, collapse);
        btn.innerHTML = collapse ? 'expand' : 'collapse';
    };

    /**
     * ***********************************
     * EVENT HANDLERS SECTION
     * ***********************************
     */

    /**
     * Scroll to the top of the document (no animation)
     */
    function backToTop(e) {
        if(e) {
            e.preventDefault();
        }

        window.scrollTo(0,0);
        return false;
    }

    /**
     * Handles the click of the toggle class tree button
     */
    function onToggleClassTreeClick() {
        toggleTreeVisibility();
        saveState();
    };

    /**
     * Handles the click of the hide class tree button
     */
    function onHideClassTreeClick() {
        setTreeVisibility(false);
        saveState();
    };

    /**
     * Do all of the scroll related actions
     */
    function handleScroll(e) {
        monitorScrollToTop();
        positionMembersBar();
        highlightTypeMenuItem();
    }

    /**
     * Window resize handler
     */
    function resizeHandler() {
        var size = getViewportSize(),
            showTree = getState('showTree'),
            width = size.width;

        ExtL.toggleCls(document.body, 'vp-med-size', width < 1280);

        if (width < 1280 && showTree !== true) {
            setTreeVisibility(false);
        }

        if (width >= 1280 && showTree === true) {
            setTreeVisibility(true);
        }
    }

    /**
     *
     */
    function onAccessCheckboxClick(e) {
        //toggleDisplay(e);
        filterByAccess();
        saveState();
    }

    /**
     * ***********************************
     * eo EVENT HANDLERS SECTION
     * ***********************************
     */







    /**
     * ***********************************
     * EVENT HANDLER SETUP SECTION
     * ***********************************
     */

    // The back-to-top element is shown when you scroll down a bit
    // clicking it will scroll to the top of the page
    ExtL.get('back-to-top').onclick = backToTop;

    // show / hide the class tree panel when clicking the show / hide buttons
    ExtL.get('toggle-class-tree').onclick = onToggleClassTreeClick;

    // hide the class tree panel
    ExtL.get('hide-class-tree').onclick = onHideClassTreeClick;

    // expand / collapse the related classes
    ExtL.get('related-classes').onclick = onRelatedClassesToggleClick;

    // show / hide public, protected, and private members
    ExtL.get('publicCheckbox').onclick= onAccessCheckboxClick;
    ExtL.get('protectedCheckbox').onclick= onAccessCheckboxClick;
    ExtL.get('privateCheckbox').onclick= onAccessCheckboxClick;

    // handle all window scroll events
    window.onscroll = handleScroll;

    // monitor viewport resizing
    window.onresize = resizeHandler;

    // page kickoff - apply state
    document.onreadystatechange = function () {
        if (document.readyState == "interactive") {
            fetchState();
            resizeHandler();
            wrapSubCategories();
            filterByAccess();
            expandTreeToClass();

            // force a scroll response at load for browsers that don't fire the scroll
            // event themselves initially
            handleScroll();
        }
    }

    /**
     * ***********************************
     * eo EVENT HANDLER SETUP SECTION
     * ***********************************
     */







    /**
     * ***********************************
     * STATE MANAGEMENT SECTION
     * ***********************************
     */

    /**
     * Returns the local state object
     */
    function getState(id) {
        return id ? state[id] : state;
    }

    /**
     * The stateful aspects of the page are collected and saved to localStorage
     */
    function saveState() {
        var tree = ExtL.get('class-tree-ct'),
            hiddenCls = 'tree-hidden',
            publicCheckbox = ExtL.get('publicCheckbox'),
            protectedCheckbox = ExtL.get('protectedCheckbox'),
            privateCheckbox = ExtL.get('privateCheckbox'),
            state = getState();

        state.showTree = !ExtL.hasCls(tree, hiddenCls);
        state.collapseRelatedClasses = ExtL.hasCls(document.body, 'related-collapsed');
        state.publicCheckbox = publicCheckbox.checked;
        state.protectedCheckbox = protectedCheckbox.checked;
        state.privateCheckbox = privateCheckbox.checked;
        localStorage.setItem('htmlDocsState', ExtL.encodeValue(state));
    }

    /**
     * Fetches the state of the page from localStorage and applies the saved values to
     * the page
     */
    function fetchState() {
        var saved = localStorage.getItem('htmlDocsState'),
            publicCheckbox = ExtL.get('publicCheckbox'),
            protectedCheckbox = ExtL.get('protectedCheckbox'),
            privateCheckbox = ExtL.get('privateCheckbox'),
            state = ExtL.decodeValue(saved);

        if (!state) {
            return;
        }

        setTreeVisibility(state.showTree);
        publicCheckbox.checked = state.publicCheckbox;
        protectedCheckbox.checked = state.protectedCheckbox;
        privateCheckbox.checked = state.privateCheckbox;
        toggleRelatedClassesCt(state.collapseRelatedClasses);
        saveState();
    };

    /**
     * ***********************************
     * eo STATE MANAGEMENT SECTION
     * ***********************************
     */


})();
