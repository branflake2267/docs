/**
 * Fetches the navigation header elements
 * @param {HTMLElement} accordionCt The container to get nav headers from (or document
 * if nothing is passed)
 * @return {Array} The array of navigation headers
 */
DocsApp.getNavHeaders = function (accordionCt) {
    var ct = accordionCt || document;

    return ExtL.fromNodeList(ct.getElementsByClassName('sub-nav-header'));
};

/**
 * @method initNavTree
 * Once the dom is ready the navigation tree for the current page (and the navigation
 * panel's tabs) are created.  The apiTree object and the guidesTree object are both used
 * (as applicable as some products are guides-only) to create the navigation tree and its
 * tabs.
 */
DocsApp.initNavTree = function () {
    var DA = DocsApp;
    var apiTree = DA.apiTree || {};

    var componentsTree;
    if (apiTree.API && apiTree.API.Components) {
        componentsTree = apiTree.API.Components;
    }

    var classesTree;
    if (apiTree.API && apiTree.API.API) {
        classesTree = apiTree.API.API;
    }

    var guidesTree;
    if (DA.guidesTree && DA.guidesTree.Guides) {
        guidesTree = DA.guidesTree.Guides;
    }
    
    var treeCt = ExtL.get('tree');
    var componentsId = 'react-components-nav-';
    var guidesId = 'react-guides-nav-';
    var classesId = 'react-api-nav-';
    var id = DA.meta.myId;

    // Build a list of trees to search for selection
    var navTrees = [];
    var target, targetId, targetNode, tree;

    ExtL.addCls(treeCt, 'navigation-parent-ct');
    if (apiTree.API && apiTree.API.Components) {
        treeCt.appendChild(this.createSubNavCt(componentsId, 'Components'));
    }

    // Add Guides to accordion panel on the left
    if (DA.guidesTree && DA.guidesTree.Guides) {
        treeCt.appendChild(this.createSubNavCt(guidesId, 'Guides'));
    }

    // Add API-docs to accordion on the left
    if (apiTree.API && apiTree.API.API) {
        treeCt.appendChild(this.createSubNavCt(classesId, 'API'));
    }

    // Build navTree of Components
    if (apiTree.API && apiTree.API.Components) {
        DA.componentsNavTree = DA.buildNavTree(componentsTree, componentsId + 'target');
        navTrees.push(DA.componentsNavTree);
    }

    // Build navTree of Guides
    if (DA.guidesTree && DA.guidesTree.Guides) {
        DA.guidesNavTree = DA.buildNavTree(guidesTree, guidesId + 'target');
        navTrees.push(DA.guidesNavTree);
    }

    // Build navTree of API docs
    if (apiTree.API && apiTree.API.API) {
        DA.apiNavTree = DA.buildNavTree(classesTree, classesId + 'target');
        navTrees.push(DA.apiNavTree);
    }

    if (id) {
        id = id.replace(/\./g, '\\.');
    }

    // select the node for the current page
    for (var i = 0; i < navTrees.length; i++) {
        tree = navTrees[i];
        // add the expand-all button for each tree
        DocsApp.addTreeToggleButton(tree);

        if (id) {
            target = tree.target;
            targetId = target.id + '-';
            targetNode = target.querySelector('[id="' + id + '"]') || target.querySelector('[id="' + targetId + id + '"]');

            if (targetNode) {
                DocsApp.expandSubNav(tree.target.previousSibling);
                tree.select(targetNode.id);
                // and expand the tree to the selected node
                tree.expandTo(targetNode.id);
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
        tag: 'span',
        html: 'Menu'
    }));
};

/**
 * Create the nav tree filter and set up event listeners used to filter the navigation
 * trees
 */
DocsApp.initNavTreeFilter = function () {
    var header = ExtL.get('tree-header'),
        navSearch = header.appendChild(ExtL.createElement({
            tag: 'input',
            id: 'nav-search',
            type: 'search',
            placeholder: 'filter navigation...'
        }));

    ExtL.on(navSearch, 'keyup', DocsApp.filterNavTrees);
    ExtL.on(navSearch, 'input', DocsApp.filterNavTrees);
    ExtL.on(navSearch, 'change', DocsApp.filterNavTrees);
};

/**
 * A buffered change handler for the navigation tree search field that filters all
 * navigation trees on each change
 */
