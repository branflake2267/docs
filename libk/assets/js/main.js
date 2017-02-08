window.DocsApp = window.DocsApp || {};

/**
 * ***********************************
 * TREE
 * ***********************************
 */

/**
 * Tree class to create the nav tree for guides and docs
 * @param {Object[]} data The array of tree nodes to process
 * @param {String} renderTo The ID of the element to render the tree to
 */
function Tree (data, renderTo) {
    var me = this;

    // the class to apply to a node when it and its children are collapsed
    me.collapseCls = 'tree-node-collapsed';

    // cache the parent nodes - used by the collapseAll / expandAll methods
    me._parentNodes = [];

    // first we'll loop over all of the tree nodes and create the tree node elements to 
    // render to the page.  This will create the parent node, child node, and the 
    // wrapping element around the child nodes used to collapse / hide child nodes
    var nodeCfgs = me.createNodeCfgs(data),
        i        = 0,
        len      = nodeCfgs.length,
        // get the element we'll render the tree to
        target   = document.getElementById(renderTo);

    // now that we have the configs used to create each tree node (and its children) 
    // using ExtL.createElement we'll append each node (and its children) to the target 
    // element one after the other
    for (; i < len; i++) {
        var cfg = nodeCfgs[i];

        target.appendChild(
            ExtL.createElement(cfg)
        );
    }

    // sets up the event listener that expands / collapses parent tree nodes
    target.addEventListener('click', function (e) {
        e = e || window.event;
        var el = e.target || e.srcElement;
        // walk up the tree until we find a LI item
        while (el && el.tagName !== 'A') {
           el = el.parentNode;
        }
        // if a node was clicked (-vs- clicking on the tree body)
        if (el) {
            me.toggleCollapse(el);
        }
    });
}

/**
 * Return a config object used by ExtL.createElement to create each tree node (and its 
 * child nodes if it has any)
 * @param {Object/Object[]} data The tree node or array of nodes to turn be rendered to 
 * the tree on the page
 * @param {String} parentId The id of the parent node (used when finding the ancestor 
 * chain to expand / collapse)
 * @param {Number} depth The depth of the current node.  Used to decorate a class on 
 * child nodes so that they can be styled as indented in the final output
 * @return {Object[]} The array of configs to pass to ExtL.createElement to create the 
 * actual tree nodes on the page
 */
Tree.prototype.createNodeCfgs = function (data, parentId, depth) {
    data = ExtL.from(data);

    var i    = 0,
        len  = data.length,
        cfgs =  [];

    // the node depth is used to style the tree with extra padding per tree level
    depth = depth || 0;

    // loop over all passed nodes
    for (; i < len; i++) {
        var node = data[i], // the current node
            // the default config to use for this node when processed to the DOM by 
            // ExtL.createElement
            cfg = {
                tag            : 'a',
                id             : node.id,
                parentTreeNode : parentId || null,
                "class"        : 'truncate hover-bg-black-10 db f6 black-80 tree-depth-' + depth
            };

        // if the node is not a leaf node and has its own child nodes then process 
        // decorate the node accordingly and pass the children back into this method 
        // recursively for their own processing
        if (node.children) {
            // since this node is a parent node add it to the _parentNodes property
            this._parentNodes.push(node.id);
            cfg["class"] += ' tree-parent-node pointer ' + this.collapseCls;
            // add the expand / collapse icons, any passed iconCls for the node, the node 
            // text, and finally a wrapping container for all child nodes (used to 
            // collapse children in the UI)
            cfg.cn = [{
                tag     : 'span',
                html    : '▸',
                "class" : 'tree-expando tree-expando-collapsed w1 dib f4 mr1 tc'
            }, {
                tag     : 'span',
                html    : '▿',
                "class" : 'tree-expando tree-expando-expanded w1 dib f4 mr1 tc'
            }, {
                tag     : 'i',
                "class" : node.iconCls || ''
            }, {
                tag  : 'span',
                html : node.text
            }];
            cfgs.push(cfg);

            // the child node wrap (for expand / collapse control)
            cfgs.push({
                tag     : 'div',
                "class" : 'child-nodes-ct',
                cn      : this.createNodeCfgs(node.children, node.id, depth + 1)
            });
        } else {
            // decorate this node as a leaf node
            cfg.leaf = true;
            cfg.href = DocsApp.buildTreeNodeHref(node);
            cfg["class"] += ' pa1 link underline-hover';
            // add the leaf node's icon, text, and a star if it's indicated as "new"
            cfg.cn = [{
                tag     : 'i',
                "class" : node.iconCls || ''
            }, {
                tag  : 'span',
                html : node.text
            }, {
                tag     : 'i',
                "class" : node.displayNew ? 'fa fa-star gold ml2' : ''
            }];
            cfgs.push(cfg);
        }
    }

    return cfgs;
};

