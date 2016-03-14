(function() {
    var hasClassTemplate = window.isClassTemplate || false,
        isStateful = hasClassTemplate,
        internalId = 0, // used for setting id's
        pageSize = 10,  // used to page search results
        menuCanClose = true, // used to determine if the member type menu is closable
        state = fetchState(true, true) || {
            showTree: null
        },
        isMacWebkit = (navigator.userAgent.indexOf("Macintosh") !== -1 &&
                       navigator.userAgent.indexOf("WebKit") !== -1),
        isFirefox = (navigator.userAgent.indexOf("firefox") !== -1),
        guideTree, tree, masterSearchList, searchRecords, currentPage, eventsEl;

    eventsEl = ExtL.get('guideTab');
    ExtL.on(eventsEl, 'click', toggleNavTab);

    eventsEl = ExtL.get('apiTab');
    ExtL.on(eventsEl, 'click', toggleNavTab);

    eventsEl = ExtL.get('searchtext');
    ExtL.on(eventsEl, 'keyup', searchFilter);
    ExtL.on(eventsEl, 'keydown', searchFilter);

    eventsEl = ExtL.get('mobile-input');
    ExtL.on(eventsEl, 'keyup', searchFilter);
    ExtL.on(eventsEl, 'keydown', searchFilter);
    ExtL.on(eventsEl, 'blur', onMobileInputBlur);

    eventsEl = null;

    function addEventsAndSetMenuClose(item, event, menuClose, fn) {
        ExtL.on(item, event, function() {
            // menuCanClose is a closure variable
            if (menuClose != null) {
                menuCanClose = menuClose;
            }

            if (fn) {
                fn();
            }
        });
    }

    function gotoLink(e) {
        var elem;

        e = e || window.event;

        if (e.srcElement) {
            elem = e.srcElement;
        }  else if (e.target) {
            elem = e.target;
        }

        location.href = elem.getAttribute('data');
    }

    if (document.getElementsByClassName('classMeta')[0]) {
        if (!ExtL.trim(document.getElementsByClassName('classMeta')[0].innerHTML)) {
            document.getElementsByClassName('classMeta')[0].style.display = 'none';
            document.getElementsByClassName('classMetaHeader')[0].style.display = 'none';
        }
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

        resetTempShownMembers();

        ExtL.toggleCls(membersCt, publicCls, publicCheckbox.checked === true);
        ExtL.toggleCls(membersCt, protectedCls, protectedCheckbox.checked === true);
        ExtL.toggleCls(membersCt, privateCls, privateCheckbox.checked === true);

        setTypeNavAndHeaderVisibility();
    }

    /**
     * Reset any temporarily shown class members
     */
    function resetTempShownMembers () {
        var temps = document.querySelectorAll('.temp-show');

        temps = ExtL.fromNodeList(temps);

        if (temps.length) {
            ExtL.each(temps, function (item) {
                ExtL.removeCls(item, 'temp-show');
            });
        }
    }

    /**
     * Toggle the active navigation tab between the api docs and guide tabs
     */
    function toggleNavTab(tab) {
        if (this !== window && ExtL.hasCls(this, 'active-tab')) {
            return;
        }

        var activateApiTab, activateGuideTab;

        if (ExtL.isString(tab)) {
            activateApiTab = (tab === 'apiTab');
            activateGuideTab = !activateApiTab;
        }

        ExtL.toggleCls(ExtL.get('tree'), 'hide', activateGuideTab);
        ExtL.toggleCls(ExtL.get('guide-tree'), 'hide', activateApiTab);
        ExtL.toggleCls(ExtL.get('apiTab'), 'active-tab', activateApiTab);
        ExtL.toggleCls(ExtL.get('guideTab'), 'active-tab', activateGuideTab);

        saveState();
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
            typeCt, headersLen, els, len, j, hasVisible, count, btn;

        for (; i < typeLen; i++) {
            typeCt = ExtL.get(types[i] + '-ct');
            if (typeCt) {
                headers.push(typeCt);
            }

            // account for the required / optional configs/properties/methods sub-headings
            if (typeCt && (types[i] === 'configs' || types[i] === 'properties' || types[i] === 'methods')) {
                typeCt = ExtL.get((types[i] === 'configs' ? 'optional' : 'instance') + '-' + types[i] +'-ct');
                if (typeCt) {
                    headers.push(typeCt);
                }
                typeCt = ExtL.get((types[i] === 'configs' ? 'required' : 'static') + '-'+ types[i] +'-ct');
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
            els = headers[i].querySelectorAll('div.classmembers');
            len = els.length;
            hasVisible = false;
            count = 0;
            for (j = 0; j < len; j++) {
                if (els.item(j).offsetHeight) {
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
    }

    function highlightMemberMatch(member, value) {
        var re = new RegExp(('(' + value + ')').replace('$', '\\$'), 'ig'),
            name = member.querySelector('.member-name');

        name.innerHTML = (name.textContent || name.innerText).replace(re, '<strong>$1</strong>');
    }

    function unhighlightMemberMatch(member) {
        var name = member.querySelector('.member-name');

        name.innerHTML = name.textContent || name.innerText;
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
        };
    }

    /**
     * Set class tree visibility
     * @param {Boolean} visible false to hide - defaults to true
     */
    function setTreeVisibility(visible) {
        var tree = ExtL.get('class-tree-ct'),
            members = ExtL.get('rightMembers'),
            hiddenCls = 'tree-hidden',
            size = getViewportSize();

        visible = (visible === false) ? false : true;

        // reset left
        tree.style.left = '';

        ExtL.toggleCls(tree, hiddenCls, !visible);
        ExtL.toggleCls(members, hiddenCls, !visible);

        // for smaller screens, we need to tweak things a bit
        if (size.width <= 800) {
            tree.style.left =  !visible ? '-350px' : 0;
        }
        // finally, need to reposition bar so width will get calculated if needed
        //positionMembersBar();
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
    var filter = ExtL.createBuffered(function (e) {
        e = e || window.event;

        var target       = e.target || e.srcElement,
            value        = ExtL.trim(target.value),
            matcher      = new RegExp(value.replace('$', '\\$'), 'gi'),
            classmembers = document.getElementsByClassName('classmembers'),
            length       = classmembers.length,
            classText    = document.getElementsByClassName('classText')[0],
            matches      = [],
            i            = 0,
            matchesLen, classMember, owner, header;

        resetTempShownMembers();

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
    }, 200);

    function getSearchList () {
        var list = masterSearchList,
            itemTpl = '{0}-{1}`';

        if (!list) {
            list = '';
            ExtL.each(searchIndex, function (i, cls) {  // iterate over each class object
                var missingAccessors = [];    // collect up any missing auto-generated accessors to be added to the class object

                ExtL.each(cls, function (key, obj) {    // inspect each member - could be the class name, alias, or a class member object
                    var memberName, cap;

                    if (key === 'n') {                  // this is the class name
                        list += ExtL.format(itemTpl, i, obj);
                    } else if (key === 'g') {           // this is any alternate class names
                        ExtL.each(obj, function (x) {
                            list += ExtL.format(itemTpl, i, obj);
                        });
                    } else if (key === 'x') {           // this is any aliases found for the class
                        ExtL.each(obj, function (obj) {
                            list += ExtL.format(itemTpl, i, obj);
                        });
                    } else {                            // else this is a member object
                        list += ExtL.format(itemTpl, i, key);

                        memberName = key.substr(key.indexOf('.') + 1);
                        cap = ExtL.capitalize(memberName);

                        if (obj.g) {                    // if this is an accessor
                            if (!cls['m.get' + cap]) { // if the getter doesn't exist already
                                missingAccessors.push('get' + cap);
                                list += ExtL.format(itemTpl, i, 'm.get' + cap);
                            }
                            if (!cls['m.set' + cap]) { // if the setter doesn't exist already
                                missingAccessors.push('set' + cap);
                                list += ExtL.format(itemTpl, i, 'm.set' + cap);
                            }
                        }
                    }
                });

                // add each missing accessor method to the class object
                // as a public setter / getter
                ExtL.each(missingAccessors, function (accessor) {
                    cls['m.' + accessor] = {
                        a: 'p'
                    };
                });
            });
            masterSearchList = list;
        }
        return list;
    }

    function searchFilter(e){
        var results = [],
            searchList = getSearchList(),
            keyCode, result, value, rx, item, records;

        e = e || window.event;
        keyCode = e.keyCode || e.which;

        if (e.type === 'keydown') {
            if (keyCode !== 13) {
                return;
            }
            if (e.preventDefault) {
                e.preventDefault();
            }
            onSearchEnter();
            return;
        }

        value = ExtL.trim((e.target || e.srcElement).value).toLowerCase();
        value = value.replace('$', '\\$');

        if (!value.length) {
            hideSearchResults();
            return;
        }

        rx = new RegExp('(\\d+)(?:-)([$a-zA-Z0-9\\.\-]*' + value + '[a-zA-Z0-9\-]*)(?:`)', 'gi');

        while ((result = rx.exec(searchList))) {
            item = {
                searchValue: value,
                searchMatch: result[2],
                classObj: searchIndex[result[1]]
            };
            results.push(item);
        }
        records = prepareSearchRecords(results);
        searchRecords = records;    // save this up so it can be used ad hoc

        showSearchResults(1);
    }

    function prepareSearchRecords (results) {
        // BELOW IS THE SORTING ORDER

        //exact xtype                           5 -
        //exact classname (public)              10 -
        //exact configs (public)                15 -
        //exact configs (protected)             20 -
        //exact properties (public)             25 -
        //exact properties (protected)          30 -
        //exact methods (public)                35 -
        //exact methods (protected)             40 -
        //exact events (public)                 45 -
        //exact events (protected)              50 -
        //exact css vars (public)               55 -
        //exact css vars (protected)            60 -
        //exact css mixins (public)             65 -
        //exact css mixins (protected)          70 -

        //begins with xtype: alias              100 -
        //begins with classname (public)        200 -
        //begins with configs (public)          300 -
        //begins with configs (protected)       400 -
        //begins with properties (public)       500 -
        //begins with properties (protected)    600 -
        //begins with methods (public)          700 -
        //begins with methods (protected)       800 -
        //begins with events (public)           900 -
        //begins with events (protected)        1000 -
        //begins with css vars (public)         1100 -
        //begins with css vars (protected)      1200 -
        //begins with css mixins (public)       1300 -
        //begins with css mixins (protected)    1400 -

        //has xtype: alias                      1500 -
        //has classname (public)                1600 -
        //has configs (public)                  1700 -
        //has configs (protected)               1800 -
        //has properties (public)               1900 -
        //has properties (protected)            2000 -
        //has methods (public)                  2100 -
        //has methods (protected)               2200 -
        //has events (public)                   2300 -
        //has events (protected)                2400 -
        //has css vars (public)                 2500 -
        //has css vars (protected)              2600 -
        //has css mixins (public)               2700 -
        //has css mixins (protected)            2800 -

        //exact classname (private)             2805 -
        //exact configs (private)               2810 -
        //exact properties (private)            2815 -
        //exact methods (private)               2820 -
        //exact events (private)                2825 -
        //exact css vars (private)              2830 -
        //exact css mixins (private)            2835 -

        //begins with classname (private)       2900 -
        //begins with configs (private)         3000 -
        //begins with properties (private)      3100 -
        //begins with methods (private)         3200 -
        //begins with events (private)          3300 -
        //begins with css vars (private)        3400 -
        //begins with css mixins (private)      3500 -

        //has classname (private)               3600 -
        //has configs (private)                 3700 -
        //has properties (private)              3800 -
        //has methods (private)                 3900 -
        //has events (private)                  4000 -
        //has css vars (private)                4100 -
        //has css mixins (private)              4200 -

        ExtL.each(results, function (item) {
            var searchMatch = item.searchMatch,
                searchValue = item.searchValue,
                classObj = item.classObj,
                aliases = item.classObj.x,
                i, aliasPre, aliasPost, member, memberType, memberName, access,
                targetClassName, classSuffix, types, typesDisp, meta;

            types = {
                c: 'cfg',
                p: 'property',
                sp: 'property',
                m: 'method',
                sm: 'static-method',
                e: 'event',
                v: 'property',
                x: 'method'
            };

            typesDisp = {
                c: 'config',
                p: 'property',
                sp: 'property',
                m: 'method',
                sm: 'method',
                e: 'event',
                v: 'css var',
                x: 'css mixin'
            };

            meta = {
                r: 'removed',
                d: 'deprecated',
                s: 'static',
                ro: 'readonly'
            };

            // prioritize alias/xtype
            if (aliases && aliases.indexOf(searchMatch) > -1) {
                ExtL.each(aliases, function (alias) {
                    i = alias.indexOf('.');
                    aliasPre = alias.substring(0, i);
                    aliasPost = alias.substr(i + 1);

                    if (searchMatch === alias) {
                        item.byAlias = true;
                        item.alias = alias;
                        item.aliasPre = aliasPre;
                        item.aliasPost = item.sortValue = aliasPost;
                        item.access = classObj.a === 'i' ? 'private' : 'public';

                        if (searchValue.toLowerCase() === aliasPost.toLowerCase()) {
                            item.priority = 5;
                        } else {
                            item.priority = (aliasPost.search(new RegExp(searchValue, 'i')) === 0) ? 100 : 1500;
                        }
                    }
                });
            }

            // prioritize class / alternate class
            else if (searchMatch === classObj.n || (classObj.g && classObj.g.indexOf(searchMatch) > -1)) {
                item.byClass = true;
                targetClassName = (searchMatch === classObj.n) ? classObj.n : searchMatch;
                classSuffix = targetClassName.substr(targetClassName.lastIndexOf('.') + 1);
                item.sortValue = classSuffix;
                item.access = classObj.a === 'i' ? 'private' : 'public';
                if (classSuffix.toLowerCase() === searchValue.toLowerCase()) {
                    item.priority = (classObj.a) ? 2805 : 10;
                }
                else if (classSuffix.search(new RegExp(searchValue, 'i')) === 0) {
                    item.priority = (classObj.a) ? 2900 : 200;
                } else {
                    item.priority = (classObj.a) ? 3600 : 1600;
                }
            }

            // prioritize members
            else {
                item.byClassMember = true;
                member = searchMatch;
                i = member.indexOf('.');
                memberType = member.substring(0, i);
                memberName = item.sortValue = member.substr(i + 1);
                memberObj = classObj[member];
                access = memberObj.a;
                item.access = access === 'p' ? 'public' : (access === 'i' ? 'private' : 'protected');
                item.memberType = types[memberType];
                item.memberTypeDisp = typesDisp[memberType];

                if (memberObj.x) {
                    item.meta = meta[memberObj.x];
                }

                // note regarding member type, the member's prefix maps as follows:
                //  - c  : configs
                //  - p  : properties
                //  - sp : static properties
                //  - m  : methods
                //  - sm : static methods
                //  - e  : events
                //  - v  : css vars
                //  - x  : css mixins
                // note regarding access, the member's 'a' value maps as follows:
                //  - p : public
                //  - o : protected
                //  - i : private

                // prioritize "begins with"
                if (memberName.toLowerCase() === searchValue.toLowerCase()) {
                    // configs
                    if (memberType === 'c') {
                        item.priority = (access === 'p') ? 15 : ((access === 'o') ? 20 : 2810 );
                    }
                    // properties
                    if (memberType === 'p' || memberType === 'sp') {
                        item.priority = (access === 'p') ? 25 : ((access === 'o') ? 30 : 2815 );
                    }
                    // methods
                    if (memberType === 'm' || memberType === 'sm') {
                        item.priority = (access === 'p') ? 35 : ((access === 'o') ? 40 : 2820 );
                    }
                    // events
                    if (memberType === 'e') {
                        item.priority = (access === 'p') ? 45 : ((access === 'o') ? 50 : 2825 );
                    }
                    // css vars
                    if (memberType === 'v') {
                        item.priority = (access === 'p') ? 55 : ((access === 'o') ? 60 : 2830 );
                    }
                    // css mixins
                    if (memberType === 'x') {
                        item.priority = (access === 'p') ? 65 : ((access === 'o') ? 70 : 2835 );
                    }
                }
                else if (memberName.search(new RegExp(searchValue, 'i')) === 0) {
                    // configs
                    if (memberType === 'c') {
                        item.priority = (access === 'p') ? 300 : ((access === 'o') ? 400 : 3000 );
                    }
                    // properties
                    if (memberType === 'p' || memberType === 'sp') {
                        item.priority = (access === 'p') ? 500 : ((access === 'o') ? 600 : 3100 );
                    }
                    // methods
                    if (memberType === 'm' || memberType === 'sm') {
                        item.priority = (access === 'p') ? 700 : ((access === 'o') ? 800 : 3200 );
                    }
                    // events
                    if (memberType === 'e') {
                        item.priority = (access === 'p') ? 900 : ((access === 'o') ? 1000 : 3300 );
                    }
                    // css vars
                    if (memberType === 'v') {
                        item.priority = (access === 'p') ? 1100 : ((access === 'o') ? 1200 : 3400 );
                    }
                    // css mixins
                    if (memberType === 'x') {
                        item.priority = (access === 'p') ? 1300 : ((access === 'o') ? 1400 : 3500 );
                    }
                } else { // then has
                    // configs
                    if (memberType === 'c') {
                        item.priority = (access === 'p') ? 1700 : ((access === 'o') ? 1800 : 3700 );
                    }
                    // properties
                    if (memberType === 'p' || memberType === 'sp') {
                        item.priority = (access === 'p') ? 1900 : ((access === 'o') ? 2000 : 3800 );
                    }
                    // methods
                    if (memberType === 'm' || memberType === 'sm') {
                        item.priority = (access === 'p') ? 2100 : ((access === 'o') ? 2200 : 3900 );
                    }
                    // events
                    if (memberType === 'e') {
                        item.priority = (access === 'p') ? 2300 : ((access === 'o') ? 2400 : 4000 );
                    }
                    // css vars
                    if (memberType === 'v') {
                        item.priority = (access === 'p') ? 2500 : ((access === 'o') ? 2600 : 4100 );
                    }
                    // css mixins
                    if (memberType === 'x') {
                        item.priority = (access === 'p') ? 2700 : ((access === 'o') ? 2800 : 4200 );
                    }
                }
            }
        });

        return sortSearchItems(results);
    }

    function sortSearchItems(items) {
        return items.sort(function (a, b) {
            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            } else {
                if (a.sortValue < b.sortValue) {
                    return -1;
                } else if (a.sortValue > b.sortValue) {
                    return 1;
                } else {
                    if (a.classObj.n < b.classObj.n) {
                        return -1;
                    } else if (a.classObj.n > b.classObj.n) {
                        return 1;
                    } else {
                        return 0;
                    }
                }
            }
        });
    }

    function getResultsCt () {
        var size = getViewportSize(),
            compressed = size.width <= 800,
            ct = ExtL.get('search-results-ct'),
            searchInput, searchInputBox, top;

        if (!ct) {
            searchInput = compressed ? ExtL.get('mobile-input') :ExtL.get('searchtext');
            searchInputBox = searchInput.getBoundingClientRect();
            top = compressed ? (searchInputBox.bottom + 2) : (searchInputBox.top + searchInput.clientHeight);
            ct = ExtL.createElement({
                id: 'search-results-ct',
                style: 'top: ' + top + 'px;right: ' + (document.body.clientWidth - searchInputBox.right) + 'px;'
            });
            document.body.appendChild(ct);
        }

        return ct;
    }

    function loadSearchPage (page) {
        var i = 0,
            start = page * pageSize - pageSize,
            ct = getResultsCt(),
            value = ExtL.get('searchtext').value,
            rec, access, el, cn, re, matchEl, href, meta;

        page = page || 1;

        ExtL.removeChildNodes(ct);

        for (;i < pageSize; i++) {
            rec = searchRecords[start + i];

            if (rec) {
                cn = [{
                    "class": 'search-match',
                    html: rec.sortValue
                }, {
                    "class": 'search-source',
                    html: rec.classObj.n + (rec.byClassMember ? ('.' + rec.sortValue) : '')
                }];

                access = rec.access;

                meta = [{
                    "class": 'meta-access',
                    html: access === 'private' ? 'private' : (access === 'protected' ? 'protected' : 'public')
                }, {
                    "class": 'meta-type',
                    html: rec.byAlias ? 'alias' : (rec.byClass ? 'class' : rec.memberTypeDisp)
                }];

                if (rec.byClassMember && rec.meta) {
                    meta.push({
                        "class": 'meta-meta ' + rec.meta,
                        html: rec.meta
                    });
                }

                cn.push({
                    "class": (access === 'private' ? 'private' : (access === 'protected' ? 'protected' : 'public')) + ' search-item-meta-ct',
                    cn: meta
                });

                href = rec.classObj.n + '.html';

                if(window.location.href.indexOf('guides') > -1) {
                    href = '../' + href;
                }

                if (rec.byClassMember) {
                    href += '#' + rec.memberType + '-' + rec.sortValue;
                }

                el = ExtL.createElement({
                    tag: 'a',
                    href: href,
                    "class": 'search-item',
                    cn: cn
                });
                ct.appendChild(el);
            }
        }

        if (ct.childNodes.length) {
            // check to see if we have more results than we can display with the results
            // page size and if so add a nav footer with the current page / count
            if (searchRecords.length > pageSize) {
                ct.appendChild(ExtL.createElement({
                    "class": 'search-results-nav',
                    html: (pageSize * page - pageSize + 1) + ' - ' + (pageSize * page) + ' of ' + searchRecords.length,
                    cn: [{
                       "class": 'search-nav-first' + ((page === 1) ? ' disabled' : ''),
                        html: '«'
                    },{
                        "class": 'search-nav-back' + ((page === 1) ? ' disabled' : ''),
                        html: '◄'
                    }, {
                        "class": 'search-nav-forward' + ((searchRecords.length <= page * pageSize) ? ' disabled' : ''),
                        html: '►'
                    }, {
                        "class": 'search-nav-last' + ((searchRecords.length <= page * pageSize) ? ' disabled' : ''),
                        html: '»'
                    }]
                }));
            }
            currentPage = page;

            re = new RegExp('(' + value.replace('$', '\\$') + ')', 'ig');

            for (i = 0; i < ct.childNodes.length; i++) {
                matchEl = ct.childNodes.item(i).querySelector('.search-match');

                if (matchEl) {
                    matchEl.innerHTML = (matchEl.textContent || matchEl.innerText).replace(re, '<strong>$1</strong>');
                }
            }
        } else {
            ct.appendChild(ExtL.createElement({
                "class": 'searh-results-not-found',
                html: 'No results found'
            }));
            currentPage = null;
        }
    }

    function showSearchResults (page) {
        ExtL.addCls(getResultsCt(), 'show-search-results');

        if (page) {
            loadSearchPage(page);
        }
    }

    function hideSearchResults () {
        if (ExtL.hasCls(getResultsCt(), 'show-search-results')) {
            hideMobileSearch();
        }
        ExtL.removeCls(getResultsCt(), 'show-search-results');
    }

    function hideMobileSearch () {
        var input = ExtL.get('peekaboo-input');
        input.style.visibility = 'hidden';
    }

    function showMobileSearch () {
        var input = ExtL.get('peekaboo-input');

        input.style.visibility = 'visible';
        ExtL.get('mobile-input').focus();
    }

    function onBodyClick (e) {
        e = e || window.event;
        var target = e.target || e.srcElement;
        if (e) {
            if (target.id != 'searchtext') {
                hideSearchResults();
            } else {
                if (getResultsCt().childNodes.length) {
                    showSearchResults();
                }
            }

            if (ExtL.hasCls(target, 'member-name') || ExtL.hasCls(target, 'collapse-toggle') || (ExtL.hasCls(e.srcElement, 'collapse-toggle'))) {
                onMemberCollapseToggleClick(target);
            }
        }
    }

    function onMobileInputBlur (e) {
        var target = e.relatedTarget,
            node = target,
            search = 'search-results-ct',
            isResult = false;

        while (node) {
            if (node.id===search) {
                isResult = true;
                break;
            }
            else {
                isResult = false;
            }

            node = node.parentNode;
        }

        if (!isResult) {
            hideMobileSearch();
        }
    }

    function onSearchEnter() {
        var ct = getResultsCt(),
            first = ct.querySelector('.search-item');

        if (first) {
            window.location.href = first.href;
            return false;
        }
    }

    /**
     *
     */
    function onResultsCtClick (e) {
        var target;
        e = e || window.event;
        target = e.target || e.srcElement;

        if (e.stopPropagation) {
            e.stopPropagation();
        }

        if (ExtL.hasCls(target, 'search-nav-first') && !ExtL.hasCls(target, 'disabled')) {
            loadSearchPage(1);
        } else if (ExtL.hasCls(target, 'search-nav-back') && !ExtL.hasCls(target, 'disabled')) {
            loadSearchPage(currentPage - 1);
        } else if (ExtL.hasCls(target, 'search-nav-forward') && !ExtL.hasCls(target, 'disabled')) {
            loadSearchPage(currentPage + 1);
        } else if (ExtL.hasCls(target, 'search-nav-last') && !ExtL.hasCls(target, 'disabled')) {
            loadSearchPage(Math.ceil(searchRecords.length/pageSize));
        }
    }

    // keep the body click handler from processing
    getResultsCt().onclick = onResultsCtClick;

    if (ExtL.treeData) {
        tree = new TreeView(ExtL.treeData, 'tree');
    }

    if (ExtL.treeDataGuide) {
        guideTree = new TreeView(ExtL.treeDataGuide, 'guide-tree');
    }

    /**
     * Returns the vertical scroll position of the page
     */
    function getScrollPosition() {
        var verticalPosition = 0,
            target = document.querySelector('.class-body-wrap'),
            ieOffset = document.documentElement.scrollTop;

        if (window.pageYOffset) {
            verticalPosition = window.pageYOffset;
        } else if (target.clientHeight) { //ie
            verticalPosition = target.scrollTop;
        } else if (document.body) { //ie quirks
            verticalPosition = target.scrollTop;
        }else {
            verticalPosition = ieOffset;
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

            if (item.offsetHeight && (itemTop < memberTypesBottom)) {
                activeItem = item;
            }
        }

        // remove the activeCls from all nav buttons
        i = 0;
        for (; i < memberTypeLen; i++) {
            ExtL.removeCls(ExtL.up(memberTypeButtons.item(i), 'a'), activeCls);
        }
        // and then decorate the active one
        if (activeItem) {
            activeButtonEl = ExtL.get(activeItem.id + '-button-link');
            ExtL.addCls(activeButtonEl, activeCls);
        }
    }

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
    }

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
    }

    /**
     *
     */
    function onRelatedClassesToggleClick() {
        toggleRelatedClassesCt();
        saveState();
    }

    /**
     * @param {Boolean} collapse true to collapse the related classes section.  Else the
     * state is toggled from its current condition
     */
    function toggleRelatedClassesCt(collapse) {
        if (!ExtL.get('related-classes')) {
            return false;
        }

        var btn = ExtL.get('related-classes'),
            body = document.body,
            collapsedCls = 'related-collapsed',
            collapsed = ExtL.hasCls(body, collapsedCls);

        collapse = (collapse === true || collapse === false) ? collapse : !collapsed;

        ExtL.toggleCls(body, collapsedCls, collapse);
        btn.innerHTML = collapse ? 'expand' : 'collapse';
    }

    /**
     *
     */
    function onToggleMemberTypesClick() {
        toggleMemberTypesMenu();
    }

    function onClickMemberMenuType() {
        toggleMemberTypesMenu();
    }

    /**
     * Toggles visibility of member type menu
     */
    function toggleMemberTypesMenu() {
        var menu = ExtL.get('member-types-menu'),
            showCls = 'menu-visible',
            hasCls = ExtL.hasCls(menu, showCls);

        ExtL[hasCls ? 'removeCls' : 'addCls'](menu, showCls);
    }

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
            if (ExtL.isIE8 || ExtL.isIE9) {
                editor.getSession().setOption("useWorker", false);
            }
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
        e = e || window.event;
        var fiddle = e.target || e.srcElement,
            wrap = fiddle.parentNode.parentNode;

        if (wrap && !ExtL.hasCls(wrap, 'disabled')) {
            showFiddle(wrap);
            setTimeout(function () {
                runFiddleExample(wrap);
                disableFiddleNav(wrap);
            }, 1);
        }
    }

    function onCodeFiddleClick (e) {
        e = e || window.event;
        var fiddle = e.target || e.srcElement,
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
            mask = wrap.appendChild(ExtL.createElement({
                "class": 'fiddle-mask'
            }));

        if (!ExtL.isIE8() && !ExtL.isIE9()) {
            mask.appendChild(ExtL.createElement({
                "class": 'spinner'
            }));
        }

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
        var form = ExtL.createElement({
            tag    : 'form',
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

            form.appendChild(ExtL.createElement({
                tag: 'input',
                type: 'hidden',
                name: key,
                value: val
            }));
        });

        document.body.appendChild(form);

        return form;
    }


    function getMemberTypeMenu () {
        var menu = ExtL.get('memberTypeMenu'),
            eventAdd;

        if (!menu) {
            menu = ExtL.createElement({
                id: 'memberTypeMenu'
            });
            document.body.appendChild(menu);

            addEventsAndSetMenuClose(menu, 'mouseenter', false);
            addEventsAndSetMenuClose(menu, 'mouseleave', true);

            ExtL.monitorMouseLeave(menu, 200, hideMemberTypeMenu);

        }

        return menu;
    }

    function showMemberTypeMenu (e) {
        e = e || window.event;
        var menu = getMemberTypeMenu(),
            target = e.target || e.ssrcElement,
            targetBox = target.getBoundingClientRect(),
            membersBox = ExtL.get('class-body-wrap').getBoundingClientRect(),
            height = (membersBox.bottom - membersBox.top) - 2,
            maxWidth = (membersBox.right - membersBox.left) - 4,
            targetId = target.id.replace('-nav-btn', ''),
            targetCt = ExtL.get(targetId + '-ct'),
            memberList = ExtL.fromNodeList(targetCt.querySelectorAll('.classmembers')),
            memberLen = memberList.length,
            i = 0,
            eligMembers = [],
            cols = [],
            tallest = 0,
            configsCt, rows, maxCols, maxLiteralWidth, useMembersWidth, width, left, colCount, rowCount, j, col, explicitAccessors;

        //targetId = target.id.replace('-nav-btn', '');
        //targetCt = ExtL.get(targetId + '-ct');
        targetBox = target.getBoundingClientRect();
        //memberList = ExtL.fromNodeList(targetCt.querySelectorAll('.classmembers'));
        //memberLen = memberList.length;
        // menuCanClose is a closure variable
        menuCanClose = false;

        if (targetId === 'methods') {
            configsCt = ExtL.get('configs-ct');

            if (configsCt) {
                explicitAccessors = ExtL.fromNodeList(configsCt.querySelectorAll('.explicit-accessor-method'));
                if (explicitAccessors.length) {
                    memberList = memberList.concat(explicitAccessors);
                }
            }
        }

        ExtL.removeChildNodes(menu);

        ExtL.each(memberList, function (item) {
            var cn = [],
                link, memberObj, name;

            if (item.offsetHeight) {
                link = item.querySelector('.member-name');
                name = ExtL.trim(link.textContent || link.innerText);
                memberObj = {
                    tag: 'a',
                    html: name,
                    title: name,
                    href: '#' + link.getAttribute('data-ref'),
                    sortName: name,
                    sortPriority: 0
                };

                if (targetId === "configs" && (ExtL.hasCls(item, "accessor-method") || ExtL.hasCls(item.parentNode, "accessor-method"))) {
                    memberObj["class"] = "accessor";
                    memberObj.sortName = ExtL.up(item, '.classmembers').getAttribute('data-member-name');
                    if (ExtL.hasCls(item, 'isGetter')) {
                        memberObj.sortPriority = 1;
                    }
                    if (ExtL.hasCls(item, 'isSetter')) {
                        memberObj.sortPriority = 2;
                    }
                }

                if (item.querySelector('.private')) {
                    cn.push({
                        html: 'pri',
                        "class": 'private member-menu-flag'
                    });
                }

                if (item.querySelector('.protected')) {
                    cn.push({
                        html: 'pro',
                        "class": 'protected member-menu-flag'
                    });
                }

                if (item.querySelector('.required')) {
                    cn.push({
                        html: 'req',
                        "class": 'required member-menu-flag'
                    });
                }

                if (item.querySelector('.deprecated')) {
                    cn.push({
                        html: 'dep',
                        "class": 'deprecated member-menu-flag'
                    });
                }

                if (item.querySelector('.removed')) {
                    cn.push({
                        html: 'rem',
                        "class": 'removed member-menu-flag'
                    });
                }

                if (item.querySelector('.static')) {
                    cn.push({
                        html: 'sta',
                        "class": 'static member-menu-flag'
                    });
                }

                if (item.querySelector('.readonly')) {
                    cn.push({
                        html: 'ro',
                        "class": 'readonly member-menu-flag'
                    });
                }

                if (item.querySelector('.template')) {
                    cn.push({
                        html: 'tpl',
                        "class": 'template member-menu-flag'
                    });
                }

                if (item.querySelector('.chainable')) {
                    cn.push({
                        html: '>',
                        "class": 'chainable member-menu-flag'
                    });
                }

                if (item.querySelector('.bindable')) {
                    cn.push({
                        html: 'bind',
                        "class": 'bindable member-menu-flag'
                    });
                }

                if (cn.length) {
                    memberObj.cn = cn;
                }

                eligMembers.push(memberObj);
            }
        });

        // sort all of the members by name
        // - for configs with getter / setters we'll also then sort by priority
        //   where the config will be sorted with all other configs and if it has a
        //   getter it will follow the config and a setter would then follow before
        //   proceeding with the natural sort order
        eligMembers.sort(function (a, b) {
            var aName = a.sortName,
                bName = b.sortName,
                aPriority = a.sortPriority,
                bPriority = b.sortPriority;

            if (aName < bName) {
                return -1;
            } else if (aName > bName) {
                return 1;
            } else {
                if (aPriority < bPriority) {
                    return -1;
                } else if (aPriority > bPriority) {
                    return 1;
                } else {
                    return 0;
                }
            }
        });

        ExtL.each(eligMembers, function (member, i, arr) {
            arr[i] = ExtL.createElement(member);
        });

        rows = parseInt((height - 34) / 20);
        maxCols = Math.ceil(eligMembers.length / rows);
        maxLiteralWidth = maxCols * 300;
        useMembersWidth = maxLiteralWidth > maxWidth;
        width = useMembersWidth ? maxWidth : maxLiteralWidth;

        if (useMembersWidth) {
            left = membersBox.left;
        } else {
            left = targetBox.left - (width / 2) + ((targetBox.right - targetBox.left) / 2);
            // constrain to the right side of the members container
            if (left > (membersBox.right)) {
                left = left - ((left + width) - (membersBox.right));
            }
            // constrain to the left side of the members container
            if (left < (membersBox.left)) {
                left = membersBox.left;
            }
        }

        ExtL.applyStyles(menu, {
            width: width + 'px',
            height: height + 'px',
            left: left + 'px',
            top: (targetBox.bottom + 10) + 'px'
        });

        colCount = Math.floor(width / 300);

        for (i = 0; i < colCount; i++) {
            col = ExtL.createElement({
                "class": 'member-menu-col',
                style: 'left:' + (i * 300) + 'px;'
            });
            cols.push(col);

            rowCount = eligMembers.length / (colCount - i);

            for (j = 0; j < rowCount; j++) {
                col.appendChild(eligMembers.shift());
            }

            tallest = col.childNodes.length * 20 > tallest ? col.childNodes.length * 20 : tallest;
        }

        tallest = tallest + 34;

        if (tallest < height) {
            ExtL.applyStyles(menu, {
                height: tallest + 'px'
            });
        }

        ExtL.each(cols, function (c) {
            menu.appendChild(c);
        });

        if (rowCount) {
            ExtL.addCls(menu, 'show-menu');
        } else {
            menuCanClose = true;
            hideMemberTypeMenu();
        }
    }

    /**
     *
     */
    function hideMemberTypeMenu (e) {
        var menu = getMemberTypeMenu();

        if (menuCanClose) { // menuCanClose is a closure variable
            ExtL.removeCls(menu, 'show-menu');
        }
    }

    /**
     * Handles the expanding / collapsing of members on click
     * @param {HTMLElement} collapseEl The collapse / expand toggle element
     */
    function onMemberCollapseToggleClick(collapseEl) {
        var member = ExtL.up(collapseEl, '.classmembers');

        ExtL.toggleCls(member, 'member-expanded');
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
        e = e || window.event;
        if(e && e.preventDefault) {
            e.preventDefault();
        }

        document.querySelector('.class-body-wrap').scrollTop = 0;
        return false;
    }

    /**
     * Handles search icon click
     */
    function onSearchIconClick() {
        showMobileSearch();
    }

    /**
     * Handles the click of the toggle class tree button, don't save state
     */
    function onToggleClassTreeClickNoState() {
        toggleTreeVisibility();
    }

    /**
     * Handles the click of the toggle class tree button
     */
    function onToggleClassTreeClick() {
        toggleTreeVisibility();

        if (isStateful) {
            saveState();
        }
    }

    /**
     * Handles the click of the hide class tree button
     */
    function onHideClassTreeClick() {
        var makeVisible = ExtL.hasCls(ExtL.get('class-tree-ct'), 'tree-hidden');

        setTreeVisibility(makeVisible);

        if (isStateful) {
            saveState();
        }
    }

    /**
     * Do all of the scroll related actions
     */
    function handleScroll(e) {
        monitorScrollToTop();
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

        if (width < 1280 && showTree !== true){
            setTreeVisibility(false);
        } else if (width >= 1280 && (showTree || showTree === undefined || showTree === null)) {
            setTreeVisibility(true);
        } else {
            setTreeVisibility(false);
        }

        if (width <= 800) {
            // less than 800, collapse related classes
            toggleRelatedClassesCt(true);
        }
        else {
            toggleRelatedClassesCt(false);
            hideMobileSearch();
        }

        //positionMembersBar();
    }

    /**
     *
     */
    function onAccessCheckboxClick(e) {
        filterByAccess();

        if (isStateful) {
            saveState();
        }
    }

    /**
     *
     */
    function initMemberTypeMouseoverHandlers() {
        var btns = document.querySelectorAll('.toolbarButton'),
            len = btns.length,
            i = 0;

        for (; i < len; i++) {
            addEventsAndSetMenuClose(btns.item(i), 'mouseenter', false);
            addEventsAndSetMenuClose(btns.item(i), 'mouseleave', true);
            addEventsAndSetMenuClose(btns.item(i), 'click', true, hideMemberTypeMenu);

            ExtL.monitorMouseLeave(btns.item(i), 250, hideMemberTypeMenu);
            ExtL.monitorMouseEnter(btns.item(i), 250, showMemberTypeMenu);
        }
    }

    /**
     *
     */
    function onMemberTypeMenuClick (e) {
        var target;

        e = e || window.event;
        target = e.target || e.srcElement;

        if (ExtL.is(target, 'a')) {
            // menuCanClose is a closure variable
            menuCanClose = true;
            hideMemberTypeMenu();
            onHashChange(true);
        }
    }

    /**
     * https://dimakuzmich.wordpress.com/2013/07/16/prevent-scrolling-of-parent-element-with-javascript/
     * http://jsfiddle.net/dima_k/5mPkB/1/
     */
    function wheelHandler (event) {
        var e = event || window.event,  // Standard or IE event object

            // Extract the amount of rotation from the event object, looking
            // for properties of a wheel event object, a mousewheel event object
            // (in both its 2D and 1D forms), and the Firefox DOMMouseScroll event.
            // Scale the deltas so that one "click" toward the screen is 30 pixels.
            // If future browsers fire both "wheel" and "mousewheel" for the same
            // event, we'll end up double-counting it here. Hopefully, however,
            // cancelling the wheel event will prevent generation of mousewheel.
            deltaX = e.deltaX * -30 ||  // wheel event
                     e.wheelDeltaX / 4 ||  // mousewheel
                                    0,    // property not defined
            deltaY = e.deltaY * -30 ||  // wheel event
                      e.wheelDeltaY / 4 ||  // mousewheel event in Webkit
       (e.wheelDeltaY === undefined &&      // if there is no 2D property then
                      e.wheelDelta / 4) ||  // use the 1D wheel property
                         e.detail * -10 ||  // Firefox DOMMouseScroll event
                                   0;     // property not defined

            // Most browsers generate one event with delta 120 per mousewheel click.
            // On Macs, however, the mousewheels seem to be velocity-sensitive and
            // the delta values are often larger multiples of 120, at
            // least with the Apple Mouse. Use browser-testing to defeat this.
            if (isMacWebkit) {
                deltaX /= 30;
                deltaY /= 30;
            }
            e.currentTarget.scrollTop -= deltaY;
            // If we ever get a mousewheel or wheel event in (a future version of)
            // Firefox, then we don't need DOMMouseScroll anymore.
            if (isFirefox && e.type !== "DOMMouseScroll")
                element.removeEventListener("DOMMouseScroll", wheelHandler, false);

            // Don't let this event bubble. Prevent any default action.
            // This stops the browser from using the mousewheel event to scroll
            // the document. Hopefully calling preventDefault() on a wheel event
            // will also prevent the generation of a mousewheel event for the
            // same rotation.
            if (e.preventDefault) e.preventDefault();
            if (e.stopPropagation) e.stopPropagation();
            e.cancelBubble = true;  // IE events
            e.returnValue = false;  // IE events
            return false;
    }

    /**
     *
     */
    function onHashChange (force) {
        var hash = location.hash,
            target, parent, isAccessor;

        if (!hash) {
            return;
        }

        target = ExtL.get(hash.replace('#', ''));

        if (hash && target) {
            ExtL.addCls(target, 'temp-show');
            target.scrollIntoView(true);
            isAccessor = ExtL.hasCls(target, 'accessor-method');
            if (isAccessor) {
                parent = ExtL.up(target, '.classmembers');
                ExtL.addCls(parent, 'member-expanded');
                ExtL.addCls(parent, 'temp-show');
            }
            if (force) {
                target.scrollIntoView(true);
                ExtL.addCls(target, 'member-expanded');
            }
        }
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
    ExtL.get('menu-icon').onclick = onToggleClassTreeClickNoState;
    ExtL.get('search-icon').onclick = onSearchIconClick;
    // hide the class tree panel
    ExtL.get('hide-class-tree').onclick = onHideClassTreeClick;

    // globally handle body click events
    document.body.onclick = onBodyClick;

    if (hasClassTemplate) {
        // show / hide the class tree panel when clicking the show / hide buttons
        //ExtL.get('toggle-class-tree').onclick = onToggleClassTreeClick;

        // show member types menu
        ExtL.get('show-membertypes').onclick = onToggleMemberTypesClick;
        ExtL.get('member-types-menu').onclick = onClickMemberMenuType;
        // expand / collapse the related classes
        ExtL.get('related-classes').onclick = onRelatedClassesToggleClick;

        // show / hide public, protected, and private members
        ExtL.get('publicCheckbox').onclick= onAccessCheckboxClick;
        ExtL.get('protectedCheckbox').onclick= onAccessCheckboxClick;
        ExtL.get('privateCheckbox').onclick= onAccessCheckboxClick;

        // handle the following of a link in the member type menu
        getMemberTypeMenu().onclick = onMemberTypeMenuClick;

        // prevent scrolling of the body when scrolling the member menu
        getMemberTypeMenu().onmousewheel = wheelHandler;
        getMemberTypeMenu().onwheel = wheelHandler;
        if (isFirefox) {              // Firefox only
            getMemberTypeMenu().scrollTop = 0;
            getMemberTypeMenu().addEventListener("DOMMouseScroll", wheelHandler, false);
        }



        ExtL.get('member-filter-field').oninput = function (e) {
            filter(e);
        };
        ExtL.get('member-filter-field').onkeyup = function (e) {
            filter(e);
        };
        ExtL.get('member-filter-field').onchange = function (e) {
            filter(e);
        };
    }

    // monitor viewport resizing
    window.onresize = resizeHandler;

    // monitor changes in the url hash
    window.onhashchange = onHashChange;

    // page kickoff - apply state
    ExtL.bindReady(function () {
        if (isStateful) {
            // fetch state, but don't save since it's the initial read
            fetchState(true);
        }
        resizeHandler();
        wrapSubCategories();

        if (hasClassTemplate) {
            // force a scroll response at load for browsers that don't fire the scroll
            // event themselves initially
            filterByAccess();
            tree.expandTreeToClass();
            handleScroll();
            applyAceEditors();
            initMemberTypeMouseoverHandlers();
            if (window.location.hash) {
                onHashChange(true);
            }

            // handle all window scroll events
            document.querySelector('.class-body-wrap').onscroll = handleScroll;
        }
    });

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
            activeNavTab = ExtL.hasCls(ExtL.get('apiTab'), 'active-tab') ? 'apiTab' : 'guideTab',
            state = getState();

        state.showTree = !ExtL.hasCls(tree, hiddenCls);
        state.collapseRelatedClasses = ExtL.hasCls(document.body, 'related-collapsed');
        if (publicCheckbox) {
            state.publicCheckbox = publicCheckbox.checked;
        }

        if (protectedCheckbox) {
            state.protectedCheckbox = protectedCheckbox.checked;
        }

        if (privateCheckbox) {
            state.privateCheckbox = privateCheckbox.checked;
        }
        state.activeNavTab = activeNavTab;
        localStorage.setItem('htmlDocsState', ExtL.encodeValue(state));
    }

    /**
     * Fetches the state of the page from localStorage and applies the saved values to
     * the page
     */
    function fetchState(skipSave, returnOnly) {
        var saved = localStorage.getItem('htmlDocsState'),
            publicCheckbox = ExtL.get('publicCheckbox'),
            protectedCheckbox = ExtL.get('protectedCheckbox'),
            privateCheckbox = ExtL.get('privateCheckbox'),
            state = ExtL.decodeValue(saved);

        if (!state) {
            return;
        }

        if (returnOnly) {
            return state;
        }

        publicCheckbox.checked = state.publicCheckbox != null ? state.publicCheckbox : true;
        protectedCheckbox.checked = state.protectedCheckbox != null ? state.protectedCheckbox : false;
        privateCheckbox.checked = state.privateCheckbox != null ? state.privateCheckbox : false;
        toggleNavTab(state.activeNavTab);

        if (!skipSave) {
            saveState();
        }
    }

    /**
     * ***********************************
     * eo STATE MANAGEMENT SECTION
     * ***********************************
     */
})();