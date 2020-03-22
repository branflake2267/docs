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

const HtmlApp = require('../create-app-html'),
  Path = require('path'),
  Handlebars = require('handlebars'),
  Fs = require('fs-extra'),
  UglifyJS = require("uglify-js"),
  CleanCSS = require('clean-css'),
  Utils = require('../shared/Utils'),
  _ = require('lodash');

const Entities = require('html-entities').AllHtmlEntities;
var entities = new Entities();

const words = [
  'split',
  'button',
  'calendar',
  'view',
  'field',
  'data',
  'editable',
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

class OpenToolingHtmlApp extends HtmlApp {
  constructor(options) {
    super(options);

    this.options.prodVerMeta.toolkit = 'modern';

    this.componentNameMap = {};
  }

  /**
   * Default entry point for this module
   */
  run() {
    super.run();
  }

  /**
   * Returns an array of this module's file name along with the file names of all
   * ancestor modules
   * @return {String[]} This module's file name preceded by its ancestors'.
   */
  get parentChain() {
    return super.parentChain.concat([Path.parse(__dirname).base]);
  }

  /**
   * Returns this module's name
   */
  get moduleName() {
    return Path.parse(__dirname).base;
  }

  /**
   * Gets the array of component class names
   * @return {String[]} The array of component names
   */
  get componentMenuNames() {
    let names = this._componentMenuNames;

    if (!names) {
      this._componentMenuNames = names = [];

      let list = this.componentList,
        components = this.componentClassNames,
        len = components.length;

      while (len--) {
        let name = components[len];

        names.push(list[name].menuText || list[name]);
      }
    }

    return names;
  }

  /**
   * The classes to apply to guide nodes in the navigation tree by type:
   *
   *  - universal
   *  - modern
   *  - classic
   * @return {Object} The hash of toolkit to icon class string
   */
  get guideIconClasses() {
    let cls = 'fa fa-file-text-o';

    return {
      universal: cls,
      classic: cls,
      modern: cls
    };
  }

  /**
   * The partial to use as the help page content
   * @return {String} The name of the partial file to use as the docs help content
   */
  get helpPartial() {
    return '_react-help';
  }

  /**
   * Returns the id to use on the navigation node for the passed class name
   * @param {String} className The classname being processed in the navigation tree
   * @param {Number} currentIndex The index for the current node's processing -
   * essentially the depth this node is in the tree when the ID is requested
   * @return {String} The id for the current node being processed
   */
  getNodeId(className, currentIndex) {
    let names = this.componentMenuNames,
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
  getApiTree(className) {
    let names = this.componentClassNames,
      menuNames = this.componentMenuNames,
      inList = names.includes(className) || menuNames.includes(className),
      treeName = inList ? 'Components' : 'API',
      apiTree = this.apiTrees[treeName];

    if (!apiTree) {
      apiTree = this.apiTrees[treeName] = [];
    }

    return apiTree;
  }

  /**
   * Returns common metadata needed by app pages
   * @return {Object} Hash of common current page metadata
   */
  get commonMetaData() {
    let meta = super.commonMetaData;

    meta.componentClassNameMap = this.componentList;
    return meta;
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
   * Populates the componentNameMap property with the full class name and component
   * name pairings.  The map is used to replace the displayed names of OpenTooling class
   * names with their simplified names
   */
  createComponentNameMap() {
    let classMap = this.classMap,
      classNames = Object.keys(classMap),
      //i          = 0,
      len = classNames.length,
      names = this.componentClassNames,
      map = this.componentNameMap;

    while (len--) {
      let className = classNames[len];

      if (names.includes(className)) {
        let prepared = classMap[className].prepared,
          alias = prepared.alias;

        if (alias) {
          let aliases = alias.split(','),
            len = aliases.length,
            i = 0,
            aliasList = [];

          // if the class has an alias then we'll use a camelized version of
          // the alias as the class 'name' and the class name will display as
          // an alias
          for (; i < len; i++) {
            let fullAlias = aliases[i],
              separatorIdx = fullAlias.indexOf('.'),
              prefix = fullAlias.substring(0, separatorIdx),
              name = fullAlias.substring(separatorIdx + 1);

            if (prefix === 'widget' || prefix === 'widget') {
              name = this.camelize(name);
            } else {
              name = fullAlias.split('.');
              //name = this.camelize(name[name.length - 1]);
              name = name[name.length - 1];
            }
            aliasList.push({
              prefix: prefix,
              name: name
            });
          }

          map[className] = aliasList;
        }
      }
    }
  }

  /**
   * Outputs all class files from the Doxi processing (and any post-processing from
   * source-api) by passing the classname and class object to {@link #outputApiFile}
   * @return {Object} A Promise that processes all class files and calls to
   * `outputApiFile`
   */
  processApiFiles() {
    //create the component name / class name map
    this.createComponentNameMap();
    super.processApiFiles();
  }

  /**
   * // override source-api
   * Add the passed class name to the api tree used for UI nav
   * @param {String} className The full class name to process and add to the API tree
   * @param {String} icon An icon class name to include if passed:
   *
   *  - component
   *  - singleton
   *  - class
   * @param {Object} apiTree The tree to add the classname / node to
   * @param {String} [idSuffix] An optional suffix to add to the node id
   */
  addToApiTree(className, icon, apiTree, idSuffix = '') {
    let names = this.componentClassNames,
      inList = names.includes(className);

    if (!inList) {
      super.addToApiTree(className, icon, apiTree);
    } else {
      let componentsList = this.componentList,
        treeCfg = componentsList[className].menuText || className;

      super.addToApiTree(treeCfg, icon, apiTree);
      super.addToApiTree(className, icon, this.apiTrees.API, '-placeholder');
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
  simpleSortNodes(nodes) {
    return _.orderBy(nodes, [name => name.name.toLowerCase()], ['asc']);
  }

  /**
   * Sorts the tree in alphabetical order including folder and leaf nodes
   * @param {Object[]} tree The tree nodes to sort
   * @return {Object[]} The sorted tree
   */
  reactSortTree(tree) {
    let len = tree.length,
      i = 0;

    for (; i < len; i++) {
      let node = tree[i],
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
  sortTrees(apiTrees) {
    let apiTree = apiTrees.API,
      componentsTree = apiTrees.Components;

    let treeObj = {
      API: {
        API: super.sortTree(apiTree),
        Components: this.reactSortTree(componentsTree)
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
  getClassByMenuName(menuValue) {
    return _.findKey(this.componentList, (val) => {
      return val.menuText === menuValue || menuValue === val;
    });
  }

  /**
   * Logs out a list of classes with that have xtypes, but are not represented in the
   * components list
   */
  listRemainingComponentClasses() {
    this.bulkClassReportedUtil('doListRemainingComponentClasses');
  }

  /**
   * See {@link #listRemainingComponentClasses}
   * @param {Object} prepared The prepared class object
   * example
   */
  doListRemainingComponentClasses(prepared) {
    let name = prepared.name,
      alias = prepared.alias,
      names = this.componentClassNames;

    if (alias) {
      alias = alias.split(',');

      if (alias[0].indexOf('widget.') === 0) {
        if (!names.includes(name)) {
          this.log(name);
        }
      }
    }
  }

  /**
   * Post-processes the prepared class object after the super class decoration of the
   * class object is complete
   * @param {String} className The class name to process
   */
  decorateClass(className) {
    super.decorateClass(className);

    let classMap = this.classMap,
    prepared = classMap[className].prepared,
    cls = prepared.cls,
    names = this.componentClassNames;

    // Hide things in the bridges
    if (prepared.styleOverrides == null) {
      prepared.styleOverrides = "";
    }

    prepared.styleOverrides += ".classHead { display: none; }\n"; // Don't display the box on the right
    prepared.styleOverrides += ".alias { display: none; }\n"; // hide the class alias
    prepared.styleOverrides += "#member-display { display: none; }\n"; // ide the filter of the members, TODO maybe keep this
    prepared.styleOverrides += ".source-class { display: none; }\n"; // hide the extended class links

    if (names.includes(className)) {
      let alias = this.componentNameMap[className],
        name = cls.name,
        events = prepared.events;

      // if the class has an alias then we'll use a camelized version of the alias
      // as the class 'name' and the class name will display as an alias
      if (alias && alias.length) {
        cls.name = this.componentList[name].preferredAlias || alias[0].name;
        //cls.aliasName = name; // don't show the alias name for bridges
        delete cls.aliasPrefix;
      }

      // set the config and property names to match what React users would expect
      if (prepared.configs) {
        prepared.configs.name = 'properties';
      }
      if (prepared.properties) {
        prepared.properties.name = 'fields';
      }

      // if there are events on the class camelize them and prefix with 'on' to
      // match React event name convention
      if (events) {
        let len = events.length;

        while (len--) {
          let event = events[len];

          event.name = `on${this.camelize(event.name)}`;
          event.returnPrefix = ' => ';
          event.paramsPrefix = ': function';
        }
      }

      prepared.myMeta.pageName = cls.name;

      // remove select properties for the Opentooling output
      let configs = prepared.configs;

      if (configs) {
        let blacklist = [
          'items',
          'defaultType',
          'control',
          'renderTo',
          'weighted'
        ];

        if (configs.hasOptionalConfigs) {
          _.remove(configs.optionalConfigs, item => {
            return blacklist.includes(item.name);
          });
        }
        if (configs.hasRequiredConfigs) {
          _.remove(configs.requiredConfigs, item => {
            return blacklist.includes(item.name);
          });
        }
      }

      prepared.addlBodyCls = 'opentooling-component';
      prepared.cls.multiSrc = true;
    }

    // FRAMEWORK CHOICE
    let webComponent = this.getWebComponentDeclaration(className);
    if (webComponent) {
      //let wc = webComponent.replace('/','');
      //cls.name = wc + wc.replace('&lt;','&lt;/');
      cls.name = webComponent;
    }
  }

  /**
   * // override
   * Process the raw class member object from Doxi for consumption by the HTML docs or
   * @param {String} className The name of the class that the members belong to
   * @param {String} type The type of member being processed
   * @param {Object} member The member object to process
   */
  processMember(className, type, member) {
    super.processMember(className, type, member);

    let name = member.srcClassText;

    // TODO FRAMEWORK CHOICE CLASSNAME 
    if (this.options.prodVerMeta.title == 'ExtAngular') {
      name = className;
    } else if (this.options.prodVerMeta.title == 'ExtReact') {
      name = className;
    } else if (this.options.prodVerMeta.title == 'ExtWebComponents') {
      name = className;
    }
    // members class description on the right of the properties, methods and events.
    member.srcClassText = this.replaceWithComponentName(name, false);

    // Web Componnent Attributes
    let webComponent = this.getWebComponentDeclaration(className, false);
    if (webComponent) {
      webComponent = webComponent.substring(1, webComponent.length - 2);

      // Attribute Name
      let attrName = member.name;

      // Function Paramaters
      let funParams = '';
      if (member.params && member.params.length > 0) {
        let a = [];
        for (let i = 0; i < member.params.length; i++) {
          let funParam = member.params[i].name;
          if (funParam == 'this') {
            funParam = 'sender';
          }
          a.push(funParam);
        }
        funParams = a.toString();
        funParams = funParams.replace(/,/g, ', ');
      }

      // Function Return
      let funReturn = '';
      if (member.returns && member.returns.length > 0) {
        var rt = null;
        if (member.returns[0].type == 'Boolean') {
          rt = true;
        } else if (member.returns[0].type == 'String') {
          rt = "'value'";
        } else if (member.returns[0].type == 'Number') {
          rt = 10;
        } else if (member.returns[0].type == 'Object') {
          rt = '{ }';
        } else if (member.returns[0].type == 'Object') {
          rt = 'function() { }'
        }
        funReturn = `return ${rt};`;
      }

      // Event AST
      let eventHtml = '';
      if (member.$type === 'event') {
        
        let funEvent1 = '';
        let funEvent2 = '';
        if (this.options.prodVerMeta.title == 'ExtWebComponents') {
          // EWC target
          // <ext-button onTap="function(this, e) { }" /> // TODO
          // let element = document.body.querySelector('ext-button');
          // element.addEventListener('tap', function(this, e) { });

          // EWC - TODO wait until it's working
          //let fn = `function(${funParams}) { }`;
          //funEvent1 += `<${webComponent} on${this.camelize(attrName)}="${fn}" />`;
          funEvent2 += `let element = document.body.querySelector('${webComponent}');\n`;
          funEvent2 += `element.addEventListener('${member.name}', function(${funParams}) { });`;

        } else if (this.options.prodVerMeta.title == 'ExtAngular') {
          // ExtAngular target
          // (change)="onChange($event)"
          // onChange = ({sender, node, prevNode, eOpts}) => { //... };

          let nameCapped = member.name.charAt(0).toUpperCase() + member.name.slice(1);
          funEvent1 += `// Delcare in template tag\n`;
          funEvent1 += `(${member.name})="on${nameCapped}($event)"\n`;
          funEvent2 += `// Declare in class\n`;
          funEvent2 += `on${nameCapped} = ({ ${funParams} }) => { //... };\n`;

        } else if (this.options.prodVerMeta.title == 'ExtReact') {
          // ExtReact target
          // onChange={this.onPathChange}
          // onPathChange = ({sender, node, prevNode, eOpts}) => { //… };

          let nameCapped = member.name.charAt(0).toUpperCase() + member.name.slice(1);
          funEvent1 += `// Delcare in template tag\n`;
          funEvent1 += `on${nameCapped}={this._on${nameCapped}}\n`;
          funEvent2 += `// Declare in class\n`;
          funEvent2 += `_on${nameCapped} = ({ ${funParams} }) => { //... };\n`;
        }

        eventHtml += `<pre class='prettyprint'><code class='lang-html'>${entities.encode(funEvent1)}</code></pre>\n`;
        eventHtml += `<pre class='prettyprint'><code class='lang-javascript'>${entities.encode(funEvent2)}</code></pre>\n`;
      }

      // Property AST
      let propertyHtml = '';
      let memberValueType = 'value';
      if (member.$type == 'property' || member.$type == 'cfg') {
        if (member.type && member.type.includes('Boolean')) {
          memberValueType = true;
        } else if (member.type && member.type.includes('String')) {
          memberValueType = 'value';
        } else if (member.type && member.type.includes('Number')) {
          memberValueType = 10;
        } else if (member.type && member.type.includes('Object')) {
          memberValueType = '{ }';
        } else if (member.type && member.type.includes('Function')) {
          memberValueType = 'function() { }';
        }

        let bracketLeft = '';
        let bracketRight = '';
        if (this.options.prodVerMeta.title == 'ExtAngular' && 
        ((member.type && member.type.includes('Boolean') || (member.type && member.type.includes('Number'))))) {
          bracketLeft = '[';
          bracketRight = ']';
        }

        let inlineProperty = `<${webComponent} ${bracketLeft}${attrName}${bracketRight}="${memberValueType}" />`;

        let propertyReturn = `let ${attrName} = `;

        let property = '';
        property += `let element = document.body.querySelector('${webComponent}');\n`

        if (funParams) {
          property += `element.${attrName}(${funParams});`;
        } else {
          if (memberValueType == 'value') {
            memberValueType = `'${memberValueType}'`; // add quotes to string ast
          }
          // setter
          if (!member.readonly) {
            property += `element.${attrName} = ${memberValueType};\n`;
          }
          // getter
          property += `${propertyReturn}element.${attrName};`;
        }

        propertyHtml += `<pre class='prettyprint'><code class='lang-html'>${entities.encode(inlineProperty)}</code></pre>\n`;
        propertyHtml += `<pre class='prettyprint'><code class='lang-javascript'>${entities.encode(property)}</code></pre>\n`;
      }

      // Method AST
      let methodHtml = ``;
      if (member.$type == 'method' || member.$type == 'static-methods') {
        //let fn = `function(${funParams}) { }`;
        //let inlineMethod = `<${webComponent} ${attrName}="${fn}" />`;

        let methodReturn = '';
        if (member.returns && member.returns.length > 0) {
          methodReturn = `let ${attrName} = `;
        }

        let method = '';
        method += `let element = document.body.querySelector('${webComponent}');\n`;
        method += `${methodReturn}element.${attrName}(${funParams});`;

        // if (!member.name.match(/get.*/)) {
        //   methodHtml += `<pre class='prettyprint'><code>${entities.encode(inlineMethod)}</code></pre>\n`; 
        // }
        methodHtml += `<pre class='prettyprint'><code class='lang-javascript'>${entities.encode(method)}</code></pre>\n`;
      }

      let exampleHtml = '';
      if (member.$type == 'property' || member.$type == 'cfg') {
        exampleHtml = propertyHtml;
      } else if (member.$type == 'event') {
        exampleHtml = eventHtml;
      } else if (member.$type == 'method' || member.$type == 'static-methods') {
        exampleHtml = methodHtml;
      }

      member.example = exampleHtml;
    }
  }

  /**
   * Turns all `{@link}` instances into API links within the passed HTML string.  Any
   * event links found are adjusted using {@link #camelize} and prefixed with 'on' to
   * match the event name convention in React
   * @param {String} html The HTML markup whose links require processing
   * @return {String} The original HTML string with all links processed
   */
  parseApiLinks(html) {
    return html.replace(this.linkRe, (match, link, text) => {
      link = link.replace('!', '-');

      let eventLink = '#event-',
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
          link = link.replace('#', '.html#');
        }
      } else {
        link += '.html';
      }

      // replace canonical class names with OpenTooling names
      text = this.replaceWithComponentName(text);

      return this.createApiLink(link, text.replace(this.hashStartRe, ''));
    });
  }

  /**
   * Replaces the passed string with an OpenTooling component name from the
   * componentNameMap property if a match is found
   * @param {String} str The string to match with
   * @return {String} The OpenTooling component name if a match is found in the
   * componentNameMap or the original string param if not
   */
  replaceWithComponentName(str, encode = true) {
    let webComponent = this.getWebComponentDeclaration(str, encode);
    if (webComponent) {
      // Return the web component name
      return webComponent;
    }

    let map = this.componentNameMap;
    let ref = map.hasOwnProperty(str) && map[str];
    if (ref && ref.length) {
      str = ref[0].name;
    }
    return str;
  }

  /**
   * @method createLink
   * @param href
   * @param text
   */
  createLink(href, text) {
    text = this.replaceWithComponentName(text);
    return super.createLink(href, text);
  }

  /**
   * @param {String} suffix A suffix to append to the search key.  Helpful when you are
   * combining multiple search results together.
   */
  getApiSearch() {
    let search = super.getApiSearch(),
      keys = Object.keys(search),
      len = keys.length,
      map = this.componentNameMap;

    while (len--) {
      let searchObj = search[keys[len]],
        clsName = searchObj.n,
        ref = map.hasOwnProperty(clsName) && map[clsName];

      if (ref && ref.length) {
        let aliases = [],
          refLen = ref.length;

        while (refLen--) {
          let aliasObj = ref[refLen];

          aliases.push(`${aliasObj.prefix}.${aliasObj.name}`);
        }

        searchObj.x = aliases;
      }
    }

    return search;
  }

  /**
   * Processes the API object's related classes for HTML output.  And for React we want
   * to also display the source NPM package if applicable
   * @param {Object} cls The original class object
   * @param {Object} data The recipient of the processed related classes
   */
  processRelatedClasses(cls, data) {
    super.processRelatedClasses(cls, data);

    if (cls.npmPackage) {
      data.npmPackage = `<div>${cls.npmPackage}</div>`;
    }

    if (data.extends) {
      data.extends = data.extends.replace(/(.*<div class="hierarchy pl2">)(.*?)(<\/div>.*)/gi, (match, p1, p2, p3) => {
        let text = this.replaceWithComponentName(p2);
        let div = p1 + text + p3;
        return div;
      });
    }
  }

  /**
   * Prepares additional api data processing prior to handing the data over to the api
   * template for final output
   * @param {Object} data The object to be processed / changed / added to before
   * supplying it to the template
   */
  processApiDataObject(data) {
    let names = this.componentClassNames,
      name = data.cls.name;

    super.processApiDataObject(data);
    data.hasToolkits = false;

    // if this class is a component class list its Component Name as the page title
    if (names.includes(name)) {
      let alias = this.componentNameMap[name];

      if (alias && alias.length) {
        data.name = this.componentList[name].preferredAlias || alias[0].name;
      }
    }
  }

  /**
   * Template method to allow for additional guide data processing prior to handing the
   * data over to the guide template for final output
   * @param {Object} data The object to be processed / changed / added to before
   * supplying it to the template
   */
  processGuideDataObject(data) {
    super.processGuideDataObject(data);
    data.hasToolkits = false;
  }

  /**
   * Splits the postprocessing of a class's configs for "OpenTooling Component" classes
   * and others since we don't want setter / getter methods described in the configs
   * section of "OpenTooling Component" classes
   * @param {Object} data The class object to be passed to the HTML template
   */
  postProcessConfigs(data) {
    let names = this.componentClassNames;

    if (!names.includes(data.cls.name)) {
      super.postProcessConfigs(data);
    } else {
      let instanceMethods = data.instanceMethods,
        instanceMethodsObj = data.instanceMethodsObj,
        configsObj = data.configs,
        optionalConfigs = configsObj.optionalConfigs,
        requiredConfigs = configsObj.requiredConfigs,
        configs = optionalConfigs.concat(requiredConfigs),
        configsLen = configs.length,
        i = 0,
        mixins = data.mixed && data.mixed.split(','),
        mixesBindable = mixins && mixins.includes('Ext.mixin.Bindable');

      for (; i < configsLen; i++) {
        let config = configs[i],
          name = config.name || '',
          capitalName = Utils.capitalize(name),
          // edge cases like 'ui' and 'setUI'
          upperName = name.toUpperCase(),
          accessor = config.accessor;

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
            getterCfg = {
              name: getterName,
              $type: 'method',
              access: config.access,
              text: `<p>Sets the value of <a href="#cfg-${name}">${name}</a></p>`,
              isInherited: config.isInherited,
              type: config.type,
              isAutoGetter: !g,
              srcClass: config.srcClass,
              srcClassText: config.srcClassText,
              srcLink: config.srcLink
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
            setterCfg = {
              name: setterName,
              $type: 'method',
              access: config.access,
              text: `<p>Returns the value of <a href="#cfg-${name}">${name}</a></p>`,
              isInherited: config.isInherited,
              isAutoSetter: !s,
              listParams: true,
              params: [{
                name: name
              }],
              srcClass: config.srcClass,
              srcClassText: config.srcClassText,
              srcLink: config.srcLink
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

        // if any of the configs has the "react-child" flag then we'll process
        // child items below
        if (config['react-child']) {
          //config.name = this.camelize(config.name);
          data.hasChildItems = true;
        }
      }

      // if any of the configs were child items
      if (data.hasChildItems) {
        let children = [];

        // remove the child items from the required configs array
        if (requiredConfigs) {
          children = children.concat(_.remove(requiredConfigs, config => {
            return config['react-child'];
          }));
        }
        // and the optional configs array
        if (optionalConfigs) {
          children = children.concat(_.remove(optionalConfigs, config => {
            return config['react-child'];
          }));
        }
        // and add them to the 'children' array
        data['child-items'] = children;

        // Links to the eligible child components are added to the class
        // description using the types from the config
        let len = children.length,
          links = [];

        while (len--) {
          let child = children[len],
            type = child.type;

          if (type) {
            let types = type.split(' / '),
              typesLen = types.length,
              i = 0,
              hrefTest = /href=(?:"|')(.*?)(?:"|')/g,
              //links = [],
              matchingArr;

            for (; i < typesLen; i++) {
              while ((matchingArr = hrefTest.exec(types[i])) !== null) {
                let linkName = matchingArr[1].replace('.html', '');

                //if (names.includes(linkName)) {
                links.push(matchingArr.input);
                //}
              }
            }
          }
        }

        if (links.length) {
          data.classText = data.classText || '';
          data.classText += `<h2>Children</h2>
                        The following Components (and their sub-components) may be
                        included as children of ${data.name}:<br>`;
          data.classText += links.join('<br>');
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

module.exports = OpenToolingHtmlApp;