/**
 * Toggles the collapse state of the tree node
 * @param {String/HTMLElement} el The HTML element or ID of the tree node to toggle
 * @param {Boolean} collapse Pass `true` or `false` to force the toggle to collapse or 
 * expand.  Passing `true` will force collapse while `false` will force expand.
 * @return {Object} The tree instance
 */
Tree.prototype.toggleCollapse = function (el, collapse) {
    el = ExtL.isString(el) ? ExtL.get(el) : el;

    ExtL.toggleCls(el, this.collapseCls, collapse);
    return this;
};

/**
 * Expands the passed parent tree node
 * @param {String/HTMLElement} node The HTML element or ID of the tree node to expand
 * @return {Object} The tree instance
 */
Tree.prototype.expand = function (node) {
    return this.toggleCollapse(node, false);
};

/**
 * Collapses the passed parent tree node
 * @param {String/HTMLElement} node The HTML element or ID of the tree node to collapse
 * @return {Object} The tree instance
 */
Tree.prototype.collapse = function (node) {
    return this.toggleCollapse(node, true);
};

/**
 * Expand all ancestor nodes up to the passed node
 * @param {String/HTMLElement} node The HTML element or ID of the tree node to expand to
 * @return {Object} The tree instance
 */
Tree.prototype.expandTo = function (node) {
    var el = ExtL.get(node);
    
    while (el) {
        el = ExtL.get(el.getAttribute('parentTreeNode'));
        this.expand(el);
    }

    return this;
};

/**
 * Toggles the collapse state of all parent tree nodes
 * @param {Boolean} collapse Pass `true` or `false` to force the toggle to collapse or 
 * expand.  Passing `true` will force collapse while `false` will force expand.
 * @return {Object} The tree instance
 */
Tree.prototype.toggleCollapseAll = function (collapse) {
    var parentNodes = this.getParentNodes(),
        i           = 0,
        len         = parentNodes.length;

    for (; i < len; i++) {
        this.toggleCollapse(parentNodes[i], collapse);
    }

    return this;
};

/**
 * Expands all tree nodes
 * @return {Object} The tree instance
 */
Tree.prototype.expandAll = function () {
    return this.toggleCollapseAll(false);
};

/**
 * Collapses all tree nodes
 * @return {Object} The tree instance
 */
Tree.prototype.collapseAll = function () {
    return this.toggleCollapseAll(true);
};

/**
 * @private
 * Returns all parent node IDs in the tree.  Used by {@link #collapseAll} and 
 * {@link #expandAll}
 * @return {String[]} Array of the IDs of all parent nodes in the tree
 */
Tree.prototype.getParentNodes = function () {
    return this._parentNodes;
};

/**
 * Decorates the passed tree node as selected
 * @param {String/HTMLElement} node The HTML element or ID of the tree node to select
 * @return {Object} The tree instance
 */
Tree.prototype.select = function (node) {
    var el = ExtL.get(node);

    ExtL.addCls(el, 'bg-black-10 b');
    return this;
};

/**
 * ***********************************
 * DOCS APP
 * ***********************************
 */

/**
 * Builds the navigation tree using the passed tree object (determined in 
 * {@link #initNavTree}).  The navigation tree instance is cached on DocsApp.navTree.
 */
DocsApp.buildNavTree = function (navTree) {
    DocsApp.navTree = new Tree(navTree, 'tree');
};

