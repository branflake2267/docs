/**
 * Fetches the navigation header elements
 * @return {Array} The array of navigation headers
 */
DocsApp.getNavHeaders = function () {
    return ExtL.fromNodeList(document.getElementsByClassName('sub-nav-header'));
};

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

    //DA.initNavTreeFilter();
    DA.initNavTreeCollapseHeader();
};

/**
 *
 */
DocsApp.initNavTreeCollapseHeader = function () {
    var header = ExtL.get('tree-header');

    header.appendChild(ExtL.createElement({
        tag  : 'span',
        html : 'Menu'
    }));
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
 * Helper method to {@link #initNavTree} that creates the structure for each navigation
 * section of the nav panel
 * @param {String} id The string to apply to the id's of each element in the returned
 * element config
 * @param {String} headerText The text to display on the header of the navigation section
 * @return {Object} The markup for the navigation section
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
 * Toggles the navigation sections (on-click)
 * @param {Object} e The click event
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
 * Initialize the header-click listeners to expand / collapse the nav sections
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

DocsApp.animateRipple = function (e, clickTarget, timing) {
    e = DocsApp.getEvent(e);
    timing = timing || 0.3;

    var animationTarget = clickTarget.querySelector('use'),
        tl              = new TimelineMax(),
        x               = e.offsetX,
        y               = e.offsetY,
        w               = e.target.offsetWidth,
        h               = e.target.offsetHeight,
        offsetX         = Math.abs((w / 2) - x),
        offsetY         = Math.abs((h / 2) - y),
        deltaX          = (w / 2) + offsetX,
        deltaY          = (h / 2) + offsetY,
        scale_ratio     = Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2));

    console.log('x is:' + x);
    console.log('y is:' + y);
    console.log('offsetX is:' + offsetX);
    console.log('offsetY is:' + offsetY);
    console.log('deltaX is:' + deltaX);
    console.log('deltaY is:' + deltaY);
    console.log('width is:' + w);
    console.log('height is:' + h);
    console.log('scale ratio is:' + scale_ratio);
    console.log(animationTarget);

    tl.fromTo(animationTarget, timing, {
        x               : x,
        y               : y,
        transformOrigin : '50% 50%',
        scale           : 0,
        opacity         : 1,
        ease            :  Linear.easeIn
    }, {
        scale   : scale_ratio,
        opacity : 0
    });

    return tl;
};

DocsApp.initRippleClickListener = function (el) {
    el = ExtL.get(el);

    ExtL.on(el, 'click',  function (e) {
        DocsApp.animateRipple(e, el);
    });
};

DocsApp.initRipple = function () {
    var memberTypesCt = ExtL.get('member-types-menu'),
        btns          = ExtL.fromNodeList(memberTypesCt.querySelectorAll('.toolbarButton')),
        btnsLen       = btns.length,
        btn;

    while (btnsLen--) {
        btn = btns[btnsLen];
        /*btn.appendChild(ExtL.createElement({
            tag     : 'svg',
            "class" : 'ripple-obj',
            cn      : [{
                tag           : 'use',
                height        : '100',
                width         : '100',
                "xmlns:xlink" : 'http://www.w3.org/1999/xlink',
                "xlink:href"  : '#ripply-scott',
                "class"       : 'js-ripple'
            }]
        }));*/
        var svgns = "http://www.w3.org/2000/svg";
        var xlinkns = "http://www.w3.org/1999/xlink";
        var svg = document.createElementNS(svgns, 'svg');
        svg.setAttribute('class', 'ripple-obj');
        btn.appendChild(svg);
        var useEl = document.createElementNS(svgns, 'use');
        useEl.setAttribute('height', '100');
        useEl.setAttribute('width', '100');
        useEl.setAttribute('class', 'js-ripple');
        useEl.setAttributeNS(xlinkns, 'href', '#ripply-scott');
        svg.appendChild(useEl);
        DocsApp.initRippleClickListener(btn);
    }
};

/**
 *
 */
ExtL.bindReady(function () {
    DocsApp.initNavTreeEventListeners();
    DocsApp.initRipple();
});