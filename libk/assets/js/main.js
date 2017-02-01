window.DocsApp = window.DocsApp || {};

/**
 * Tree class to create the nav tree for guides and docs
 * @param {Object[]} data The array of tree nodes to process
 * @param {String} renderTo The ID of the element to render the tree to
 */
function Tree (data, renderTo) {
    var me = this;

    // the class to apply to a node when it and its children are collapsed
    me.collapseCls = 'tree-node-collapsed';

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
// TODO update the template to show a star if the node has "new" or whatever it is
// TODO update the template to show an icon (this should be set on the node either explicitly in a config file or as output by a source parser)
Tree.prototype.createNodeCfgs = function (data, parentId, depth) {
    data = ExtL.from(data);

    var i    = 0,
        len  = data.length,
        cfgs =  [];

    this._parentNodes = [];

    depth = depth || 0;

    for (; i < len; i++) {
        var node = data[i],
            cfg = {
                tag            : 'a',
                id             : node.id,
                parentTreeNode : parentId || null,
                "class"        : 'truncate hover-bg-black-10 db f6 black-80 tree-depth-' + depth
            };

        if (node.children) {
            this._parentNodes.push(node.id);
            cfg["class"] += ' tree-parent-node pointer ' + this.collapseCls;
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
                html : node.text,
            }];
            cfgs.push(cfg);

            cfgs.push({
                tag     : 'div',
                "class" : 'child-nodes-ct',
                cn      : this.createNodeCfgs(node.children, node.id, depth + 1)
            });
        } else {
            cfg.leaf = true;
            //cfg.html = node.text;
            cfg.href = node.link || (DocsApp.meta.rootPath + '/' + node.href);
            cfg["class"] += ' link underline-hover'
            cfg.cn = [{
                tag     : 'i',
                "class" : node.iconCls || ''
            }, {
                tag  : 'span',
                html : node.text,
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
 * @param {String/HTMLElement} el The HTML element or ID of the tree node to expand
 * @return {Object} The tree instance
 */
Tree.prototype.expand = function (node) {
    return this.toggleCollapse(node, false);
};

/**
 * Collapses the passed parent tree node
 * @param {String/HTMLElement} el The HTML element or ID of the tree node to collapse
 * @return {Object} The tree instance
 */
Tree.prototype.collapse = function (node) {
    return this.toggleCollapse(node, true);
};

/**
 * Expand all ancestor nodes up to the passed node
 * @param {String/HTMLElement} el The HTML element or ID of the tree node to expand to
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
 * @param {String/HTMLElement} el The HTML element or ID of the tree node to select
 * @return {Object} The tree instance
 */
Tree.prototype.select = function (node) {
    var el = ExtL.get(node);

    ExtL.addCls(el, 'bg-black-10 b');
    return this;
};


///////////////////////////

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
        navTree     = navTrees[navTreeName],
        tree;

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
        // else it's decorated as an inactive tab
        } else {
            console.log(navTrees[navTreeName]);
            cfg.href = 'sss';
            cfg["class"] += ' link bg-white bl bt br b--transparent hover-bg-black-10';
        }

        // append the tab to the tree header element
        treeHeader.appendChild(ExtL.createElement(cfg));
    }
};

/**
 * Kicks off the logic of the page once the DOM is ready
 */
ExtL.bindReady(function () {
    DocsApp.initNavTree();
});