DocsApp.filterNavTrees = ExtL.createBuffered(function () {
    var navSearch = ExtL.get('nav-search'),
        value = navSearch.value;

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
        id: id + 'ct',
        "class": 'sub-nav-ct',
        cn: [{
            id: id + 'header',
            "class": 'sub-nav-header sub-nav-ct-collapsed',
            cn: [{
                tag: 'span',
                html: headerText
            }, {
                tag: 'i',
                "class": 'fa fa-chevron-down'
                /*}, {
                    tag     : 'i',
                    "class" : 'fa fa-chevron-up'*/
            }]
        }, {
            id: id + 'target',
            "class": 'sub-nav-tree'
        }]
    });
};

DocsApp.OriginalOnToggleAllClick = DocsApp.onToggleAllClick;
DocsApp.onToggleAllClick = function (e) {
    setTimeout(function (e) {
        DocsApp.OriginalOnToggleAllClick(e);
    }, 300);
};

DocsApp.OriginalOnHideClassTreeClick = DocsApp.onHideClassTreeClick;
DocsApp.onHideClassTreeClick = function (e) {
    setTimeout(function (e) {
        DocsApp.OriginalOnHideClassTreeClick(e);
    }, 300);
};

DocsApp.expandSubNav = function (header) {
    var expandedCls = 'sub-nav-header-expanded',
        content = header.nextElementSibling,
        icon = header.querySelector('i'),
        tl = TweenLite;

    ExtL.addCls(header, expandedCls);
    tl.set(content, {
        height: 'auto',
        padding: '10px 25px 10px 15px'
    });
    tl.from(content, 0.4, {
        height: 0,
        immediateRender: false,
        //ease            : Back.easeOut
        ease: Power1.easeOut
    }, 0);
    tl.set(icon, {
        rotation: 180
    });
    tl.from(icon, 0.4, {
        rotation: 0,
        //ease     : Back.easeOut
        ease: Power1.easeOut
    }, 0);
};

DocsApp.collapseSubNav = function (header) {
    var expandedCls = 'sub-nav-header-expanded',
        content = header.nextElementSibling,
        icon = header.querySelector('i'),
        tl = TweenLite;

    ExtL.removeCls(header, expandedCls);
    tl.to(content, 0.3, {
        height: 0,
        padding: '0 25px 0 15px',
        immediateRender: false,
        ease: Power1.easeOut
    }, 0);
    tl.to(icon, 0.3, {
        rotation: 0,
        ease: Power1.easeOut
    }, 0);
};

/**
 * Toggles the navigation sections (on-click)
 * @param {Object} e The click event
 */
DocsApp.toggleNavHeaders = function (e) {
    var target = DocsApp.getEventTarget(e),
        navHeaders = DocsApp.getNavHeaders(ExtL.up(target, '.navigation-parent-ct')),
        len = navHeaders.length,
        i = 0,
        headerCls = 'sub-nav-header',
        expandedCls = 'sub-nav-header-expanded',
        header, content;

    if (target) {
        if (!ExtL.hasCls(target, headerCls)) {
            target = ExtL.up(target, '.' + headerCls);
        }

        for (; i < len; i++) {
            header = navHeaders[i];
            if (header === target && !ExtL.hasCls(header, expandedCls)) {
                DocsApp.expandSubNav(header);
            } else {
                DocsApp.collapseSubNav(header);
            }
        }
    }
};

/**
 * // override
 */
DocsApp.showMultiSrcPanel = function (e) {
    // Normally a class with multiple sources would show a menu of source files when the
    // class name / view source is clicked.  However, if the class is an OpenTooling
    // component then we want to suppress showing the source menu as the source is just
    // comments.
    if (ExtL.hasCls(document.body, 'opentooling-component')) {
        return;
    }

    var target = DocsApp.getEventTarget(e),
        //picker    = ExtL.get('multi-src-picker'),
        picker = DocsApp.getMultiSrcPanel(),
        targetBox = target.getBoundingClientRect();

    if (picker) {
        ExtL.applyStyles(picker, {
            top: targetBox.bottom + 'px',
            left: targetBox.left + 'px'
        });
        ExtL.addCls(picker, 'show-multi');
    }
};

/**
 * Initialize the header-click listeners to expand / collapse the nav sections
 */
