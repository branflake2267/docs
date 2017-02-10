window.DocsApp = window.DocsApp || {};

/**
 * ***********************************
 * TREE
 * ***********************************
 */

/**
 * @constructor
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
        e = DocsApp.getEvent(e);
        var el = DocsApp.getEventTarget(e);
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
 * @method createNodeCfgs
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
 * @method toggleCollapse
 * Toggles the collapse state of the tree node
 * @param {String/Element} el The HTML element or ID of the tree node to toggle
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
 * @method expand
 * Expands the passed parent tree node
 * @param {String/Element} node The HTML element or ID of the tree node to expand
 * @return {Object} The tree instance
 */
Tree.prototype.expand = function (node) {
    return this.toggleCollapse(node, false);
};

/**
 * @method collapse
 * Collapses the passed parent tree node
 * @param {String/Element} node The HTML element or ID of the tree node to collapse
 * @return {Object} The tree instance
 */
Tree.prototype.collapse = function (node) {
    return this.toggleCollapse(node, true);
};

/**
 * @method expandTo
 * Expand all ancestor nodes up to the passed node
 * @param {String/Element} node The HTML element or ID of the tree node to expand to
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
 * @method toggleCollapseAll
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
 * @method expandAll
 * Expands all tree nodes
 * @return {Object} The tree instance
 */
Tree.prototype.expandAll = function () {
    return this.toggleCollapseAll(false);
};

/**
 * @method collapseAll
 * Collapses all tree nodes
 * @return {Object} The tree instance
 */
Tree.prototype.collapseAll = function () {
    return this.toggleCollapseAll(true);
};

/**
 * @method getParentNodes
 * @private
 * Returns all parent node IDs in the tree.  Used by {@link #collapseAll} and 
 * {@link #expandAll}
 * @return {String[]} Array of the IDs of all parent nodes in the tree
 */
Tree.prototype.getParentNodes = function () {
    return this._parentNodes;
};

/**
 * @method select
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
DocsApp.appMeta = {
    internalId    : 0,
    pageSize      : 10,
    menuCanClose  : true,
    allowSave     : false,
    searchHistory : [],
    pos           : {},
    isStateful    : true
};

/**
 * @method buildNavTree
 * Builds the navigation tree using the passed tree object (determined in 
 * {@link #initNavTree}).  The navigation tree instance is cached on DocsApp.navTree.
 */
DocsApp.buildNavTree = function (navTree) {
    DocsApp.navTree = new Tree(navTree, 'tree');
};

/**
 * @method initNavTree
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
 * @method buildTreeNodeHref
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
 * @method getNodeHref
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
 * @method toggleTreeNodes
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
 * @method toggleTreeVisibility
 */
DocsApp.toggleTreeVisibility = function() {
    var makeVisible = ExtL.hasCls(document.body, 'tree-hidden');

    DocsApp.setTreeVisibility(makeVisible);

    if (DocsApp.appMeta.isStateful) {
        DocsApp.saveState();
    }
};

/**
 * @method setTreeVisibility
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
 * @event onToggleExamplesClick
 */
DocsApp.onToggleExamplesClick = function() {
    var body = document.querySelector('body'),
        collapsed = ExtL.hasCls(body, 'collapse-code-all');

    DocsApp.toggleExamples(!collapsed);

    DocsApp.saveState();
};

/**
 * @method setHistoryType
 */
DocsApp.setHistoryType = function() {
    var all = ExtL.get('historyTypeAll').checked;

    ExtL.toggleCls(document.body, 'show-all-history', all);
    DocsApp.saveState();
};

/**
 * @event onToggleHistoryLabels
 */
DocsApp.onToggleHistoryLabels = function() {
    var cb = ExtL.get('history-all-labels');

    ExtL.toggleCls(document.body, 'show-history-labels', cb.checked);
    DocsApp.saveState();
};

/**
 * @method toggleExamples
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
 * @event onFilterClassCheckboxToggle
 */
DocsApp.onFilterClassCheckboxToggle = function() {
    console.log('on filter class checkbox toggle');
};

/**
 * @method filterByAccess
 * Show / hide members based on whether public, protected, private, or some
 * combination is checked.
 */
