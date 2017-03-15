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

            if (tree.target.querySelector('#' + id.replace(/\./g, '\\.'))) {
                //ExtL.removeCls(tree.target.previousSibling, 'sub-nav-ct-collapsed');
                DocsApp.expandSubNav(tree.target.previousSibling);
                setTimeout(function () {
                    tree.select(id);
                    // and expand the tree to the selected node
                    tree.expandTo(id);
                }, 1200);
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
            /*}, {
                tag     : 'i',
                "class" : 'fa fa-chevron-down'*/
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

DocsApp.expandSubNav = function (header) {
    var expandedCls = 'sub-nav-header-expanded',
        content     = header.nextSibling,
        icon        = header.querySelector('i'),
        tl          = TweenLite;

    ExtL.addCls(header, expandedCls);
    tl.set(content, {
        height  : 'auto',
        padding : '10px 25px 10px 15px'
    });
    tl.from(content, 0.6, {
        height          : 0,
        immediateRender : false,
        ease            : Back.easeOut
    }, 0);
    tl.set(icon, {
        rotation : 180
    });
    tl.from(icon, 0.6, {
        rotation : 0,
        ease     : Back.easeOut
    }, 0);
};

DocsApp.collapseSubNav = function (header) {
    var expandedCls = 'sub-nav-header-expanded',
        content     = header.nextSibling,
        icon        = header.querySelector('i'),
        tl          = TweenLite;

    ExtL.removeCls(header, expandedCls);
    tl.to(content, 0.3, {
        height          : 0,
        padding         : '0 25px 0 15px',
        immediateRender : false,
        ease            : Power1.easeOut
    }, 0);
    tl.to(icon, 0.3, {
        rotation : 0,
        ease     : Power1.easeOut
    }, 0);
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
        expandedCls  = 'sub-nav-header-expanded',
        header, content;

    if (target) {
        if (!ExtL.hasCls(target, headerCls)) {
            target = ExtL.up(target, '.' + headerCls);
        }

        for (; i < len; i++) {
            header  = navHeaders[i];
            if (header === target && !ExtL.hasCls(header, expandedCls)) {
                DocsApp.expandSubNav(header);
            } else {
                DocsApp.collapseSubNav(header);
            }
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
        w               = clickTarget.offsetWidth,
        h               = clickTarget.offsetHeight,
        offsetX         = Math.abs((w / 2) - x),
        offsetY         = Math.abs((h / 2) - y),
        deltaX          = (w / 2) + offsetX,
        deltaY          = (h / 2) + offsetY,
        scale_ratio     = Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2));

    /*console.log('x is:' + x);
    console.log('y is:' + y);
    console.log('offsetX is:' + offsetX);
    console.log('offsetY is:' + offsetY);
    console.log('deltaX is:' + deltaX);
    console.log('deltaY is:' + deltaY);
    console.log('width is:' + w);
    console.log('height is:' + h);
    console.log('scale ratio is:' + scale_ratio);*/

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
        var target = DocsApp.getEventTarget(e);

        while (target !== el) {
            target = target.parentNode;
        }
        DocsApp.animateRipple(e, target);
    });
};

DocsApp.addRippleEl = function (parentEl) {
    var svgns   = "http://www.w3.org/2000/svg",
        xlinkns = "http://www.w3.org/1999/xlink",
        svg     = document.createElementNS(svgns, 'svg'),
        useEl;

    svg.setAttribute('class', 'ripple-obj');
    parentEl.appendChild(svg);

    useEl = document.createElementNS(svgns, 'use');
    useEl.setAttribute('height', '100');
    useEl.setAttribute('width', '100');
    useEl.setAttribute('class', 'js-ripple');
    useEl.setAttributeNS(xlinkns, 'href', '#ripply-scott');
    svg.appendChild(useEl);
};

DocsApp.initRipplesOn = function (elements) {
    elements = ExtL.from(elements);

    var elementsLen = elements.length,
        element;

    while (elementsLen--) {
        element = elements[elementsLen];
        DocsApp.addRippleEl(element);
        DocsApp.initRippleClickListener(element);
    }
};

DocsApp.initRipple = function () {
    var memberTypesCt = ExtL.get('member-types-menu');

    if (memberTypesCt) {
        DocsApp.initRipplesOn(
            ExtL.fromNodeList(memberTypesCt.querySelectorAll('.toolbarButton'))
        );
    }
    DocsApp.initRipplesOn(
        ExtL.fromNodeList(document.querySelectorAll('.sub-nav-header'))
    );
    DocsApp.initRipplesOn(
        ExtL.fromNodeList(document.querySelectorAll('.tree-parent-node'))
    );
    DocsApp.initRipplesOn(
        ExtL.fromNodeList(document.querySelectorAll('.collapse-toggle'))
    );
};

/**
 *
 */
ExtL.bindReady(function () {
    DocsApp.initNavTreeEventListeners();
    DocsApp.initRipple();
});

/**
 * @method toggleCollapse
 * Toggles the collapse state of the tree node
 * @param {String/Element} el The HTML element or ID of the tree node to toggle
 * @param {Boolean} collapse Pass `true` or `false` to force the toggle to collapse or
 * expand.  Passing `true` will force collapse while `false` will force expand.
 * @return {Object} The tree instance
 */
Tree.prototype.toggleCollapse = function (el, collapse) {
    el = ExtL.get(el);

    ExtL.toggleCls(el, this.collapseCls, collapse);

    if (collapse !== true && collapse !== false) {
        collapse = ExtL.hasCls(el, this.collapseCls);
    }

    this[collapse ? 'collapse' : 'expand'](el);
};

/**
 * @method expand
 * Expands the passed parent tree node
 * @param {String/Element} node The HTML element or ID of the tree node to expand
 * @return {Object} The tree instance
 */
Tree.prototype.expand = function (node) {
    var content = node.nextSibling,
        tl      = TweenLite;

    ExtL.removeCls(node, this.collapseCls);
    tl.set(content, {
        height  : 'auto'
    });
    tl.from(content, 0.6, {
        height          : 0,
        immediateRender : false,
        ease            : Back.easeOut
    });
};

/**
 * @method collapse
 * Collapses the passed parent tree node
 * @param {String/Element} node The HTML element or ID of the tree node to collapse
 * @return {Object} The tree instance
 */
Tree.prototype.collapse = function (node) {
    var content = node.nextSibling,
        tl      = TweenLite;

    ExtL.addCls(node, this.collapseCls);
    tl.to(content, 0.3, {
        height          : 0,
        immediateRender : false,
        ease            : Power1.easeOut
    });
};