DocsApp.initNavTreeEventListeners = function () {
    var navHeaders = DocsApp.getNavHeaders(),
        len = navHeaders.length,
        i = 0,
        header;

    for (; i < len; i++) {
        header = navHeaders[i];
        ExtL.on(header, 'click', DocsApp.toggleNavHeaders);
    }
};

/**
 * Handles the expanding / collapsing of members on click
 * @param {HTMLElement} collapseEl The collapse / expand toggle element
 */
DocsApp.onMemberCollapseToggleClick = function (collapseEl) {
    var member = ExtL.up(collapseEl, '.classmembers'),
        icon = collapseEl.querySelector('.fa-caret-right'),
        expandedCls = 'member-expanded';

    ExtL.toggleCls(member, expandedCls);

    var tl = TweenLite;
    if (ExtL.hasCls(member, expandedCls)) {
        tl.set(member, {
            height: 'auto'
        });
        tl.from(member, 0.4, {
            height: 46,
            immediateRender: false,
            //ease            : Back.easeOut
            ease: Power1.easeOut
        });
        tl.set(icon, {
            rotation: 90
        });
        tl.from(icon, 0.4, {
            rotation: 0,
            ease: Power1.easeOut
        }, 0);
    } else {
        tl.to(member, 0.3, {
            height: 46,
            immediateRender: false,
            ease: Power1.easeOut
        });
        tl.to(icon, 0.3, {
            rotation: 0,
            ease: Power1.easeOut
        }, 0);
    }

};

/**
 *
 */
DocsApp.typesDisplay = {
    c: 'prop',
    p: 'prop',
    sp: 'property',
    m: 'method',
    sm: 'method',
    e: 'event',
    v: 'css var',
    x: 'css mixin',
    z: 'mixin param'
};

/**
 *
 */
DocsApp.getSearchClassName = function (rec) {
    var map = DocsApp.meta.componentClassNameMap,
        className = rec.classObj.n,
        aliases = rec.classObj.x,
        ref = map[className],
        preferredAlias;

    if (ref) {
        preferredAlias = ref.preferredAlias;

        if (preferredAlias) {
            className = preferredAlias;
        } else if (aliases) {
            className = aliases[0].substring(aliases[0].indexOf('.') + 1);
        }
    }

    return className;
};

/**
 * @private
 * Used by the runFiddleExample method.  Appends a form to the body for use by the
 * anonymous fiddle examples.
 * @param {String} target The ID of the target fiddle iframe
 * @param {Array} params Array of form input fields
 * @return {Element} The form used the submit the fiddle code to the fiddle server
 */
