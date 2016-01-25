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
            classMember;

        ExtL.toggleCls(document.body, 'filtered', value);

        for (; i < length; i++) {
            classMember = classmembers[i];

            if (matcher.test(classMember.getAttribute('data-member-name'))) {
                ExtL.removeCls(classMember, 'hide');

                if (value) {
                    highlightMemberMatch(classMember, value);
                } else {
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
            headerHeight = headerEl.clientHeight - 2,
            toolbarsEl = ExtL.get('member-toolbars'),
            toolbarsHeight = toolbarsEl.offsetHeight,
            setFloat = membersTop <= headerHeight,
            membersWidth = document.querySelectorAll('.members')[0].clientWidth;

        ExtL.toggleCls(toolbarsEl, 'stickyTypeFilter', setFloat);
        toolbarsEl.style.top = setFloat ? (headerHeight + 2) + 'px' : null;
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
        e.preventDefault();
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