/**
 * Once the dom is ready the navigation tree for the current page (and the navigation 
 * panel's tabs) are created.  The apiTree object and the guidesTree object are both used 
 * (as applicable as some products are guides-only) to create the navigation tree and its 
 * tabs.
 */
DocsApp.initNavTree = function () {
    // The name of the navigation tree for the current page
    var navTreeName = DocsApp.meta.navTreeName,
        apiTree     = DocsApp.apiTree || {},
        guidesTree  = DocsApp.guidesTree || {},
        navTrees    = ExtL.assign({}, apiTree, guidesTree),
        // the tree object for the current page
        navTree     = navTrees[navTreeName];

    // if a navigation tree is found for the current page
    if (navTree) {
        var id   = DocsApp.meta.myId,
            tabs = [];

        // create the tree
        DocsApp.buildNavTree(navTree);
        // select the node for the current page
        DocsApp.navTree.select(id)
            // and expand the tree to the selected node
            .expandTo(id);

        // next we gather up the tabs to be created at the top of the nav tree
        if (guidesTree) {
            tabs = tabs.concat(ExtL.keys(guidesTree));
        }
        if (apiTree) {
            tabs = tabs.concat(ExtL.keys(apiTree));
        }

        // if tabs were found create the tab elements on the page
        if (tabs.length) {
            DocsApp.initNavTreeTabs(tabs);
        }
    }
};

/**
 * @private
 * Returns the link or constructed href (using the page's relative path to the docs 
 * output root).  Returns `undefined` if the node passed in has neither a link or href.
 * @param {Object} node The tree node to evaluate for link / href
 * @return {String} The href for this node or `undefined` if none are found
 */
DocsApp.buildTreeNodeHref = function (node) {
    var href;

    if (node.href || node.link) {
        href = node.link || (DocsApp.meta.rootPath + '/' + node.href);
    }

    return href;
};

/**
 * @private
 * Returns the first nav tree link / href.  Used by {@link #initNavTreeTabs} when 
 * building the tabs in the nav tree header.  Tabs that are not for the active nav tree 
 * are links to another page relating to that tab.
 * @param {Object} node The node to evaluate for href / link
 * @return {String} The href to set on the tab's anchor element
 */
DocsApp.getNodeHref = function (node) {
    var href;

    while (!href) {
        if (node.href || node.link) {
            href = DocsApp.buildTreeNodeHref(node);
        } else {
            node = node.children[0];
        }
    }
    
    return href;
};

/**
 *
 */
DocsApp.toggleTreeNodes = function() {
    var me        = this,
        navTree   = DocsApp.navTree,
        collapsed = ExtL.hasCls(me, 'fa-minus');

    navTree.toggleCollapseAll(collapsed);

    me.setAttribute('data-toggle', (collapsed ? 'Expand' : 'Collapse') + ' All Classes');

    ExtL.toggleCls(me, 'fa-minus');
    ExtL.toggleCls(me, 'fa-plus');
};

/**
 *
 */
DocsApp.toggleTreeVisibility = function() {
    var makeVisible = ExtL.hasCls(document.body, 'tree-hidden');

    DocsApp.setTreeVisibility(makeVisible);

    if (isStateful) {
        DocsApp.saveState();
    }
};

/**
 * Set class tree visibility
 * @param {Boolean} visible false to hide - defaults to true
 */
DocsApp.setTreeVisibility = function(visible) {
    visible = (visible !== false);
    ExtL.toggleCls(document.body, 'tree-hidden', !visible);
    ExtL.toggleCls(document.body, 'tree-shown', visible);

    DocsApp.saveState();
};

/**
 *
 */
DocsApp.onToggleExamplesClick = function() {
    var body = document.querySelector('body'),
        collapsed = ExtL.hasCls(body, 'collapse-code-all');

    DocsApp.toggleExamples(!collapsed);

    DocsApp.saveState();
};

/**
 * Collapse or expand all code / fiddle blocks
 * @param {Boolean} collapse True to collapse, false to expand, or null to toggle all
 * code / fiddle blocks
 */
