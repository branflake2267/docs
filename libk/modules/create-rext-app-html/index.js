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

const words = [
    'split',
    'button',
    'calendar',
    'view',
    'field',
    'data',
    'table',
    'color',
    'picker',
    'slider',
    'tree',
    'grid',
    'cell',
    'column',
    'value',
    'record',
    'manager',
    'edit',
    'header',
    'map',
    'tab',
    'iframe',
    'panel',
    'bar',
    'tip',
    'spacer',
    'text',
    'widget',
    'selector',
    'separator',
    'list',
    'menu',
    'progress',
    'pivot',
    'pie',
    'box',
    'bullet',
    'item',
    'fill',
    'saturation',
    'select',
    'hue',
    'alpha',
    'line',
    'discrete',
    'heat',
    'area',
    'upload',
    'component',
    'check',
    'item',
    'container',
    'config',
    'row',
    'cell',
    'range',
    'group',
    'title',
    'slot',
    'tool',
    'trigger',
    'native',
    'toolbar',
    'tristate',
    'preview',
    'up',
    'add',
    'end',
    'click',
    'front',
    'hide',
    'hidden',
    'max',
    'min',
    'show',
    'scrollable',
    'top',
    'left',
    'right',
    'bottom',
    'width',
    'height',
    'item',
    'active',
    'disabled',
    'docked',
    'centered',
    'expand',
    'collapse',
    'pick',
    'tap',
    'node',
    'update',
    'direction',
    'total',
    'cell',
    'double',
    'hold',
    'sort',
    'remove',
    'touch',
    'start',
    'submit',
    'move',
    'insert',
    'complete',
    'dbl',
    'store',
    'built',
    'model',
    'exception',
    'done',
    'leave',
    'enter',
    'mouse',
    'key',
    'down',
    'body',
    'exit',
    'resize',
    'action',
    'success',
    'failed',
    'validity',
    'error',
    'sync',
    'sort',
    'load',
    'drag',
    'drop',
    'over',
    'setup',
    'event',
    'ready',
    'key',
    'query',
    'cls',
    'layout',
    'activate',
    'animation',
    'cancel',
    'swipe',
    'single',
    'pressed',
    'request',
    'before',
    'after',
    'property',
    'long',
    'create',
    'push',
    'prefetch',
    'sprite',
    'group',
    'extender',
    'change',
    'stop',
    'remove',
    'context',
    'reconfigure',
    'deselect',
    'arrow',
    'center',
    'render',
    'group',
    'restore',
    'save',
    'out',
    'toggle',
    'state',
    'destroy',
    'icon',
    'refresh',
    'close',
    'open',
    'legend',
    'deactivate',
    'indicator',
    'numberer',
    'orientation',
    'disclose',
    'disclosure',
    'interaction',
    'build',
    'rebuild',
    'reload',
    'sheet'
].sort((a, b) => a.length - b.length);

