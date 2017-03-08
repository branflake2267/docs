/**
 * @method initNavTree
 * Once the dom is ready the navigation tree for the current page (and the navigation 
 * panel's tabs) are created.  The apiTree object and the guidesTree object are both used 
 * (as applicable as some products are guides-only) to create the navigation tree and its 
 * tabs.
 */
DocsApp.initNavTree = function () {
    var DA             = DocsApp,
        apiTree        = DA.apiTree,
        componentsTree = apiTree.API.Components,
        classesTree    = apiTree.API.API,
        guidesTree     = DA.guidesTree.Guides,
        treeCt         = ExtL.get('tree'),
        componentsId   = 'react-components-nav-',
        guidesId       = 'react-guides-nav-',
        classesId      = 'react-api-nav-',
        id             = DA.meta.myId,
        navTrees;

    treeCt.appendChild(this.createSubNavCt(componentsId, 'Components'));
    treeCt.appendChild(this.createSubNavCt(guidesId,     'Guides'));
    treeCt.appendChild(this.createSubNavCt(classesId,    'API'));

    navTrees = [
        DA.componentsNavTree = DA.buildNavTree(componentsTree, componentsId + 'target'),
        DA.guidesNavTree     = DA.buildNavTree(guidesTree,     guidesId     + 'target'),
        DA.apiNavTree        = DA.buildNavTree(classesTree,    classesId    + 'target')
    ];

    // select the node for the current page
    if (id) {
        var len = navTrees.length,
        i = 0, 
        tree;

        for (; i < len; i++) {
            tree = navTrees[i];
            tree.select(id);
            // and expand the tree to the selected node
            tree.expandTo(id);
            
            if (tree.target.querySelector('#' + id.replace(/\./g, '\\.'))) {
                ExtL.removeCls(tree.target.previousSibling, 'sub-nav-ct-collapsed');
            }
        }
    }

    DA.initNavTreeFilter();
};

/**
 * Create the nav tree filter and set up event listeners used to filter the navigation 
 * trees
 */
DocsApp.initNavTreeFilter = function () {
    var header = ExtL.get('tree-header'),
        navSearch = header.appendChild(ExtL.createElement({
            tag         : 'input',
            id          : 'nav-search',
            type        : 'search',
            placeholder : 'filter navigation...'
        }));

    ExtL.on(navSearch, 'keyup',  DocsApp.filterNavTrees);
    ExtL.on(navSearch, 'input',  DocsApp.filterNavTrees);
    ExtL.on(navSearch, 'change', DocsApp.filterNavTrees);
};

/**
 * A buffered change handler for the navigation tree search field that filters all 
 * navigation trees on each change
 */
DocsApp.filterNavTrees = ExtL.createBuffered(function () {
    var navSearch = ExtL.get('nav-search'),
        value     = navSearch.value;

    DocsApp.componentsNavTree.filter(value);
    DocsApp.guidesNavTree.filter(value);
    DocsApp.apiNavTree.filter(value);
}, 50);

/**
 * @method buildNavTree
 * Builds the navigation tree using the passed tree object (determined in 
 * {@link #initNavTree}).  The navigation tree instance is cached on DocsApp.navTree.
 */
DocsApp.buildNavTree = function (navTree, ct) {
    return new Tree(navTree, ct || 'tree');
};

/**
 * 
 */
DocsApp.createSubNavCt = function (id, headerText) {
    return ExtL.createElement({
        id : id + 'ct',
        "class" : 'sub-nav-ct',
        cn : [{
            id      : id + 'header',
            "class" : 'sub-nav-header sub-nav-ct-collapsed',
            cn : [{
                tag  : 'span',
                html : headerText
            }, {
                tag     : 'i',
                "class" : 'fa fa-chevron-down'
            }, {
                tag     : 'i',
                "class" : 'fa fa-chevron-up'
            }]
        }, {
            id      : id + 'target',
            "class" : 'sub-nav-tree'
        }]
    });
};

/**
 * 
 */
DocsApp.getNavHeaders = function () {
    return ExtL.fromNodeList(document.getElementsByClassName('sub-nav-header'));
};

/**
 * 
 */
DocsApp.toggleNavHeaders = function (e) {
    var navHeaders   = DocsApp.getNavHeaders(),
        target       = DocsApp.getEventTarget(e),
        len          = navHeaders.length,
        i            = 0,
        headerCls    = 'sub-nav-header',
        collapsedCls = 'sub-nav-ct-collapsed',
        header, action;
    
    if (target) {
        if (!ExtL.hasCls(target, headerCls)) {
            target = ExtL.up(target, '.' + headerCls);
        }
        if (ExtL.hasCls(target, collapsedCls)) {
            for (; i < len; i++) {
                header = navHeaders[i];
                action = (header === target) ? 'removeCls' : 'addCls';
                ExtL[action](header, collapsedCls);
            }
        } else {
            ExtL.addCls(target, collapsedCls);
        }
    }
};

/**
 * 
 */
DocsApp.initNavTreeEventListeners = function () {
    var navHeaders = DocsApp.getNavHeaders(),
        len        = navHeaders.length,
        i          = 0,
        header;

    for (; i < len; i++) {
        header = navHeaders[i];
        ExtL.on(header, 'click', DocsApp.toggleNavHeaders);
    }
};

/**
 * 
 */
ExtL.bindReady(function () {
    DocsApp.initNavTreeEventListeners();
});