DocsApp.toggleExamples = function(collapse) {
    var body = document.querySelector('body'),
        collapseCls = 'collapse-code-all',
        collapsed = ExtL.hasCls(body, collapseCls),
        doCollapse = ExtL.isEmpty(collapse) ? !collapsed : collapse,
        action = doCollapse ? 'addCls' : 'removeCls';

    ExtL[action](body, collapseCls);
    ExtL.each(ExtL.fromNodeList(document.getElementsByClassName('example-collapse-target')), function (ex) {
        ExtL[action](ex, 'example-collapsed');
    });
};

/**
 *
 */
DocsApp.wrapSubCategories = function() {
    console.log('wrap sub cats');
};

/**
 *
 */
DocsApp.onFilterClassCheckboxToggle = function() {
    console.log('on filter class checkbox toggle');
};

/**
 *
 */
DocsApp.onClickMemberMenuType = function() {
    console.log('on click member menu type');
};

/**
 *
 */
DocsApp.onAccessCheckboxClick = function() {
    console.log('on access checkbox click');
};

/**
 * Toggle expand/collapse of all members
 */
DocsApp.onToggleAllClick = function() {
    console.log('on toggle all click');
};

/**
 * Returns the local state object
 */
DocsApp.getState = function(id) {
    return id ? state[id] : state;
};

/**
 * The stateful aspects of the page are collected and saved to localStorage
 */
DocsApp.saveState = function() {
    console.log('save state');
};

/**
 * Fetches the state of the page from localStorage and applies the saved values to
 * the page
 */
DocsApp.fetchState = function() {
    console.log('fetch state');
};

/**
 * Creates the navigation tabs for the navigation panel using the passed tab names
 * @param {String[]} tabs The names of the tabs to create
 */
DocsApp.initNavTreeTabs = function (tabs) {
    // this is the name of the tree the current page belongs to.  It should match one of 
    // the tab names so that we know which tab is active
    var navTreeName = DocsApp.meta.navTreeName,
        // the tree header container for all tabs
        treeHeader  = ExtL.get('tree-header'),
        apiTree     = DocsApp.apiTree || {},
        guidesTree  = DocsApp.guidesTree || {},
        navTrees    = ExtL.assign({}, apiTree, guidesTree),
        i           = 0,
        len         = tabs.length,
        tab, isActive, cfg;

    // loop over the tab names and create each tab for the nav tree header
    for (; i < len; i++) {
        tab      = tabs[i];
        // the active tab is the one that matches tha tree name of the current page
        isActive = tab === navTreeName;
        
        // the default config for all tabs
        cfg = {
            tag : isActive ? 'div' : 'a',
            "class" : 'nav-tab dib black-70 br1 br--top f6',
            html: tab
        };

        // if this is the active tab decorate it as active
        if (isActive) {
            cfg["class"] += ' active-tab bg-near-white ba b--black-10';
        // else it's decorated as an inactive tab and given a link to that tab's landing 
        // page
        } else {
            cfg.href = DocsApp.getNodeHref(
                navTrees[tab][0]
            );
            cfg["class"] += ' link bg-white bl bt br b--transparent hover-bg-black-10';
        }

        // append the tab to the tree header element
        treeHeader.appendChild(ExtL.createElement(cfg));
    }
};

/**
 * Filter the members using the filter input field value
 */
DocsApp.filter = ExtL.createBuffered(function (e, target) {
    console.log('filter');
}, 200);

/**
 *
 * @param e
 */
DocsApp.filterMember = function(e) {
    e = e || window.event;
    DocsApp.filter(e, e.target || e.srcElement);
};

/**
 *
 * @param e
 */
DocsApp.filterSearchByToolkit = function(e) {
    console.log('filter search by toolkit');
};

/**
 *
 * @param item
 * @param event
 * @param menuClose
 * @param fn
 */
DocsApp.addEventsAndSetMenuClose = function(item, event, menuClose, fn) {
    var menuCanClose;

    ExtL.on(item, event, function() {
        // menuCanClose is a closure variable
        if (menuClose != null) {
            menuCanClose = menuClose;
        }

        if (fn) {
            fn();
        }
    });
};

/**
 *
 */