DocsApp.filterByAccess = function() {
    var publicCheckbox     = ExtL.get('publicCheckbox'),
        protectedCheckbox  = ExtL.get('protectedCheckbox'),
        privateCheckbox    = ExtL.get('privateCheckbox'),
        inheritedCheckbox  = ExtL.get('inheritedCheckbox'),
        publicCls          = 'show-public',
        protectedCls       = 'show-protected',
        privateCls         = 'show-private',
        inheritedCls       = 'show-inherited',
        membersCt          = ExtL.get('rightMembers');

    DocsApp.resetTempShownMembers();

    ExtL.toggleCls(membersCt, publicCls, publicCheckbox.checked === true);
    ExtL.toggleCls(membersCt, protectedCls, protectedCheckbox.checked === true);
    ExtL.toggleCls(membersCt, privateCls, privateCheckbox.checked === true);
    ExtL.toggleCls(membersCt, inheritedCls, inheritedCheckbox.checked === true);

    DocsApp.setTypeNavAndHeaderVisibility();
    DocsApp.highlightTypeMenuItem();
}

/**
 * @event onClickMemberMenuType
 */
DocsApp.onClickMemberMenuType = function() {
    console.log('on click member menu type');
};

/**
 * @event onAccessCheckboxClick
 */
DocsApp.onAccessCheckboxClick = function() {
    DocsApp.filterByAccess();

    if (DocsApp.appMeta.isStateful) {
        DocsApp.saveState();
    }
};

DocsApp.setTypeNavAndHeaderVisibility = function() {
    console.log('set type nav and header visibility');
};

/**
 * @event onToggleAllClick
 * Toggle expand/collapse of all members
 */
DocsApp.onToggleAllClick = function() {
    var memberList  = ExtL.fromNodeList(document.querySelectorAll('.classmembers')),
        symbText    = ExtL.get('toggleAll'),
        isCollapsed = ExtL.hasCls(symbText, 'fa-plus'),
        itemAction  = isCollapsed ? 'addCls' : 'removeCls';

    ExtL.each(memberList, function (item) {
        ExtL[itemAction](item, 'member-expanded');
    });

    ExtL.removeCls(symbText, isCollapsed ? 'fa-plus' : 'fa-minus');
    ExtL.addCls(symbText, isCollapsed ? 'fa-minus' : 'fa-plus');
};

/**
 * @method getState
 * Returns the local state object
 */
DocsApp.getState = function(id) {
    return id ? state[id] : state;
};

/**
 * @method saveState
 * The stateful aspects of the page are collected and saved to localStorage
 */
DocsApp.saveState = function() {
    var path           = window.location.pathname,
        allowSave      = DocsApp.appMeta.allowSave,
        historyRemoves = [];

    if (allowSave !== true || !ExtL.canLocalStorage()) {
        return;
    }

    var publicCheckbox       = ExtL.get('publicCheckbox'),
        protectedCheckbox    = ExtL.get('protectedCheckbox'),
        privateCheckbox      = ExtL.get('privateCheckbox'),
        inheritedCheckbox    = ExtL.get('inheritedCheckbox'),
        privateClassCheckbox = ExtL.get('private-class-toggle'),
        historyType          = ExtL.get('historyTypeCurrent'),
        historyLabelCheckbox = ExtL.get('history-all-labels'),
        apiTab               = ExtL.get('api-tab'),
        guideTab             = ExtL.get('guides-tab'),
        quickStartTab        = ExtL.get('quick-start-tab'),
        modernSearchFilter   = ExtL.get('modern-search-filter'),
        classicSearchFilter  = ExtL.get('classic-search-filter'),
        body                 = document.querySelector('body'),
        collapsed            = ExtL.hasCls(body, 'collapse-code-all'),
        state                = DocsApp.getState() || {},
        pageType             = DocsApp.getPageType(),
        product              = DocsApp.meta.prodObj.title,
        pversion             = DocsApp.meta.prodObj.currentVersion,
        text                 = DocsApp.meta.myId,
        title                = text,
        activeNavTab;

    if (apiTab && ExtL.hasCls(apiTab, 'active-tab')) {
        activeNavTab = 'api-tab';
    }
    if (guideTab && ExtL.hasCls(guideTab, 'active-tab')) {
        activeNavTab = 'guides-tab';
    }
    if (quickStartTab && ExtL.hasCls(quickStartTab, 'active-tab')) {
        activeNavTab = 'quick-start-tab';
    }

    state.showTree = !ExtL.hasCls(body, 'tree-hidden');

    if (publicCheckbox) {
        state.publicCheckbox = publicCheckbox.checked;
    }

    if (protectedCheckbox) {
        state.protectedCheckbox = protectedCheckbox.checked;
    }

    if (privateCheckbox) {
        state.privateCheckbox = privateCheckbox.checked;
    }

    if (inheritedCheckbox) {
        state.inheritedCheckbox = inheritedCheckbox.checked;
    }

    if (privateClassCheckbox) {
        state.privateClassCheckbox = privateClassCheckbox.checked;
    }

    if (modernSearchFilter && classicSearchFilter) {
        if (ExtL.hasCls(modernSearchFilter, 'active')) {
            state.toolkitFilter = ExtL.hasCls(classicSearchFilter, 'active') ? 'both' : 'modern';
        } else {
            state.toolkitFilter = 'classic';
        }
    }

    if (pageType == "guide" || pageType == "api") {
        state.history = state.history || [];

        if (state.history.length > 0) {
            ExtL.each(state.history, function (item, i) {
                if (item.product === product &&
                    item.pversion === pversion &&
                    item.text === text &&
                    item.path === path) {

                    historyRemoves.push(i);
                }
            });
        }

        if (historyRemoves.length > 0) {
            ExtL.each(historyRemoves, function (item) {
                state.history.splice(item, 1);
            });
        }

        state.history.push({
            product: product,
            pversion: pversion,
            text: text,
            path: path,
            title: title
        });

        // limit the history size to 150 items (across all products)
        if (state.history.length > 150) {
            state.history.length = 150;
        }
    }

    if (historyType) {
        state.historyType = historyType.checked ? 'current' : 'all';
    }

    if (historyLabelCheckbox) {
        state.historyLabels = historyLabelCheckbox.checked;
    }

    state.searchHistory = searchHistory;
    state.collapseExamples = collapsed;
    state.activeNavTab = activeNavTab;
    localStorage.setItem('htmlDocsState', ExtL.encodeValue(state));
};