const replacements = [
    { find: /^ux/i, replace: 'UX' },
    { find: /^tb/i, replace: 'TB' },
    { find: /d3/gi, replace: 'D3' },
    { find: /mz/gi, replace: 'MZ' },
    { find: /svg/gi, replace: 'SVG' },
    { find: /^url/gi, replace: 'URL' },
    { find: /itemappend/gi, replace: 'ItemAppend' },
    { find: /tofront/gi, replace: 'ToFront' },
    { find: /beforestore/gi, replace: 'BeforeStore' }
];

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
     * The classes to apply to guide nodes in the navigation tree by type:
     *
     *  - universal
     *  - modern
     *  - classic
     * @return {Object} The hash of toolkit to icon class string
     */
    get guideIconClasses () {
        let cls = 'fa fa-file-text-o';

        return {
            universal : cls,
            classic   : cls,
            modern    : cls
        };
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
            treeName      = inList ? 'Components' : 'API',
            apiTree       = this.apiTrees[treeName];

        if (!apiTree) {
            apiTree = this.apiTrees[treeName] = [];
        }

        return apiTree;
    }

    /**
     * Upper CamelCases strings in order to display split words such as
     * @param {String} str The string to camelize
     * @return {String} The upper camelcased string
     */
    camelize(str) {
        str = str.split(/-/).map(_.capitalize).join('_');

        for (let word of words) {
            str = str.replace(new RegExp(word, 'gi'), _.capitalize(word));
        }

        for (let replacement of replacements) {
            str = str.replace(replacement.find, replacement.replace);
        }
        return str;
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
            componentsTree = apiTrees.Components;

        let treeObj        = {
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

    /**
     * Post-processes the prepared class object after the super class decoration of the
     * class object is complete
     * @param {String} className The class name to process
     */
    decorateClass (className) {
        super.decorateClass(className);

        let classMap = this.classMap,
            prepared = classMap[className].prepared,
            cls      = prepared.cls,
            names    = this.componentClassNames;

        if (names.includes(className)) {
            let alias  = cls.aliasName,
                name   = cls.name,
                events = prepared.events;

            // if the class has an alias then we'll use a camelized version of the alias
            // as the class 'name' and the class name will display as an alias
            if (alias) {
                cls.name      = this.camelize(alias);
                cls.aliasName = name;
                delete cls.aliasPrefix;
            }

            // set the config and property names to match what React users would expect
            if (prepared.configs) {
                prepared.configs.name    = 'props';
            }
            if (prepared.properties) {
                prepared.properties.name = 'fields';
            }

            // if there are events on the class camelize them and prefix with 'on' to
            // match React event name convention
            if (events) {
                let len = events.length;

                while (len--) {
                    let event          = events[len];

                    event.name         = `on${this.camelize(event.name)}`;
                    event.returnPrefix = ' => ';
                    event.paramsPrefix = ': function';
                }
            }
        }
    }

    /**
     * Turns all `{@link}` instances into API links within the passed HTML string.  Any
     * event links found are adjusted using {@link #camelize} and prefixed with 'on' to
     * match the event name convention in React
     * @param {String} html The HTML markup whose links require processing
     * @return {String} The original HTML string with all links processed
     */
    parseApiLinks (html) {
        return html.replace(this.linkRe, (match, link, text) => {
            link = link.replace('!','-');

            let eventLink  = '#event-',
                memberName = link.substring(link.indexOf('-') + 1);

            if (link.includes(eventLink)) {
                memberName = this.camelize(
                    memberName
                );
                link = `${eventLink}on${memberName}`;
            }

            text = text || memberName;

            if (link.includes('#')) {
                let idx = link.indexOf('#');
                if (idx !== 0) {
                    link.replace('#', '.html#');
                }
            }

            return this.createApiLink(link, text.replace(this.hashStartRe, ''));
        });
    }

    /**
     * Splits the postprocessing of a class's configs for "ExtReact Component" classes
     * and others since we don't want setter / getter methods described in the configs
     * section of "ExtReact Component" classes
     * @param {Object} data The class object to be passed to the HTML template
     */
    postProcessConfigs (data) {
        let names = this.componentClassNames;

        if (!names.includes(data.cls.name)) {
            super.postProcessConfigs(data);
        } else {
            let instanceMethods    = data.instanceMethods,
                instanceMethodsObj = data.instanceMethodsObj,
                configsObj         = data.configs,
                optionalConfigs    = configsObj.optionalConfigs,
                requiredConfigs    = configsObj.requiredConfigs,
                configs            = optionalConfigs.concat(requiredConfigs),
                configsLen         = configs.length,
                i                  = 0,
                mixins             = data.mixed && data.mixed.split(','),
                mixesBindable      = mixins && mixins.includes('Ext.mixin.Bindable');

            for (; i < configsLen; i++) {
                let config      = configs[i],
                    name        = config.name || '',
                    capitalName = Utils.capitalize(name),
                    // edge cases like 'ui' and 'setUI'
                    upperName   = name.toUpperCase(),
                    accessor    = config.accessor;

                if (!config.name) {
                    this.log('Missing config name: ' + JSON.stringify(config, null, 4), 'error');
                }

                // set the capitalized name on the config for use by the template
                config.capitalName = capitalName;

                // cache any existing getter / setter instance methods
                let g = instanceMethodsObj[`get${capitalName}`] ||
                                instanceMethodsObj[`get${upperName}`];
                let s = instanceMethodsObj[`set${capitalName}`] ||
                                instanceMethodsObj[`set${upperName}`];

                // if there is a getter or the config is accessor decorate the getter
                // method config
                if (g || accessor === true || accessor === 'r') {
                    let idx = g ? instanceMethods.indexOf(g) : null;

                    let getterName = g ? g.name : `get${capitalName}`,
                        getterCfg  = {
                            name         : getterName,
                            $type        : 'method',
                            access       : config.access,
                            text         : `<p>Sets the value of ${name}</p>`,
                            isInherited  : config.isInherited,
                            type         : config.type,
                            isAutoGetter : !g,
                            srcClass     : config.srcClass,
                            srcLink      : config.srcLink
                        };

                    // if the getter came from the instance methods directly
                    if (idx) {
                        // we're replacing the getter method in the instance methods with
                        // the placeholder config
                        //instanceMethods[idx] = getterCfg;
                    } else {
                        // else add it
                        if (instanceMethods) {
                            instanceMethods.push(getterCfg);
                        }
                    }
                }
                // if there is a setter or the config is accessor decorate the setter
                // method config
                if (s || accessor === true || accessor === 'w') {
                    let idx = s ? instanceMethods.indexOf(s) : null;

                    let setterName = s ? s.name : `set${capitalName}`,
                        setterCfg  = {
                            name         : setterName,
                            $type        : 'method',
                            access       : config.access,
                            text         : `<p>Returns the value of ${name}</p>`,
                            isInherited  : config.isInherited,
                            isAutoSetter : !s,
                            listParams   : true,
                            params       : [{
                                name : name
                            }],
                            srcClass     : config.srcClass,
                            srcLink      : config.srcLink
                        };

                    // if the getter came from the instance methods directly
                    if (idx) {
                        // we're replacing the getter method in the instance methods with
                        // the placeholder config
                        //instanceMethods[idx] = setterCfg;
                    } else {
                        // else add it
                        if (instanceMethods) {
                            instanceMethods.push(setterCfg);
                        }
                    }
                    config.hasSetter = true;
                }

                // decorate the config as `bindable: true` if there is a setter method
                //if (config.hasSetter && mixesBindable) {
                if (!(config.hasSetter && mixesBindable)) {
                    config.immutable = true;
                }
            }

            // if the class has properties then mark them as 'read only' and push them
            // into the optional configs collection and sort the optional configs; also
            // indicate then that the class has no properties
            if (data.hasProperties) {
                // mark the instance properties as readonly
                let len = data.instanceProperties.length;

                while (len--) {
                    data.instanceProperties[len].readonly = true;
                }

                // mark the static properties as readonly
                len = data.staticProperties.length;

                while (len--) {
                    data.staticProperties[len].readOnly = true;
                }

                // push the properties into the configs
                data.configs.optionalConfigs = data.configs.optionalConfigs.concat(
                    data.instanceProperties,
                    data.staticProperties
                );
                // sort the newly assembled configs array by member name
                data.configs.optionalConfigs = _.sortBy(
                    data.configs.optionalConfigs,
                    'name'
                );
                // finally, indicate that the class does not have properties
                data.hasProperties = false;
            }
        }
    }
}

module.exports = ExtReactHtmlApp;