DocsApp.hideMemberTypeMenu = function() {
    var menu = DocsApp.getMemberTypeMenu();

    if (menuCanClose) { // menuCanClose is a closure variable
        ExtL.removeCls(menu, 'show-menu');
    }
};

/**
 *
 * @returns {boolean}
 */
DocsApp.getMemberTypeMenu = function() {
    var menu;

    if (ExtL.get('memberTypeMenu')) {
        menu = ExtL.get('memberTypeMenu');
    } else {
        menu = ExtL.createElement({
            id: 'memberTypeMenu'
        });
        document.body.appendChild(menu);

        DocsApp.addEventsAndSetMenuClose(menu, 'mouseenter', false);
        DocsApp.addEventsAndSetMenuClose(menu, 'mouseleave', true);

        ExtL.monitorMouseLeave(menu, 200, DocsApp.hideMemberTypeMenu);
    }

    return menu;
};

/**
 * Highlight the member nav button in the top nav toolbar when that section is
 * scrolled up against the top nav toolbar
 */
DocsApp.highlightTypeMenuItem = function() {
    console.log('highlight type menu item');
};

/**
 *
 * @param e
 */
DocsApp.onMemberTypeMenuClick = function(e) {
    var target, menuCanClose;

    e = e || window.event;
    target = e.target || e.srcElement;

    if (ExtL.is(target, 'a')) {
        // menuCanClose is a closure variable
        menuCanClose = true;
        DocsApp.hideMemberTypeMenu();
        DocsApp.onHashChange(true);
    }
};

/**
 *
 */
DocsApp.hideSearchHistory = function() {
    console.log('hide search history');
};

/**
 *
 */
DocsApp.searchFilter = function() {
    console.log('search filter');
};

/**
 *
 * @param e
 */
DocsApp.onSearchHistoryClick = function(e) {
    e = e || window.event;
    var target = e.target || e.srcElement,
        field = ExtL.get('searchtext');

    if (target) {
        field.value = target.getAttribute('data-value');
        DocsApp.stopEvent(e);
        DocsApp.hideSearchHistory();
        DocsApp.searchFilter();
        field.focus();
    }
};

/**
 * Show / hide the help page
 */
DocsApp.toggleHelp = function() {
    ExtL.toggleCls(document.body, 'show-help');
};

/**
 *
 * @param curl
 * @returns {string}
 */
DocsApp.getRelativePath = function(curl) {
    var regex = new RegExp('.*guides\/(.*?)\.html'),
        guideMatch = regex.exec(curl)[1],
        slashCount = guideMatch.split("/"),
        rel = '', i;

    if (slashCount.length > 0) {
        for (i = 0; i < slashCount.length; i++) {
            rel = '../' + rel;
        }
    }

    return rel;
};

/**
 *
 * @param force
 */
DocsApp.onHashChange = function(force) {
    console.log('on hash change');
};

/**
 *
 * @param e
 */
DocsApp.onBodyClick = function(e) {
    console.log('on body click');
};

/**
 *
 */
DocsApp.resizeHandler = ExtL.createBuffered(function() {
    console.log('resize handler');
}, 0);

/**
 *
 * @param val
 */
DocsApp.doLogSearchValue = function(val) {
    var field = ExtL.get('searchtext'),
        value = val || field.value,
        temp = [],
        limit = 10;

    ExtL.each(DocsApp.searchHistory, function (item) {
        if (item.toLowerCase() !== value.toLowerCase()) {
            temp.push(item);
        }
    });
    temp.push(value);

    if (temp.length > limit) {
        temp.reverse().length = limit;
        temp.reverse();
    }

    DocsApp.searchHistory = temp;
    DocsApp.saveState();
};

/**
 *
 */
DocsApp.logSearchValue = ExtL.createBuffered(DocsApp.doLogSearchValue, 750);

/**
 * Do all of the scroll related actions
 */
DocsApp.handleScroll = function() {
    DocsApp.monitorScrollToTop();
    if (DocsApp.meta.pageType == 'api') {
        DocsApp.highlightTypeMenuItem();
    }
};

/**
 * Listen to the scroll event and show / hide the "scroll to top" element
 * depending on the current scroll position
 */