/**
 * @method fetchState
 * Fetches the state of the page from localStorage and applies the saved values to
 * the page
 */
DocsApp.fetchState = function(skipSave, returnOnly) {
    var saved                = localStorage.getItem('htmlDocsState'),
        publicCheckbox       = ExtL.get('publicCheckbox'),
        protectedCheckbox    = ExtL.get('protectedCheckbox'),
        privateCheckbox      = ExtL.get('privateCheckbox'),
        inheritedCheckbox    = ExtL.get('inheritedCheckbox'),
        privateClassCheckbox = ExtL.get('private-class-toggle'),
        historyTypeCurrent   = ExtL.get('historyTypeCurrent'),
        historyTypeAll       = ExtL.get('historyTypeAll'),
        historyLabelCheckbox = ExtL.get('history-all-labels'),
        mButton              = ExtL.get('modern-search-filter'),
        cButton              = ExtL.get('classic-search-filter'),
        apiTab               = ExtL.get('api-tab'),
        guideTab             = ExtL.get('guides-tab'),
        body                 = document.querySelector('body'),
        hash                 = window.location.hash,
        qi                   = hash.indexOf('?'),
        pageType             = DocsApp.getPageType(),
        myToolkit            = DocsApp.meta.toolkit,
        queryString          = (qi > -1) ? hash.substr(qi + 1) : false,
        queryObj, examplesCollapseDir;

        state = ExtL.decodeValue(saved) || {
            showTree: null
        };

    if (returnOnly) {
        return state;
    }
    if (publicCheckbox) {
        publicCheckbox.checked = !(state.publicCheckbox === false);
    }
    if (protectedCheckbox) {
        protectedCheckbox.checked = !(state.protectedCheckbox === false);
    }
    if (privateCheckbox) {
        privateCheckbox.checked = !(state.privateCheckbox === false);
    }
    if (inheritedCheckbox) {
        inheritedCheckbox.checked = !(state.inheritedCheckbox === false);
    }
    if (privateClassCheckbox) {
        privateClassCheckbox.checked = !(state.privateClassCheckbox === false);
    }
    if (historyLabelCheckbox) {
        historyLabelCheckbox.checked = state.historyLabels;
        DocsApp.onToggleHistoryLabels();
    }
    if (historyTypeCurrent && historyTypeAll && state.historyType) {
        ExtL.get('historyType' + ExtL.capitalize(state.historyType)).checked = true;
        DocsApp.setHistoryType();
    }

    searchHistory = state.searchHistory;

    if (queryString) {
        queryObj = ExtL.fromQueryString(queryString);
        if (queryObj.collapseExamples && (queryObj.collapseExamples === 'true' || queryObj.collapseExamples === 'false')) {
            examplesCollapseDir = queryObj.collapseExamples === 'true';
        }
        DocsApp.toggleExamples(examplesCollapseDir);
    } else {
        DocsApp.toggleExamples(!!state.collapseExamples);
    }

    if (mButton && cButton && state.toolkitFilter) {
        DocsApp.filterSearchByToolkit(state.toolkitFilter);
    }

    DocsApp.setTreeVisibility(state.showTree);
    if (!skipSave) {
        DocsApp.saveState();
    }
};

