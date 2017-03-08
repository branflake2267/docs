/* jshint node: true */
'use strict';

/**
 * Gather up metadata about this run for the passed product / version
 *  - decorate this instance with things like hasApi, hasGuides, toolkits, etc.
 * See what the product / version needs (i.e. toolkits or guides or no api or just what)
 * loop over each needed thing and call the necessary 'source' module
 *  - So, would make classic source and modern source and guides for ext 6
 *  - need a way to opt in and out of guides since they are not in the public SDK (? a way to point to your own guides folder)
 * Output all of the applicable HTML files
 *  - loop over the prepared api files
 *  - loop over the prepared guide files
 * Create the product / version landing page
 */

const HtmlApp    = require('../create-app-html'),
      Path       = require('path'),
      Handlebars = require('handlebars'),
      Fs         = require('fs-extra'),
      UglifyJS   = require("uglify-js"),
      CleanCSS   = require('clean-css'),
      Utils      = require('../shared/Utils'),
      _          = require('lodash');

class ExtReactHtmlApp extends HtmlApp {
    constructor (options) {
        super(options);

        this.options.prodVerMeta.toolkit = 'modern';
    }

    /**
     * Default entry point for this module
     */
    run () {
        super.run();

        // TODO create a product home page
        // TODO create a Landing page class (if a CLI param is passed - or can be called directly, of course)
    }

    /**
     * Returns an array of this module's file name along with the file names of all 
     * ancestor modules
     * @return {String[]} This module's file name preceded by its ancestors'.
     */
    get parentChain () {
        return super.parentChain.concat([Path.parse(__dirname).base]);
    }

    /**
     * Returns this module's name
     */
    get moduleName () {
        return Path.parse(__dirname).base;
    }

    /**
     * Fetches the component class list object from disk
     * @return {Object} The object of component class names : component tree location
     */
    get componentList () {
        let list = this._componentList;

        if (!list) {
            let path = Path.join(__dirname, 'configs', 'components.json'),
                file = Fs.readJsonSync(path);

            list = this._componentList = file.components;
        }

        return list;
    }

    /**
     * Gets the array of component class names
     * @return {String[]} The array of component names
     */
    get componentClassNames () {
        let names = this._componentClassNames;

        if (!names) {
            let list = this.componentList;
            names = this._componentClassNames = Object.keys(list);
        }

        return names;
    }

    /**
     * Gets the array of component class names
     * @return {String[]} The array of component names
     */
    get componentMenuNames () {
        let names = this._componentMenuNames;

        if (!names) {
            let list = this.componentList;
            names = this._componentMenuNames = _.values(list);
        }

        return names;
    }

    /**
     * Returns the Ext JS version associated with the Reactor version currently being
     * built
     * @return {String} The Ext JS version number for the current Reactor build
     */
    get apiVersion () {
        let ver = this._apiVer;

        if (!ver) {
            let options = this.options,
                rextVersion = options.version || options.currentVersion;

            ver = this._apiVer = options.products.extreact.extjsVer[rextVersion];
        }

        return ver;
    }

    /**
     * Returns the `extjs` product name used for processing the API output
     * @return {String} The `extjs` product name
     */
    get apiProduct () {
        let prod = this._apiProd;

        if (!prod) {
            prod = this._apiProd = 'extjs';
        }

        return prod;
    }

    /**
     * Returns the id to use on the navigation node for the passed class name
     * @param {String} className The classname being processed in the navigation tree
     * @param {Number} currentIndex The index for the current node's processing - 
     * essentially the depth this node is in the tree when the ID is requested
     * @return {String} The id for the current node being processed
     */
    getNodeId (className, currentIndex) {
        let names  = this.componentMenuNames,
            inList = names.includes(className);

        if (inList) {
            if (className.split('.').length === (currentIndex + 1)) {
                return this.getClassByMenuName(className);
            } else {
                return super.getNodeId(className, currentIndex);
            }
        }
        
        return super.getNodeId(className, currentIndex);
    }

    /**
     * Returns the api tree (later to be output in the {@link #outputApiTree} method).  
     * The class name is searched for in the component list and if found is added to the 
     * component tree.  Else the class will be added to the API tree.
     * @param {String} [className] The classname being processed.
     * @return {Array} The api tree
     */
    getApiTree (className) {
        let names         = this.componentClassNames,
            menuNames     = this.componentMenuNames,
            inList        = names.includes(className) || menuNames.includes(className),
            treeName      = inList ? 'Components' : this.apiDirName.toUpperCase(),
            apiTree       = this.apiTrees[treeName];

        if (!apiTree) {
            apiTree = this.apiTrees[treeName] = [];
        }

        return apiTree;
    }

    /**
     * Adds the class to either the API tree or the "Components" tree depending on 
     * whether the class name being processed is in the Components list or not
     * @param {String} className The class name being added to the navigation tree
     * @param {String} icon The icon to use for this class in the tree
     */
    addToApiTree (className, icon) {
        let names  = this.componentClassNames,
            inList = names.includes(className);

        if (!inList) {
            super.addToApiTree(className, icon);
        } else {
            let componentsList = this.componentList,
                treeCfg = componentsList[className];
            
            super.addToApiTree(treeCfg, icon);
        }
    }

    /**
     * @private
     * Sorter method that sorts an array of api tree nodes alphabetically.
     * 
     * Supports {@link #sortTree}
     * @param {Object[]} nodes An array of api tree nodes to sort
     * @return {Object[]} The sorted array
     */
    simpleSortNodes (nodes) {
        //this.log(`Begin 'SourceApi.sortNodes'`, 'info');
        return nodes.sort((a, b) => {
            if (a.name > b.name) {
                return 1;
            }
            if (a.name < b.name) {
                return -1;
            }
            return 0;
        });
    }

    /**
     * Sorts the tree in alphabetical order including folder and leaf nodes
     * @param {Object[]} tree The tree nodes to sort
     * @return {Object[]} The sorted tree
     */
    sortTree (tree) {
        let len = tree.length,
            i   = 0;

        for (; i < len; i++) {
            let node     = tree[i],
                children = node.children;

            if (children) {
                this.sortTree(children);
                node.children = this.simpleSortNodes(children);
            }
        }

        return this.simpleSortNodes(tree);
    }

    /**
     * Sort the API trees
     * @return {Object} The sorted API tree
     */
    sortTrees (apiTrees) {
        let apiTree        = apiTrees.API,
            componentsTree = apiTrees.Components,
            treeObj        = {
                API : {
                    API        : super.sortTree(apiTree),
                    Components : this.sortTree(componentsTree)
                }
            };

        return treeObj;
    }

    /**
     * Returns the key from {@link #componentList} using the passed value
     * 
     * .e.g.
     * If componentList has the following pair:
     * 
     *     {
     *         "Ext.Button"" : "Button"
     *     }
     * 
     * calling getClassByMenuName('Button) will return `Ext.Button`
     * 
     * @param {String} menuValue The menu value to display in the Components navigation 
     * tree used to find the key it's paired with
     * @return {String} The key paired with the passed menu string or undefined if not 
     * found
     */
    getClassByMenuName (menuValue) {
        return _.findKey(this.componentList, (val) => {
            return menuValue === val;
        });
    }
}

module.exports = ExtReactHtmlApp;
