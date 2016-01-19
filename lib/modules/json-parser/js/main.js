(function() {
    var state = {
        showTree: null
    };

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

        if (publicCheckbox.checked === true) {
            ExtL.addClass(membersCt, publicCls);
        } else {
            ExtL.removeClass(membersCt, publicCls);
        }

        if (protectedCheckbox.checked === true) {
            ExtL.addClass(membersCt, protectedCls);
        } else {
            ExtL.removeClass(membersCt, protectedCls);
        }

        if (privateCheckbox.checked === true) {
            ExtL.addClass(membersCt, privateCls);
        } else {
            ExtL.removeClass(membersCt, privateCls);
        }

        setTypeNavAndHeaderVisibility();
    }

    /**
     * Hide type section headers where there are no members shown by the filters
     *
     * Disable the top nav buttons when no members for that type are shown by the filters
     */
    function setTypeNavAndHeaderVisibility () {
        var configsCt = ExtL.get('configs-ct'),
            propertiesCt = ExtL.get('properties-ct'),
            methodsCt = ExtL.get('methods-ct'),
            eventsCt = ExtL.get('events-ct'),
            staticMethodsCt = ExtL.get('static-methods-ct'),
            staticPropertiesCt = ExtL.get('static-properties-ct'),
            varsCt = ExtL.get('vars-ct'),
            headers = [configsCt, propertiesCt, methodsCt, eventsCt, staticMethodsCt, staticPropertiesCt, varsCt],
            headersLen = headers.length,
            i = 0,
            els, len, j, hasVisible, count, btn;

        for (; i < headersLen; i++) {
            ExtL.removeClass(headers[i], 'hide-type-header');
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
            btn = ExtL.get(headers[i].id.substring(0, headers[i].id.length - 3) + '-nav-btn');
            btn.querySelector('.nav-btn-count').innerHTML = count;
            if (hasVisible) {
                ExtL.removeClass(headers[i], 'hide-type-header');
                //ExtL.removeClass(ExtL.get(headers[i].substring(0, headers[i].length - 3));
                ExtL.removeClass(btn, 'disabled');
            } else {
                ExtL.addClass(headers[i], 'hide-type-header');
                ExtL.addClass(btn, 'disabled');
            }
        }
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

        if (visible) {
            ExtL.removeClass(tree, hiddenCls);
            ExtL.removeClass(members, hiddenCls);
        } else {
            ExtL.addClass(tree, hiddenCls);
            ExtL.addClass(members, hiddenCls);
        }
    }

    /**
     * Toggle class tree visibility
     */
    function toggleTreeVisibility() {
        var tree = ExtL.get('class-tree-ct'),
            hiddenCls = 'tree-hidden';

        setTreeVisibility(ExtL.hasClass(tree, hiddenCls));
    }

    ExtL.get('box').oninput = function() {
        var value        = this.value.trim(),
            matcher      = new RegExp(value, 'gi'),
            classmembers = document.getElementsByClassName('classmembers'),
            i            = 0,
            length       = classmembers.length,
            classMember;

        if (value) {
            ExtL.addClass(document.body, 'filtered');
        } else {
            ExtL.removeClass(document.body, 'filtered');
        }

        for (; i < length; i++) {
            classMember = classmembers[i];

            if (matcher.test(classMember.getAttribute('data-member-name'))) {
                ExtL.removeClass(classMember, 'hide');

                if (value) {
                    highlightMemberMatch(classMember, value);
                } else {
                    unhighlightMemberMatch(classMember);
                }
            } else {
                ExtL.addClass(classMember, 'hide');

                unhighlightMemberMatch(classMember);
            }
        }

        setTypeNavAndHeaderVisibility();
    }

    if (ExtL.treeData) {
        new TreeView(ExtL.treeData, 'tree');
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

        if (vertical_position > 345) {
            ExtL.addClass(scrollToTop, 'sticky');
            ExtL.addClass(document.body, 'sticky');
        } else {
            ExtL.removeClass(scrollToTop, 'sticky');
            ExtL.removeClass(document.body, 'sticky');
        }
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

        ExtL[setFloat ? 'addClass' : 'removeClass'](toolbarsEl, 'stickyTypeFilter');
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
            ExtL.removeClass(memberTypeButtons.item(i), activeCls);
        }
        // and then decorate the active one
        if (activeItem) {
            activeButtonEl = memberTypesEl.querySelectorAll('a[href="#' + activeItem.id + '"]').item(0).parentElement;
            ExtL.addClass(activeButtonEl, activeCls);
        }
    }







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

        if (width < 1280) {
            ExtL.addClass(document.body, 'vp-med-size');
        } else {
            ExtL.removeClass(document.body, 'vp-med-size');
        }

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
            filterByAccess();
            // Add tree expander
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

        state.showTree = !ExtL.hasClass(tree, hiddenCls);
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
        saveState();
    };

    /**
     * ***********************************
     * eo STATE MANAGEMENT SECTION
     * ***********************************
     */


})();