/**
 * @method initNavTreeTabs
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
        tab, tabId, tabCls, isActive, cfg;

    // loop over the tab names and create each tab for the nav tree header
    for (; i < len; i++) {
        tab      = tabs[i];
        tabId    = tabCls = tab.replace(/\s+/g, '-').toLowerCase() + '-tab';
        // the active tab is the one that matches tha tree name of the current page
        isActive = tab === navTreeName;
        
        // the default config for all tabs
        cfg = {
            tag : isActive ? 'div' : 'a',
            "class" : 'nav-tab dib black-70 br1 br--top f6',
            html: tab,
            id: tabId
        };

        // if this is the active tab decorate it as active
        if (isActive) {
            cfg["class"] += ' active-tab bg-near-white ba b--black-10 ' + tabCls;
        // else it's decorated as an inactive tab and given a link to that tab's landing 
        // page
        } else {
            cfg.href = DocsApp.getNodeHref(
                navTrees[tab][0]
            );
            cfg["class"] += ' link bg-white bl bt br b--transparent hover-bg-black-10 ' + tabCls;
        }

        // append the tab to the tree header element
        treeHeader.appendChild(ExtL.createElement(cfg));
    }
};

/**
 * @method initHistory
 */
DocsApp.initHistory = function() {
    DocsApp.saveState();

    var history  = DocsApp.getHistory(),
        nav  = ExtL.get('history-nav'),
        list = ExtL.get('history-full-list'),
        prodObj = DocsApp.meta.prodObj,
        currentVersion = prodObj.currentVersion;

    nav.appendChild(ExtL.createElement({
        tag: 'span',
        html: 'History:',
        "class": 'history-title'
    }));

    if (history && history.length) {
        history.reverse();

        ExtL.each(history, function (item) {
            // TODO Check current and other
            var badge = ExtL.isIE8() ? '' : ' ' + item.product + '-badge badge',
                isGuide = (item.path.indexOf('/guides/') > -1);

            nav.appendChild(ExtL.createElement({
                tag: 'a',
                "class": 'tooltip tooltip-tl-bl history-btn',
                href: item.path,
                'data-tip': item.title + ' ' + (isGuide ? currentVersion : item.pversion),
                cn: [{
                    tag: 'span',
                    html: item.title + ' '   + (isGuide ? currentVersion : item.pversion) + ' | ',
                    "class": 'history-meta'
                }, {
                    tag: 'span',
                    html: item.title
                }, {
                    "class": 'callout callout-bl'
                }]
            }));

            list.appendChild(ExtL.createElement({
                tag: 'a',
                "class": 'tooltip tooltip-tr-br history-item',
                href: item.path,
                cn: [{
                    tag: 'div',
                    html: item.title
                }, {
                    tag: 'div',
                    html: item.title + ' ' + item.pversion,
                    "class": 'history-meta'
                }]
            }));
        });
    }
};

/**
 * @method getHistory
 */
DocsApp.getHistory = function() {
    if (!ExtL.canLocalStorage()) {
        return false;
    }

    var saved = ExtL.decodeValue(localStorage.getItem('htmlDocsState')) || {};

    return saved.history;
};

/**
 * @method filter
 * Filter the members using the filter input field value
 */
DocsApp.filter = ExtL.createBuffered(function (e, target) {
    console.log('filter');
}, 200);

/**
 * @method filterMember
 * @param e
 */
DocsApp.filterMember = function(e) {
    e = DocsApp.getEvent(e);
    DocsApp.filter(e, DocsApp.getEventTarget(e));
};

/**
 * @method filterSearchByToolkit
 * @param e
 */
DocsApp.filterSearchByToolkit = function(e) {
    console.log('filter search by toolkit');
};

/**
 * @method addEventsAndSetMenuClose
 * @param item
 * @param event
 * @param menuClose
 * @param fn
 */