DocsApp.monitorScrollToTop = function() {
    var vertical_position = DocsApp.getScrollPosition();

    ExtL.toggleCls(ExtL.get('back-to-top'), 'sticky', vertical_position > 345);
    ExtL.toggleCls(document.body, 'sticky', vertical_position > 345);
};

/**
 * Returns the vertical scroll position of the page
 */
DocsApp.getScrollPosition = function() {
    var verticalPosition = 0,
        ieOffset = document.documentElement.scrollTop,
        pageType = DocsApp.meta.pageType,
        target;

    if (pageType == "api") {
        target = document.querySelector('.class-body-wrap')
    } else if (pageType == "guide") {
        target = document.querySelector('.guide-body-wrap')
    } else {
        target = document.querySelector('.generic-content')
    }

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
};

/**
 * Scroll to the top of the document (no animation)
 * @param e
 * @param pos
 */
DocsApp.setScrollPos = function(e,pos) {
    var pageType = DocsApp.meta.pageType,
        el = (pageType == 'api') ? '.class-body-wrap' :
            ((pageType == 'guide') ? '.guide-body-wrap' : '.generic-content');

    pos = pos || 0;

    e = e || window.event;
    if(e && e.preventDefault) {
        e.preventDefault();
    }

    document.querySelector(el).scrollTop = pos;
    return false;
};

/**
 * @method wheelHandler
 * https://dimakuzmich.wordpress.com/2013/07/16/prevent-scrolling-of-parent-element-with-javascript/
 * http://jsfiddle.net/dima_k/5mPkB/1/
 */
DocsApp.wheelHandler = function() {
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
    if (DocsApp.isMacWebkit) {
        deltaX /= 30;
        deltaY /= 30;
    }
    e.currentTarget.scrollTop -= deltaY;
    // If we ever get a mousewheel or wheel event in (a future version of)
    // Firefox, then we don't need DOMMouseScroll anymore.
    if (DocsApp.isFirefox && e.type !== "DOMMouseScroll")
        element.removeEventListener("DOMMouseScroll", DocsApp.wheelHandler, false);

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
};

/**
 * Returns whether current user agent is mac webkit
 * @returns {boolean}
 */
DocsApp.isMacWebkit = function() {
    return (navigator.userAgent.indexOf("Macintosh") !== -1 &&
    navigator.userAgent.indexOf("WebKit") !== -1)

};

/**
 * Returns whether current user agent is firefox
 * @returns {boolean}
 */
DocsApp.isFirefox = function() {
    return (navigator.userAgent.indexOf("firefox") !== -1);
};

/**
 * Add multiple event listeners to an element
 * @param {HtmlElement} el
 * @param {String} events
 * @param {Function} func
 */
DocsApp.addMultipleEventListeners = function(el, events, func) {
    var event = events.split(' ');

    for (var i = 0; i < event.length; i++) {
        ExtL.on(el, event[i], func);
    }
};

/**
 *
 */
DocsApp.stopEvent = function (e) {
    e = e || window.event;
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
    e.cancelBubble = true;  // IE events
    e.returnValue = false;  // IE events
};

/**
 * ***********************************
 * EVENT HANDLERS
 * ***********************************
 */

