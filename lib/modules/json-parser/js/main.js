(function() {
    var state = {
        showTree: null
    },
        internalId = 0, // used for setting id's
        tree,data;

    function gotoLink(e) {

        var elem;

        if (e.srcElement) {
            elem = e.srcElement;
        }  else if (e.target) {
            elem = e.target;
        }

        location.href = elem.getAttribute('data');
    }

    if (!ExtL.trim(document.getElementsByClassName('classMeta')[0].innerHTML)) {
        document.getElementsByClassName('classMeta')[0].style.display = 'none';
        document.getElementsByClassName('classMetaHeader')[0].style.display = 'none';
    }

    /**
     * Progressive ID generator
     * @param {String} prefix String to prepend to the ID.  Default to 'e-'.
     */
    function id (prefix) {
        prefix = prefix || 'e-';
        internalId++;
        return prefix + internalId;
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
        var re = new RegExp('(' + value + ')', 'ig'),
            name = member.querySelector('.member-name');

        name.innerHTML = name.textContent.replace(re, '<strong>$1</strong>')
    }

    function unhighlightMemberMatch(member) {
        var name = member.querySelector('.member-name');

        name.innerHTML = name.textContent;
        /*ExtL.each(member.children, function(child) {
            if (child.tagName === 'H2') {
                ExtL.each(child.children, function(c) {
                    c.innerHTML = c.textContent;

                    return true;
                });

                return true;
            }
        });*/
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

    /**
     * Fetch JSON File for search index
     * @param path
     * @param callback
     */
    function fetchJSONFile(path, callback) {
        var httpRequest = new XMLHttpRequest();
        httpRequest.onreadystatechange = function() {
            if (httpRequest.readyState === 4) {
                if (httpRequest.status === 200 || httpRequest.status === 0) {
                    var data = JSON.parse(httpRequest.responseText);
                    if (callback) callback(data);
                }
            }
        };
        httpRequest.open('GET', path);
        httpRequest.send();
    }

    /**
     * Filter the members using the filter input field value
     */
    function filter (e) {
        var me           = this,
            value        = ExtL.trim(e.target.value),
            matcher      = new RegExp(value, 'gi'),
            classmembers = document.getElementsByClassName('classmembers'),
            i            = 0,
            length       = classmembers.length,
            classText    = document.getElementsByClassName('classText')[0],
            matches      = [],
            matchesLen, classMember, owner, header;

        //ExtL.toggleCls(document.body, 'filtered', value);

        for (; i < length; i++) {
            classMember = classmembers[i];
            // find the header of accessor methods (if applicable)
            header = ExtL.hasCls(classMember.parentNode, 'accessor-method') ? classMember.parentNode : false;

            if (classMember.getAttribute('data-member-name').match(matcher)) {
                ExtL.removeCls(classMember, 'be-hidden');

                if (value) {
                    highlightMemberMatch(classMember, value);
                    ExtL.addCls(classText, 'be-hidden');
                    //backToTop();
                    matches.push(classMember);
                } else {
                    ExtL.removeCls(classText, 'be-hidden');
                    unhighlightMemberMatch(classMember);
                }

                // show the accessor header
                if (header) {
                    ExtL.removeCls(header, 'be-hidden');
                }
            } else {
                ExtL.addCls(classMember, 'be-hidden');
                unhighlightMemberMatch(classMember);

                // hide the accessor header
                if (header) {
                    ExtL.addCls(header, 'be-hidden');
                }
            }
        }

        // for all the matches found look to see if the match is an accessor method and
        // if so then show its parent config
        matchesLen = matches.length;
        for (i = 0; i < matchesLen; i++) {
            header = ExtL.hasCls(matches[i].parentNode, 'accessor-method') ? matches[i].parentNode : false;
            if (header) {
                owner = ExtL.up(matches[i], '.classmembers');
                if (owner) {
                    ExtL.removeCls(owner, 'be-hidden');
                }
            }
        }

        // decorate the body (and subsequently all be-hidden els) as filtered
        ExtL.toggleCls(document.body, 'filtered', value.length);

        // if there is a value and matches found then scroll the top match into view
        if (value.length && matchesLen) {
            setTimeout(function () {
                var pos = document.getElementById('classHead').offsetHeight;

                // if the scroll position is greater than the header els then scroll
                if (getScrollPosition() > pos) {
                    window.scrollTo(0, pos);
                }
            }, 10);
        }

        setTypeNavAndHeaderVisibility();
    };

    function searchFilter(e){

        if (!this.searchdata){
            this.searchdata = localStorage.getItem('searchdata');
        }

        var searchdata = JSON.parse(this.searchdata),
            value = ExtL.trim(e.target.value),
            matcher = new RegExp("^"+value, 'gi'),
            resultsdiv = ExtL.get('searchresultslist'),
            best = [], rest = [],
            i, n;

        resultsdiv.innerHTML = '';

        if (value == "") {
            ExtL.addCls(resultsdiv, "hide");
        } else {
            ExtL.removeCls(resultsdiv, "hide");
        }

        for (var i = 0; i < searchdata.length; i++) {
            n = searchdata[i][0].toLowerCase().indexOf(value.toLowerCase());
            if (!n) {
                best.push(searchdata[i]);
            } else if (n > 0) {
                rest.push(searchdata[i]);
            }
        }

        best.push.apply(best,rest);

        var membertypes = {"m":"method", "c":"cfg", "p":"property", "v":"var", "e":"event"};

        for (var i = 0; i < best.length; i++) {
            var member     = best[i];

            if (member) {
                var mname      = member[0],
                    memberarr  = member[1][0].split("#"),
                    cname      = memberarr[0],
                    type       = memberarr[1],
                    type       = membertypes[type];

                if (member) {
                    listitem = ExtL.createElement("li", {
                        class: "search-result",
                        data:  cname + ".html#" + type + "-" + mname
                    }, cname + "#" + mname);
                    resultsdiv.appendChild(listitem);

                    listitem.addEventListener("click", gotoLink, false);
                }
            }
        }
    }

    ExtL.get('box').oninput = ExtL.createBuffered(filter, 200);

    ExtL.get('searchtext').oninput = ExtL.createBuffered(searchFilter, 200);

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
     * Apply an ace editor to all elements with the 'ace-ct' class designation.
     */
    function applyAceEditors () {
        var aceTargets = document.getElementsByClassName('ace-ct'),
            len = aceTargets.length,
            runButtons = document.getElementsByClassName('da-inline-fiddle-nav-fiddle'),
            buttonsLen = runButtons.length,
            codeButtons = document.getElementsByClassName('da-inline-fiddle-nav-code'),
            codeBtnsLen = codeButtons.length,
            i = 0,
            editor;

        for (; i < len; i++) {
            editor = ace.edit(aceTargets[i]);
            editor.setTheme("ace/theme/chrome");
            editor.getSession().setMode("ace/mode/javascript");
            editor.setShowPrintMargin(false);
        }

        for (i = 0; i < buttonsLen; i++) {
            runButtons[i].onclick = onRunFiddleClick;
        }

        for (i = 0; i < codeBtnsLen; i++) {
            codeButtons[i].onclick = onCodeFiddleClick;
        }
    }

    /**
     * Run fiddle button handler
     * @param {Event} e The click event
     */
    function onRunFiddleClick (e) {
        var fiddle = e.target,
            wrap = fiddle.parentNode.parentNode;

        if (wrap && !ExtL.hasCls(wrap, 'disabled')) {
            showFiddle(wrap);
            runFiddleExample(wrap);
            disableFiddleNav(wrap);
        }
    }

    function onCodeFiddleClick (e) {
        var fiddle = e.target,
            wrap = fiddle.parentNode.parentNode;

        if (wrap && !ExtL.hasCls(wrap, 'disabled')) {
            hideFiddle(wrap);
        }
    }

    function disableFiddleNav (wrap) {
        ExtL.addCls(wrap, 'disabled');
    }

    function enableFiddleNav (wrap) {
        ExtL.removeCls(wrap, 'disabled');
    }

    function showFiddle (wrap) {
        var codeNav = wrap.querySelector('.da-inline-fiddle-nav-code'),
            fiddleNav = wrap.querySelector('.da-inline-fiddle-nav-fiddle');

        ExtL.addCls(wrap, 'show-fiddle');
        ExtL.toggleCls(codeNav, 'da-inline-fiddle-nav-active');
        ExtL.toggleCls(fiddleNav, 'da-inline-fiddle-nav-active');
    }

    function hideFiddle (wrap) {
        var codeNav = wrap.querySelector('.da-inline-fiddle-nav-code'),
            fiddleNav = wrap.querySelector('.da-inline-fiddle-nav-fiddle');

        ExtL.removeCls(wrap, 'show-fiddle');
        ExtL.toggleCls(codeNav, 'da-inline-fiddle-nav-active');
        ExtL.toggleCls(fiddleNav, 'da-inline-fiddle-nav-active');
    }

    /**
     * Runs the fiddle example
     * @param {Element} wrap The element housing the fiddle and fiddle code
     */
    function runFiddleExample (wrap) {
        var editor = ace.edit(wrap.querySelector('.ace-ct').id),
            iframe = getIFrame(wrap),
            codes  = [
                {
                    type : 'js',
                    name : 'app.js',
                    code : editor.getValue()
                }
            ],
            data   = {
                framework : 123, //the framework id from fiddle
                codes     : {
                    codes : codes
                }
            },
            form   = buildForm(iframe.id, data),
            mask;

        mask = wrap.appendChild(ExtL.createElement('div', {
            class: 'fiddle-mask'
        }));
        mask.appendChild(ExtL.createElement('div', {
            class: 'spinner'
        }));
        mask.appendChild(ExtL.createElement('div', {
            class: 'mask-msg'
        }, 'Loading...'));

        iframe.onload = function () {
            if (form && form.parentNode) {
                form.parentNode.removeChild(form);
            }
            wrap.removeChild(wrap.querySelector('.fiddle-mask'));
            enableFiddleNav(wrap);
        };

        form.submit();
    }

    /**
     * @private
     * Used by the runFiddleExample method.  Builds / returns an iframe used to run
     * the fiddle code.
     * @param {Element} wrap The element wrapping the fiddle and fiddle code
     * @return {Element} The iframe used for the anonymous fiddle
     */
    function getIFrame (wrap) {
        var iframe = wrap.querySelector('iframe');

        if (!iframe) {
            iframe = document.createElement('iframe');

            iframe.id = iframe.name = id(); //needs to be unique on whole page

            wrap.appendChild(iframe);
        }

        return iframe;
    }

    /**
     * @private
     * Used by the runFiddleExample method.  Appends a form to the body for use by the
     * anonymous fiddle examples.
     * @param {String} target The ID of the target fiddle iframe
     * @param {Array} params Array of form input fields
     * @return {Element} The form used the submit the fiddle code to the fiddle server
     */
    function buildForm (target, params) {
        var form = ExtL.createElement('form', {
            role   : 'presentation',
            action : 'https://fiddle.sencha.com/run?dc=' + new Date().getTime(),
            method : 'POST',
            target : target,
            style  : 'display:none'
        });

        ExtL.each(params, function (key, val) {
            if (ExtL.isArray || ExtL.isObject) {
                val = ExtL.htmlEncode(JSON.stringify(val));
            }

            form.appendChild(ExtL.createElement('input', {
                type  : 'hidden',
                name: key,
                value: val
            }));
        });

        document.body.appendChild(form);

        return form;
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

            applyAceEditors();

            if (localStorage.getItem("searchdata") === null) {
                fetchJSONFile('search.json', function (data) {
                    localStorage.setItem('searchdata', JSON.stringify(data));
                });
            }
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