DocsApp.addEventsAndSetMenuClose = function(item, event, menuClose, fn) {
    var menuCanClose = DocsApp.appMeta.menuCanClose;

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
 * @method hideMemberTypeMenu
 */
DocsApp.hideMemberTypeMenu = function() {
    var menu         = DocsApp.getMemberTypeMenu(),
        menuCanClose = DocsApp.appMeta.menuCanClose;

    if (menuCanClose) { // menuCanClose is a closure variable
        ExtL.removeCls(menu, 'show-menu');
    }
};

/**
 * @method getMemberTypeMenu
 * @returns {Element}
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

DocsApp.hideMultiSrcPanel = function() {
    var picker = ExtL.get('multi-src-picker');

    if (picker) {
        ExtL.removeCls(picker, 'show-multi')
    }
};

/**
 * @method highlightTypeMenuItem
 * Highlight the member nav button in the top nav toolbar when that section is
 * scrolled up against the top nav toolbar
 */
DocsApp.highlightTypeMenuItem = function() {
    console.log('highlight type menu item');
};

/**
 * @method onMemberCollapseToggleClick
 * Handles the expanding / collapsing of members on click
 * @param {HTMLElement} collapseEl The collapse / expand toggle element
 */
DocsApp.onMemberCollapseToggleClick = function(collapseEl) {
    var member = ExtL.up(collapseEl, '.classmembers');

    ExtL.toggleCls(member, 'member-expanded');
};

/**
 * @event onMemberTypeMenuClick
 * @param e
 */
DocsApp.onMemberTypeMenuClick = function(e) {
    var target,
        menuCanClose = DocsApp.appMeta.menuCanClose;

    e = DocsApp.getEvent(e);
    target = DocsApp.getEventTarget(e);

    if (ExtL.is(target, 'a')) {
        // menuCanClose is a closure variable
        menuCanClose = true;
        DocsApp.hideMemberTypeMenu();
        DocsApp.onHashChange(true);
    }
};

/**
 * @method loadApiSearchPage
 * @param page
 */
DocsApp.loadApiSearchPage = function(page) {
    console.log('load api search page');
};

/**
 * @method loadGuideSearchPage
 * @param page
 */
DocsApp.loadGuideSearchPage = function(page) {
    console.log('load guide search page');
};

/**
 * @method hideProductMenu
 * Hides the product menu
 */
DocsApp.hideProductMenu = function() {
    var productTreeCt = ExtL.get('product-tree-ct');

    ExtL.addCls(productTreeCt, 'hide');
};

/**
 * @method hideSearchResults
 */
DocsApp.hideSearchResults = function() {
    if (ExtL.hasCls(DocsApp.getSearchResultsCt(), 'show-search-results')) {
        DocsApp.hideMobileSearch();
    }
    ExtL.removeCls(DocsApp.getSearchResultsCt(), 'show-search-results');
};

/**
 * @method showSearchResults
 */
DocsApp.showSearchResults = function(page) {
    var hasApi   = DocsApp.meta.hasApi,
        hasGuide = DocsApp.meta.hasGuides,
        ct           = DocsApp.getSearchResultsCt(),
        size         = DocsApp.getViewportSize(),
        compressed   = size.width <= 950,
        posRef, boundingBox, top, right;

    posRef = compressed ? document.querySelector('.context-menu-ct') : ExtL.get('searchtext');
    boundingBox = posRef.getBoundingClientRect();
    top = compressed ? (boundingBox.top + 32) : (boundingBox.top + posRef.clientHeight);
    right = compressed ? 0 : (document.body.clientWidth - boundingBox.right);

    ct.style.right = right.toString() + 'px';
    ct.style.top   = top.toString() + 'px';

    DocsApp.sizeSearchResultsCt();

    ExtL.addCls(ct, 'show-search-results');

    if (page && hasApi) {
        DocsApp.loadApiSearchPage(page);
    }

    if (page && hasGuide) {
        DocsApp.loadGuideSearchPage(page);
    }
};

/**
 * @method hideMobileSearch
 */
DocsApp.hideMobileSearch = function() {
    var input = ExtL.get('peekaboo-input');

    if (input) {
        input.style.visibility = 'hidden';
    }
};

/**
 * @method hideSearchHistory
 */
DocsApp.hideSearchHistory = function() {
    console.log('hide search history');
};

/**
 * @method searchFilter
 */
DocsApp.searchFilter = function() {
    console.log('search filter');
};

/**
 * @method hideHistoryConfigPanel
 */
DocsApp.hideHistoryConfigPanel = function() {
    ExtL.removeCls(document.body, 'show-history-panel');
};

/**
 * @event onSearchHistoryClick
 * @param e
 */
DocsApp.onSearchHistoryClick = function(e) {
    e = DocsApp.getEvent(e);
    var target = DocsApp.getEventTarget(e),
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
 * @method toggleHelp
 * Show / hide the help page
 */
DocsApp.toggleHelp = function() {
    console.log('HELP!');
    ExtL.toggleCls(document.body, 'show-help');
};

/**
 * @event onHashChange
 * @param force
 */
DocsApp.onHashChange = function(force) {
    console.log('on hash change');
};

/**
 * @method resetTempShownMembers
 * Reset any temporarily shown class members
 */
DocsApp.resetTempShownMembers = function() {
    var temps = document.querySelectorAll('.temp-show');

    temps = ExtL.fromNodeList(temps);

    if (temps.length) {
        ExtL.each(temps, function (item) {
            ExtL.removeCls(item, 'temp-show');
        });
    }
};

/**
 * @event onBodyClick
 * @param e
 */
DocsApp.onBodyClick = function(e) {
    e = DocsApp.getEvent(e);
    var target               = DocsApp.getEventTarget(e),
        searchText           = ExtL.get('searchtext'),
        isSearchInput        = target.id === 'searchtext',
        isSearchNav          = ExtL.up(target, '.search-results-nav-header'),
        isPagingNav          = ExtL.up(target, '.search-results-nav'),
        isProductMenu        = ExtL.up(target, '#product-tree-ct'),
        isHistoryConfigPanel = ExtL.up(target, '#historyConfigPanel'),
        isMultiSrcBtn        = ExtL.hasCls(target, 'multi-src-btn'),
        productMenu          = ExtL.get('product-tree-ct'),
        rightMembers         = ExtL.get('rightMembers'),
        treeVis              = ExtL.hasCls(document.body, 'tree-hidden'),
        width                = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;

    if (target.id !== 'classic-search-filter' && target.id !== 'modern-search-filter' && target.id != 'searchtext' && !isSearchNav && !isPagingNav) {
        DocsApp.hideSearchResults();
    } else {
        if (DocsApp.getSearchResultsCt().childNodes.length && searchText.value.length > 0) {
            DocsApp.showSearchResults();
        }
    }

    if (ExtL.hasCls(target, 'member-name') || ExtL.hasCls(target, 'collapse-toggle') || (ExtL.hasCls(e.srcElement, 'collapse-toggle'))) {
        DocsApp.onMemberCollapseToggleClick(target);
    }

    if (ExtL.hasCls(rightMembers, 'show-context-menu')) {
        if (!ExtL.hasCls(target, 'fa-cog') && !ExtL.hasCls(target, 'context-menu-ct') && !ExtL.up(target, '.context-menu-ct')) {
            ExtL.toggleCls(rightMembers, 'show-context-menu');
        }
    }

    if (!treeVis && width < 950 && !isProductMenu) {
        if (!ExtL.hasCls(target, 'fa-bars') && !ExtL.hasCls(target, 'class-tree') && !ExtL.up(target, '.class-tree')) {
            DocsApp.setTreeVisibility(false);
        }
    }

    if (!isProductMenu && !ExtL.hasCls(productMenu, 'hide')) {
        DocsApp.hideProductMenu();
    }

    if (!isHistoryConfigPanel && ExtL.hasCls(document.body, 'show-history-panel')) {
        DocsApp.hideHistoryConfigPanel();
    }

    if (!isSearchInput && ExtL.hasCls(document.body, 'show-search-history')) {
        DocsApp.hideSearchHistory();
    }

    if (!isMultiSrcBtn) {
        DocsApp.hideMultiSrcPanel();
    }
};

/**
 * @method resizeHandler
 */
DocsApp.resizeHandler = ExtL.createBuffered(function() {
    var size = DocsApp.getViewportSize(),
        showTree = DocsApp.getState('showTree'),
        width = size.width;

    ExtL.toggleCls(document.body, 'vp-med-size', (width < 1280 && width > 950));

    if (width > 950 && showTree !== false) {
        DocsApp.setTreeVisibility(true);
    } else if (width <= 950 && showTree !== true) {
        DocsApp.setTreeVisibility(false);
    }

    if (DocsApp.isLanding) {
        var ct = ExtL.get('rightMembers');
        ExtL[(width < 1280) ? 'addCls' : 'removeCls'](ct, 'transitional');
    }

    DocsApp.sizeSearchResultsCt();
    DocsApp.hideProductMenu();
}, 0);

/**
 * @method doLogSearchValue
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
 * @method logSearchValue
 */
DocsApp.logSearchValue = ExtL.createBuffered(DocsApp.doLogSearchValue, 750);

/**
 * @method handleScroll
 * Do all of the scroll related actions
 */
DocsApp.handleScroll = function() {
    DocsApp.monitorScrollToTop();
    if (DocsApp.meta.pageType == 'api') {
        DocsApp.highlightTypeMenuItem();
    }
};

/**
 * @method monitorScrollToTop
 * Listen to the scroll event and show / hide the "scroll to top" element
 * depending on the current scroll position
 */
DocsApp.monitorScrollToTop = function() {
    var vertical_position = DocsApp.getScrollPosition();

    ExtL.toggleCls(ExtL.get('back-to-top'), 'sticky', vertical_position > 345);
    ExtL.toggleCls(document.body, 'sticky', vertical_position > 345);
};

/**
 * Returns an object with:
 *  - width: the viewport width
 *  - height: the viewport height
 */
DocsApp.getViewportSize = function() {
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
};

/**
 * @method sizeSearchResultsCt
 */
DocsApp.sizeSearchResultsCt = function() {
    var searchCt = DocsApp.getSearchResultsCt(),
        size = DocsApp.getViewportSize(),
        vpHeight = size.height,
        h = (vpHeight < 509) ? (vpHeight - 58) : 451;

    searchCt.style.height = h.toString() + 'px';
};

/**
 * @method getSearchResultsCt
 */
DocsApp.getSearchResultsCt = function() {
    var ct       = ExtL.get('search-results-ct'),
        hasApi   = DocsApp.meta.hasApi,
        hasGuide = DocsApp.meta.hasGuides,
        cn;

    if (!ct) {
        if (hasApi || hasGuide) {
            cn = [];
        }
        if (hasGuide) {
            cn.push({
                id: 'guide-search-results',
                "class": 'isHidden'
            });
        }
        if (hasApi) {
            cn.push({
                id: 'api-search-results'
            });
        }
        ct = ExtL.createElement({
            tag: 'span',
            id: 'search-results-ct',
            cn: cn
        });
        document.body.appendChild(ct);
    }

    return ct;
};

/**
 * @method getScrollPosition
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
 * @method setScrollPos
 * Scroll to the top of the document (no animation)
 * @param e
 * @param pos
 */
DocsApp.setScrollPos = function(e,pos) {
    var pageType = DocsApp.meta.pageType,
        el = (pageType == 'api') ? '.class-body-wrap' :
            ((pageType == 'guide') ? '.guide-body-wrap' : '.generic-content');

    pos = pos || 0;

    e = DocsApp.getEvent(e);
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
 * @method getPageType
 */
DocsApp.getPageType = function() {
    return DocsApp.meta.pageType;
};

/**
 * @method isMacWebkit
 * Returns whether current user agent is mac webkit
 * @returns {boolean}
 */
DocsApp.isMacWebkit = function() {
    return (navigator.userAgent.indexOf("Macintosh") !== -1 &&
    navigator.userAgent.indexOf("WebKit") !== -1)

};

/**
 * @method isFirefox
 * Returns whether current user agent is firefox
 * @returns {boolean}
 */
DocsApp.isFirefox = function() {
    return (navigator.userAgent.indexOf("firefox") !== -1);
};

/**
 * @method addMultipleEventListeners
 * Add multiple event listeners to an element
 * @param {Element} el
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
 * @method getEvent
 * @param e
 * @returns {*|Event}
 */
DocsApp.getEvent = function (e) {
    return e || window.event;
};

/**
 * @method getEventTarget
 * @param e
 * @returns {EventTarget|Object}
 */
DocsApp.getEventTarget = function (e) {
    e = DocsApp.getEvent(e);
    return e.target || e.srcElement;
};

/**
 * @method stopEvent
 */
DocsApp.stopEvent = function (e) {
    e = DocsApp.getEvent(e);
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
    var memberTypeMenu          = DocsApp.getMemberTypeMenu(),
        memberFilterField       = ExtL.get('member-filter-field'),
        backToTop               = ExtL.get('back-to-top'),
        helpBtn                 = ExtL.get('help-btn'),
        helpClose               = ExtL.get('help-close'),
        toggleExamples          = ExtL.get('toggleExamples'),
        hideClassTree           = ExtL.get('hide-class-tree'),
        memberTypesMenu         = ExtL.get('member-types-menu'),
        publicCheckBox          = ExtL.get('publicCheckbox'),
        privateCheckBox         = ExtL.get('privateCheckbox'),
        protectedCheckBox       = ExtL.get('protectedCheckbox'),
        inheritedCheckBox       = ExtL.get('inheritedCheckbox'),
        privateClassToggle      = ExtL.get('private-class-toggle'),
        toggleAll               = ExtL.get('toggleAll'),
        modernSearchFilter      = ExtL.get('modern-search-filter'),
        classicSearchFilter     = ExtL.get('classic-search-filter'),
        searchHistoryPanel      = ExtL.get('search-history-panel'),
        toggleTree              = ExtL.getByCls('toggle-tree');

    ExtL.get('help-btn').onclick   = DocsApp.toggleHelp;
    ExtL.get('help-close').onclick = DocsApp.toggleHelp;

    // handle the following of a link in the member type menu
    memberTypeMenu.onclick      = DocsApp.onMemberTypeMenuClick;

    // prevent scrolling of the body when scrolling the member menu
    memberTypeMenu.onmousewheel = DocsApp.wheelHandler;
    memberTypeMenu.onwheel      = DocsApp.wheelHandler;

    if (DocsApp.isFirefox) { // Firefox only
        memberTypeMenu.scrollTop = 0;
        memberTypeMenu.addEventListener("DOMMouseScroll", DocsApp.wheelHandler, false);
    }

    if (memberFilterField) {
        DocsApp.addMultipleEventListeners(memberFilterField, 'oninput onkeyup onchange', DocsApp.filterMember());
    }

    if (backToTop) {
        backToTop.onclick           = DocsApp.setScrollPos;
    }

    if (helpBtn) {
        helpBtn.onclick             = DocsApp.toggleHelp;
    }

    if (helpClose) {
        helpClose.onclick           = DocsApp.toggleHelp;
    }

    if (toggleExamples) {
        toggleExamples.onclick      = DocsApp.onToggleExamplesClick;
    }

    if (hideClassTree) {
        hideClassTree.onclick       = DocsApp.toggleTreeVisibility;
    }

    if (memberTypesMenu) {
        memberTypesMenu.onclick     = DocsApp.onClickMemberMenuType;
    }

    if (publicCheckBox) {
        publicCheckBox.onclick      = DocsApp.onAccessCheckboxClick;
    }

    if (protectedCheckBox) {
        protectedCheckBox.onclick   = DocsApp.onAccessCheckboxClick;
    }

    if (privateCheckBox) {
        privateCheckBox.onclick     = DocsApp.onAccessCheckboxClick;
    }

    if (inheritedCheckBox) {
        inheritedCheckBox.onclick   = DocsApp.onAccessCheckboxClick;
    }

    if (privateClassToggle) {
        privateClassToggle.onclick  = DocsApp.onFilterClassCheckboxToggle;
    }

    if (toggleAll) {
        toggleAll.onclick           = DocsApp.onToggleAllClick;
    }

    if (toggleTree) {
        toggleTree.onclick          = DocsApp.toggleTreeNodes;
    }

    // Set up search results toolkit filter button handlers
    if (modernSearchFilter) {
        ExtL.on(modernSearchFilter, 'click', DocsApp.filterSearchByToolkit);
    }

    if (classicSearchFilter) {
        ExtL.on(classicSearchFilter, 'click', DocsApp.filterSearchByToolkit);
    }

    if (searchHistoryPanel) {
        // Set up search history panel (and ultimately item) click handler
        ExtL.on(searchHistoryPanel, 'click', DocsApp.onSearchHistoryClick);
    }

    // globally handle body click events
    document.body.onclick = DocsApp.onBodyClick;

    // monitor changes in the url hash
    window.onhashchange   = DocsApp.onHashChange;

    // monitor viewport resizing
    ExtL.on(window, 'resize', DocsApp.resizeHandler);
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
    DocsApp.resizeHandler();
    DocsApp.handleScroll();
    DocsApp.fetchState(true);
    DocsApp.initHistory();

    DocsApp.appMeta.allowSave = true;

    var pageType  = DocsApp.getPageType(),
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
            rel  = DocsApp.meta.rootPath;

        link.href = null;
        link.href = '../' + rel + name;
    }
});