DocsApp.initEventHandlers = function () {
    var memberTypeMenu          = DocsApp.getMemberTypeMenu();

    // handle the following of a link in the member type menu
    memberTypeMenu.onclick      = DocsApp.onMemberTypeMenuClick;

    // prevent scrolling of the body when scrolling the member menu
    memberTypeMenu.onmousewheel = DocsApp.wheelHandler;
    memberTypeMenu.onwheel      = DocsApp.wheelHandler;

    if (DocsApp.isFirefox) { // Firefox only
        memberTypeMenu.scrollTop = 0;
        memberTypeMenu.addEventListener("DOMMouseScroll", DocsApp.wheelHandler, false);
    }

    if (ExtL.get('member-filter-field')) {
        DocsApp.addMultipleEventListeners(ExtL.get('member-filter-field'), 'oninput onkeyup onchange', DocsApp.filterMember());
    }

    if (ExtL.get('back-to-top')) {
        ExtL.get('back-to-top').onclick           = DocsApp.setScrollPos;
    }

    if (ExtL.get('help-btn')) {
        ExtL.get('help-btn').onclick              = DocsApp.toggleHelp;
    }

    if (ExtL.get('help-close')) {
        ExtL.get('help-close').onclick            = DocsApp.toggleHelp;
    }

    if (ExtL.get('toggleExamples')) {
        ExtL.get('toggleExamples').onclick        = DocsApp.onToggleExamplesClick;
    }

    if (ExtL.get('hide-class-tree')) {
        ExtL.get('hide-class-tree').onclick       = DocsApp.toggleTreeVisibility;
    }

    if (ExtL.get('member-types-menu')) {
        ExtL.get('member-types-menu').onclick     = DocsApp.onClickMemberMenuType;
    }

    if (ExtL.get('publicCheckbox')) {
        ExtL.get('publicCheckbox').onclick        = DocsApp.onAccessCheckboxClick;
    }

    if (ExtL.get('protectedCheckbox')) {
        ExtL.get('protectedCheckbox').onclick     = DocsApp.onAccessCheckboxClick;
    }

    if (ExtL.get('privateCheckbox')) {
        ExtL.get('privateCheckbox').onclick       = DocsApp.onAccessCheckboxClick;
    }

    if (ExtL.get('inheritedCheckbox')) {
        ExtL.get('inheritedCheckbox').onclick     = DocsApp.onAccessCheckboxClick;
    }

    if (ExtL.get('private-class-toggle')) {
        ExtL.get('private-class-toggle').onclick  = DocsApp.onFilterClassCheckboxToggle;
    }

    if (ExtL.get('toggleAll')) {
        ExtL.get('toggleAll').onclick             = DocsApp.onToggleAllClick;
    }

    // Set up search results toolkit filter button handlers
    if (ExtL.get('modern-search-filter')) {
        ExtL.on(ExtL.get('modern-search-filter'), 'click', DocsApp.filterSearchByToolkit);
    }
    if (ExtL.get('classic-search-filter')) {
        ExtL.on(ExtL.get('classic-search-filter'), 'click', DocsApp.filterSearchByToolkit);
    }

    // Set up search history panel (and ultimately item) click handler
    ExtL.on(ExtL.get('search-history-panel'), 'click', DocsApp.onSearchHistoryClick);

    // globally handle body click events
    document.body.onclick = DocsApp.onBodyClick;

    // monitor changes in the url hash
    window.onhashchange                          = DocsApp.onHashChange;

    // monitor viewport resizing
    ExtL.on(window, 'resize', DocsApp.resizeHandler);

    if (ExtL.getByCls('toggle-tree')) {
        ExtL.getByCls('toggle-tree').onclick      = DocsApp.toggleTreeNodes;
    }
};

/**
 * ***********************************
 * DOCUMENT READY
 * ***********************************
 */

/**
 * Kicks off the logic of the page once the DOM is ready
 */
ExtL.bindReady(function () {
    DocsApp.initNavTree();
    DocsApp.initEventHandlers();
    DocsApp.wrapSubCategories();

    ExtL.removeCls(ExtL.get('tree-header'), 'pre-load');

    DocsApp.resizeHandler();
    DocsApp.handleScroll();
    DocsApp.fetchState(true);

    var pageType  = DocsApp.meta.pageType,
        classType;

    if (pageType == 'api') {
        classType = '.class-body-wrap';
    } else if (pageType == 'guide') {
        classType = '.guide-body-wrap';
    } else {
        classType = '.generic-content';
    }

    document.querySelector(classType).onscroll = DocsApp.handleScroll;

    if (ExtL.getByCls('toolkit-switch')) {
        var link = ExtL.getByCls('toolkit-switch'),
            href = link.href,
            name = href.substring(href.lastIndexOf('/')+1),
            curl = window.location.href,
            rel  = (curl.indexOf('guides') > -1) ? DocsApp.getRelativePath(curl) : '';

        link.href = null;
        link.href = '../' + rel + name;
    }
});