DocsApp.buildForm = function (target, params) {
    // Default fiddle URL points to production
    var fiddleURL = 'https://fiddle.sencha.com/run?dc=' + new Date().getTime();

    // Point docs-devel.sencha.com to the test fiddles. 
    if (window.location.hostname.indexOf('docs-devel') == 0) {
        // Used for the staged fiddle testing
        fiddleURL = 'https://test-fiddle.sencha.com/run?dc=' + new Date().getTime();
    } 
    // else if (window.location.origin.indexOf('file://') == 0 || window.location.origin.indexOf('docs-dev.s')) {
    //     // Used for local debugging - Like when debugging docs v2 builds
    //     fiddleURL = 'https://fiddle-dev.sencha.com/run?dc=' + new Date().getTime();
    // }

    // Change the framework for ExtReact only - Used for embedded fiddles
    var myMeta = DocsApp.meta;
    var actualProd = myMeta.product;
    var wrapperCode = "";
    var wrapperCodeFile = "";
    var htmlCode = "";
    var assets = params.codes.assets;
    
    var fiddleCode = "";
    if (assets[0].code) {
        fiddleCode = assets[0].code;
    }

    if (actualProd === 'extreact') {
        params.framework.framework = 'ExtReact';
        wrapperCodeFile = "app.js";
        wrapperCodeType = "javascript";

        // Find the component class
        // 1. Class object
        var componentClassName = "App";
        var foundClass = /class(.*?)extends/.exec(fiddleCode);
        if (foundClass && foundClass[1]) {
            componentClassName = foundClass[1].trim();
        }
        
        // OR 1. Function object
        foundClass = /export.*?default.*?function.*?(.*?)\(\)/.exec(fiddleCode);
        if (foundClass && foundClass[1]) {
            componentClassName = foundClass[1].trim();
        }

        // NOTE: uglify has a problem with template literals ``, so don't use them
        // TODO polyfills
        wrapperCode += "import ReactDOM from 'react-dom';\n";
        wrapperCode += "\n";
        wrapperCode += fiddleCode;
        wrapperCode += "\n";
        wrapperCode += "Ext.onReady(function () {\n";
        wrapperCode += "   ReactDOM.render(< " + componentClassName + "/>, document.getElementById('my-div-id'));\n";
        wrapperCode += "});\n";

        htmlCode = "<div id='my-div-id'></div>";

        params.codes.assets = [{
            name: wrapperCodeFile,
            type: wrapperCodeType,
            code: wrapperCode,
        }, {
            name: "index.html",
            code: htmlCode,
            type: "html"
        }];

    } else if (actualProd === 'extangular') {
        params.framework.framework = 'ExtAngular';
        wrapperCodeFile = "main.ts";
        wrapperCodeType = "typescript";

        // Find the selector used in the AppComponent
        var selector = "app-root-1";
        var foundSelector = /selector.*?:.*?['\"](.*?)['\"].*?,/.exec(fiddleCode);
        if (foundSelector && foundSelector[1]) {
            selector = foundSelector[1];
        }

        // template `` aren't working with ugflify
        wrapperCode += "import 'core-js/es7/reflect';\n";
        wrapperCode += "import { platformBrowserDynamic } from '@angular/platform-browser-dynamic'; \n";
        wrapperCode += "import { BrowserModule } from '@angular/platform-browser';\n";
        wrapperCode += "import { NgModule } from '@angular/core';\n";
        wrapperCode += "import { ExtAngularModule } from '@sencha/ext-angular'\n";
        wrapperCode += fiddleCode;
        wrapperCode += "\n@NgModule({\n";
        wrapperCode += "  declarations: [\n";
        wrapperCode += "    AppComponent\n";
        wrapperCode += "  ],\n";
        wrapperCode += "  imports: [\n";
        wrapperCode += "    BrowserModule, ExtAngularModule\n";
        wrapperCode += "  ],\n";
        wrapperCode += "  providers: [],\n";
        wrapperCode += "  bootstrap: [ \n";
        wrapperCode += "    AppComponent \n";
        wrapperCode += "  ]\n";
        wrapperCode += "})\n";
        wrapperCode += "export class AppModule { }\n";
        wrapperCode += "platformBrowserDynamic().bootstrapModule(AppModule);\n";

        htmlCode += "<!DOCTYPE html>\n";
        htmlCode += "<html>\n";
        htmlCode += "<head>\n";
        htmlCode += "<base href='/'>\n";
        htmlCode += "<meta charset='UTF-8'>\n";
        htmlCode += "<meta name='viewport' content='width=device-width, initial-scale=1.0'>\n";
        //htmlCode += "<meta http-equiv='X-UA-Compatible' content='ie=edge'>\n";
        htmlCode += "<title>Fiddle Example</title>\n";
        htmlCode += "</head>\n";
        htmlCode += "<body>\n";
        htmlCode += "<" + selector + ">Loading...</" + selector + ">\n";
        htmlCode += "</body>\n"
        htmlCode += "</html>\n"

        params.codes.assets = [{
            name: wrapperCodeFile,
            type: wrapperCodeType,
            code: wrapperCode,
        }, {
            name: "index.html",
            code: htmlCode,
            type: "html"
        }];
    } else if (actualProd === 'extwebcomponents' || actualProd === 'ext-web-components') {
        params.framework.framework = 'ExtWebComponents';

        if (params.packages) {
            params.packages.push('ext-web-components');
        } else {        
            params.packages = ['ext-web-components'];
        }

        if (params.framework.packages) {
            params.framework.packages.push('ext-web-components');
        } else {        
            params.framework.packages = ['ext-web-components'];
        }

        if (params.codes.packages) {
            params.codes.packages.push('ext-web-components');
        } else {        
            params.codes.packages = ['ext-web-components'];
        }

    } else if (actualProd === 'extjs-next') {
        // TODO extjs next
    }

    var form = ExtL.createElement({
        tag: 'form',
        role: 'presentation',
        action: fiddleURL,
        method: 'POST',
        target: target,
        style: 'display:none'
    });

    ExtL.each(params, function (key, val) {
        if (ExtL.isArray || ExtL.isObject) {
            val = JSON.stringify(val);
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
};

DocsApp.getElementBorderRadius = function (el) {
    var bRadBL = window.getComputedStyle(el).getPropertyValue("border-bottom-left-radius"),
        bRadBR = window.getComputedStyle(el).getPropertyValue("border-bottom-right-radius"),
        bRadTL = window.getComputedStyle(el).getPropertyValue("border-top-left-radius"),
        bRadTR = window.getComputedStyle(el).getPropertyValue("border-top-right-radius");

    return {
        borderTopLeftRadius: bRadTL,
        borderBottomLeftRadius: bRadBL,
        borderTopRightRadius: bRadTR,
        borderBottomRightRadius: bRadBR
    };
};

DocsApp.animateRipple = function (e, clickTarget, timing) {
    e = DocsApp.getEvent(e);
    timing = timing || 0.5;

    var animationParent = clickTarget.querySelector('svg'),
        animationTarget = clickTarget.querySelector('use'),
        tl = new TimelineMax(),
        clickTargetBox = clickTarget.getBoundingClientRect(),
        eventTargetBox = DocsApp.getEventTarget(e).getBoundingClientRect(),
        //x               = e.offsetX,
        x = eventTargetBox.left - clickTargetBox.left + e.offsetX,
        //y               = e.offsetY,
        y = eventTargetBox.top - clickTargetBox.top + e.offsetY,
        w = clickTarget.offsetWidth,
        h = clickTarget.offsetHeight,
        offsetX = Math.abs((w / 2) - x),
        offsetY = Math.abs((h / 2) - y),
        deltaX = (w / 2) + offsetX,
        deltaY = (h / 2) + offsetY,
        scale_ratio = Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2));

    /*console.log('x is:' + x);
    console.log('y is:' + y);
    console.log('offsetX is:' + offsetX);
    console.log('offsetY is:' + offsetY);
    console.log('deltaX is:' + deltaX);
    console.log('deltaY is:' + deltaY);
    console.log('width is:' + w);
    console.log('height is:' + h);
    console.log('scale ratio is:' + scale_ratio);*/

    tl.set(animationParent, this.getElementBorderRadius(clickTarget));
    tl.fromTo(animationTarget, timing, {
        x: x,
        y: y,
        transformOrigin: '50% 50%',
        scale: 0,
        opacity: 1,
        ease: Linear.easeIn
    }, {
            scale: scale_ratio,
            opacity: 0
        });

    return tl;
};

DocsApp.initRippleClickListener = function (el) {
    el = ExtL.get(el);

    ExtL.on(el, 'click', function (e) {
        var target = DocsApp.getEventTarget(e);

        while (target !== el) {
            target = target.parentNode;
        }
        DocsApp.animateRipple(e, target);
    });
};

DocsApp.addRippleEl = function (parentEl) {
    var svgns = "http://www.w3.org/2000/svg",
        xlinkns = "http://www.w3.org/1999/xlink",
        svg = document.createElementNS(svgns, 'svg'),
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
    DocsApp.initRipplesOn(
        ExtL.fromNodeList(document.querySelectorAll('.icon-btn'))
    );
    DocsApp.initRipplesOn(
        ExtL.fromNodeList(document.querySelectorAll('.product-menu-btn-wrap'))
    );
    DocsApp.initRipplesOn(
        ExtL.fromNodeList(document.querySelectorAll('.da-inline-fiddle-nav-code'))
    );
    DocsApp.initRipplesOn(
        ExtL.fromNodeList(document.querySelectorAll('.da-inline-fiddle-nav-fiddle'))
    );
    DocsApp.initRipplesOn(
        ExtL.fromNodeList(document.querySelectorAll('#toggleExamples'))
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
        tl = TweenLite;

    ExtL.removeCls(node, this.collapseCls);
    tl.set(content, {
        height: 'auto'
    });
    tl.from(content, 0.4, {
        height: 0,
        immediateRender: false,
        //ease            : Back.easeOut
        ease: Power1.easeOut
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
        tl = TweenLite;

    ExtL.addCls(node, this.collapseCls);
    tl.to(content, 0.3, {
        height: 0,
        immediateRender: false,
        ease: Power1.easeOut
    });
};
