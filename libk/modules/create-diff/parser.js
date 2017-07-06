/* jshint node: true */
'use strict';

const DiffBase        = require('./base.js'),
      Path            = require('path'),
      Fs              = require('fs-extra'),
      _               = require('lodash'),
      Pluralize       = require('pluralize'),
      CompareVersions = require('compare-versions');

class DiffParser extends DiffBase {
    constructor (options) {
        super(options);
    }
    
    /**
     * The path to the doxi-processed file
     * @return {String} The path to the doxi processed file
     */
    get flatDoxiFilePath () {
        const command  = this.doxiBuildCommand,
              product  = this.apiProduct,
              version  = this.apiVersion,
              toolkits = this.getToolkits(product, version),
              toolkit  = toolkits ? this.apiDirName : 'api';
        
        return Path.join(
            this.getDoxiInputDir(command),
            `${toolkit}_${command}.json`
        );
    }
    
    /**
     * Determines whether doxi should be run or can be skipped
     * @return {Boolean} Returns `true` if the doxi flat file is missing
     */
    get doxiRequired () {
        return !Fs.existsSync(this.flatDoxiFilePath);
    }
    
    /**
     * The contents of the doxi file used by the parser logic when comparing to the 
     * source product / version.  The `--diffTargetPath` will be used if supplied.  Else, 
     * a new doxi output file will be created using the {@link #diffTargetProduct} and 
     * {@link diffTargetVersion}
     * @return {Object} The doxi file containing all processed files from the API
     */
    get targetFile () {
        let targetFile = this.options.diffTargetPath;
        
        if (!targetFile) {
            this.diffProcess = 'target';
            // create the file Doxi will use to parse the SDK
            this.createTempDoxiFile();
            
            // creates the doxi flat file if not already created
            this.doRunDoxi(this.doxiBuildCommand);
            
            targetFile = this.flatDoxiFilePath;
        }
        
        return Fs.readJsonSync(targetFile);
    }
    
    /**
     * The contents of the doxi file used by the parser logic when comparing to the 
     * target product / version.  The `--diffSourcePath` will be used if supplied.  Else, 
     * a new doxi output file will be created using the {@link #diffSourceProduct} and 
     * {@link diffSourceVersion}
     * @return {Object} The doxi file containing all processed files from the API
     */
    get sourceFile () {
        let sourceFile = this.options.diffSourcePath;
        
        if (!sourceFile) {
            this.diffProcess = 'source';
            // create the file Doxi will use to parse the SDK
            this.createTempDoxiFile();
            
            // creates the doxi flat file if not already created
            this.doRunDoxi(this.doxiBuildCommand);
            
            sourceFile = this.flatDoxiFilePath;
        }
        
        return Fs.readJsonSync(sourceFile);
    }
    
    /**
     * Returns the diff between two product / version pairs by evaluating the differences
     * in the files produced by Doxi
     * @return {Object} The diff object outlining all of the differences between the two 
     * products / versions
     */
    get diff () {
        const { options, diffOutputDir, diffFileName } = this,
              { forceDiff } = options,
              path = Path.join(diffOutputDir, diffFileName) + '.json';
        
        // if forceDiff isn't specified and the file already exits just return its
        // contents
        if (Fs.existsSync(path) && forceDiff !== true) {
            return Fs.readJsonSync(path);
        } else {
            const { options }   = this,
                  targetClasses = this.targetFile.global.items,
                  sourceClasses = this.sourceFile.global.items,
                  {
                      diffTargetProduct,
                      diffTargetVersion,
                      diffSourceProduct,
                      diffSourceVersion
                  }    = this,
                  // create the diff object that the diff details will attach to
                  diff = {
                      meta : {
                          diffed : {
                              source : {
                                  title   : options.products[diffSourceProduct].title,
                                  product : diffSourceProduct,
                                  version : diffSourceVersion
                              },
                              target : {
                                  title   : options.products[diffTargetProduct].title,
                                  product : diffTargetProduct,
                                  version : diffTargetVersion
                              }
                          },
                          // the totals of all classes and members by type
                          sdkTotals : this.getSdkTotals(targetClasses)
                      }
                  };
                
            // ensure either product / version is passed or the diff-specific flags
            if (!diffTargetProduct) {
                this.error('The target product name is missing: `--diffTargetProduct` (the --product flag may also be used to indicate both diffTargetProduct and diffSourceProduct)');
                this.concludeBuild();
            }
            if (!diffTargetVersion) {
                this.error('The target product version is missing: `--diffTargetVersion` (the --version flag may also be used)');
                this.concludeBuild();
            }
            if (!diffSourceProduct) {
                this.error('The source product name is missing: `--diffSourceProduct` (the --product flag may also be used to indicate both diffTargetProduct and diffSourceProduct)');
                this.concludeBuild();
            }
            if (!diffSourceVersion) {
                this.error('The source product version is missing: `--diffSourceVersion` (the --version flag may also be used which will determine the target and the source version will be derived from that)');
                this.concludeBuild();
            }
            
            // the diffing is kicked off by passing in the array of all classes from both the
            // target and the source
            this.diffItems(diff, 'class', targetClasses, sourceClasses);
            this.cleanObject(diff); // remove all of the empty objects and arrays
            this.addDiffToSinceMap(diff);
            return diff;
        }
    }
    
    /**
     * Returns the total classes and class members from the target product / version (by
     * calling {@link #getTotalFromItems})
     * @return {Object} The totals for each type
     */
    getSdkTotals (targetClasses) {
        const categories    = this.typeCategories,
              categoriesLen = categories.length,
              totalsObj     = _.zipObject(categories, _.fill(Array(categoriesLen), 0));
        
        // extract the totals from all of the target classes and apply them to the 
        // totalsObj
        this.getTotalFromItems(targetClasses, totalsObj);
        return totalsObj;
    }
    
    /**
     * 
     * @param {Object[]} items Array of items to process.  Each item in the array could 
     * be a class object, a member type object that has member items, or a member item 
     * itself.
     * @param {Object} totalsObj The totals object to increment as each item is inspected
     * @param {String} [category] The category that the current array of `items` belongs 
     * to.  This won't be passed for classes, but will when a member group is encountered
     * and its items are passed in to be totaled.
     */
    getTotalFromItems (items, totalsObj, category) {
        const len = items.length;
        let   i   = 0;
        
        // loop over all `items` passed in
        for (; i < len; i++) {
            const item = items[i],
                  { $type, from, items : memberGroups } = item;
            
            if ($type === 'class') {
                totalsObj.class++; // increment the class count
                
                if (memberGroups) {
                    const groupLen = memberGroups.length;
                    let   j        = 0;
                    
                    // for member groups loop over all groups and pass their items back
                    // in to be totaled
                    for (; j < groupLen; j++) {
                        const group = memberGroups[j],
                              { $type, items } = group;
                        
                        this.getTotalFromItems(items || [], totalsObj, $type);
                    }
                }
            } else if (!category && $type != 'enum') {
                // sometimes a class member is passed in as a class, but really is just a
                // class member in the global space.  We'll go ahead and count it, too.
                const categorizedType = Pluralize.plural($type);
                        
                if (typeof totalsObj[categorizedType] !== 'undefined') {
                    totalsObj[categorizedType]++;
                }
            } else {
                // lastly, we'll add all individual member items to the count
                if (!from && typeof totalsObj[category] !== 'undefined') {
                    totalsObj[category]++;
                }
            }
        }
    }
    
    /**
     * Add all added classes and members to the sinceMap and output it to disc
     * @param {Object} diff The diff object
     */
    addDiffToSinceMap (diff) {
        const { sinceMap, diffTargetProduct, diffTargetVersion, apiDirName } = this;
        // add the product to the since map
        let prod = sinceMap[diffTargetProduct] = sinceMap[diffTargetProduct] || {};
        
        // add the toolkit to the since map
        prod = prod[apiDirName] = prod[apiDirName] || {};

        // add added classes to the since map
        if (diff.items && diff.items.added && diff.items.added.class) {
            diff.items.added.class.forEach(name => {
                prod[name] = prod[name] || {
                    since : diffTargetVersion,
                    items : {}
                };
                
                if (CompareVersions(diffTargetVersion, prod[name].since) < 0) {
                    prod[name].since = diffTargetVersion;
                }
            });
        }
        
        // add added class members to the since map
        if (diff.items && diff.items.modified && diff.items.modified.class) {
            const modified = diff.items.modified.class,
                  classes = _.keys(modified);
            
            // loop over the modified classes and add each added member to the since map
            classes.forEach(name => {
                prod[name] = prod[name] || {
                    since : diffTargetVersion,
                    items : {}
                };
                
                if (modified[name] && modified[name].items && modified[name].items.added) {
                    const types = _.keys(modified[name].items.added);
                    
                    types.forEach(type => {
                        const added = modified[name].items.added[type];
                        
                        added.forEach(member => {
                            const memberSince = prod[name].items[`${type}|${member}`];
                            
                            if (!memberSince) {
                                prod[name].items[`${type}|${member}`] = {
                                    since : diffTargetVersion
                                };
                            } else {
                                if (CompareVersions(diffTargetVersion, memberSince.since) < 0) {
                                    memberSince.since = diffTargetVersion;
                                }
                            }
                        });
                    });
                }
            });
        }
        
        this.outputSinceMap(sinceMap);
    }

    /**
     * Filter action to remove unwanted classes / members from the diff objects array.
     * Hidden and ignored classes and members are filtered out as are inherited members
     * that would otherwise add unnecessary duplication.  Private classes / members are
     * also filtered out if the --diffIgnorePrivate flag is passed.
     * @return {Array} The filtered array of items
     */
    filterItems (items, type) {
        return _.filter(items, (item) => {
            const { from, ignore, hide, $type, access } = item,
                  { options }                           = this,
                  { diffIgnorePrivate }                 = options;
            
            // if classes are being passed in and the item isn't a class (a member in
            // the global space that showed up accidentally) then filter it out
            if (type === 'class' && $type !== 'class') {
                return false;
            }
            
            // private classes / members may be ignored in the diff by setting 
            // `--diffIgnorePrivate`
            if (diffIgnorePrivate && access === 'private') {
                return false;
            }
            
            // finally, we'll filter out any inherited, ignored, or hidden items
            return !from && !ignore && !hide;
        });
    }

    /**
     * To-be-diffed items are collected with their type and name separated by a pipe
     * character to avoid diffing same-named members accidentally.  This method loops
     * over all items and creates category hashes on the diff object (categories that
     * are never populated are later snipped off with {@link #cleanObject}).
     * @param {Object} diffObj The diff object to attach the added / removed items to
     * @param {Array} items The items to add to the diff object
     * @param {String} action The action being logged: 'add' or 'remove'
     */
    sortItemsByType (diffObj, items) {
        items.forEach(item => {
            const itemSplit = item.split('|'),
                  [ categoryName, name ] = itemSplit;
                  
            diffObj[categoryName] = diffObj[categoryName] || [];
            diffObj[categoryName].push(name);
        });
        
        const categories = _.keys(diffObj);
        
        categories.forEach(category => {
            diffObj[category] = diffObj[category].reverse();
        });
    }
    
    /**
     * The type of item and the item's name are used to return the type and name
     * separated by a pipe character.  Using this as the key when diffing prevents
     * accidentally diffing two different members of a class that have the same name, but
     * a different type.
     * @param {Object} obj The item being evaluated
     * @return {String} The type|name pair
     */
    getMapKey (obj) {
        const { $type, name } = obj;

        return `${$type}|${name}`;
    }
    
    /**
     * Process the passed target and source items adding their child items (classes and
     * members) to the `diffObject`.  The `targetItems` and `sourceItems` are compared to
     * get a list of things added to or removed from the `type`.  All items in the
     * `targetItems` array that weren't added are then passed to {@link #diffItem} to
     * diff changes to the item between products / versions.
     * @param {Object} diffObj The diffObject to add diff details to
     * @param {String} [type=class] The type of items being diffed
     * @param {Object[]} [targetItems=[]] The class or member items from the target 
     * product
     * @param {Object[]} [sourceItems=[]] The class or member items from the source 
     * product
     */
    diffItems (diffObj, type = 'class', targetItems = [], sourceItems = []) {
        const diffItems = diffObj.items = {};

        // first, filter out any unwanted items before processing them
        targetItems = this.filterItems(targetItems, type).reverse();
        sourceItems = this.filterItems(sourceItems, type).reverse();

        // create a map of type|name > item so the items can accurately be reviewed to 
        // see what was added or removed
        const targetMap   = _.keyBy(targetItems, this.getMapKey),
              sourceMap   = _.keyBy(sourceItems, this.getMapKey),
              targetNames = _.keys(targetMap), // get all target names
              sourceNames = _.keys(sourceMap), // get all source names
              // collect the added and removed names by getting the differences
              added       = _.differenceWith(targetNames,   sourceNames, _.isEqual),
              removed     = _.differenceWith(sourceNames,   targetNames, _.isEqual),
              // collect the potentially modified items by removing the added / removed 
              // items between the target and source items
              commonNames = _.intersectionWith(targetNames, sourceNames, _.isEqual),
              modifiedObj = {};
        
        // add all of the added and removed items by category to the `diffObject`
        const addedCt = diffItems.added = {};
        this.sortItemsByType(addedCt, added);
        
        const removedCt = diffItems.removed = {};
        this.sortItemsByType(removedCt, removed);

        // loop over all common names between target and source and pass their items to
        // the `diffItem` method
        let len = commonNames.length;
        
        while (len--) {
            const name = commonNames[len];
            
            this.diffItem(name, modifiedObj, type, targetMap, sourceMap);
        }
        
        diffItems.modified = modifiedObj;
    }
    
    /**
     * Evaluates the target and source maps for each item passed in to collect all of the
     * differences and adds the differences to the `diffObj`
     * @param {String} name The type|name pair to evaluate on the target / source maps
     * @param {Object} diffObj The diff object to apply the differences to
     * @param {String} type The type of item being evaluated
     * @param {Object} targetMap The map of all target items
     * @param {Object} sourceMap The map of all source items
     */
    diffItem (name, diffObj, type, targetMap, sourceMap) {
        const nameSplit      = name.split('|'),
              [ , dispName ] = nameSplit, // this is the actual class / member name
              target         = targetMap[name],
              targetItems    = target.items, // the item's items if it has any
              // determine what list of properties to compare depending on whether this
              // item is a class item or a class member
              propType       = (type === 'class') ? type : 'member',
              // create an object for diffing that only uses the properties for this
              // item's type
              targetObj      = _.pick(targetMap[name], this[`${propType}Props`]),
              source         = sourceMap[name],
              sourceItems    = source.items,
              // again, create an object for diffing that only uses the properties for
              // this item's type
              sourceObj      = _.pick(sourceMap[name], this[`${propType}Props`]),
              // collect up the modified items between the target and the source items
              modified       = _.reduce(targetObj, (result, value, key) => {
                  const fromValue = sourceObj[key];
                
                  if (!_.isEqual(value, fromValue)) {
                      result[key] = {
                          from : fromValue || 'undefined',
                          to   : value     || 'undefined'
                      };
                  }
                  
                  return result;
              }, {});
        
        // add the hierarchy for the current item to the diff object (diffObj)
        diffObj[type]                   = diffObj[type] || {};
        diffObj[type][dispName]         = diffObj[type][dispName] || {};
        diffObj[type][dispName].changes = modified;
        
        if (targetItems) {
            // first look to see if what we're working with is a group of items -vs- a
            // class or a class member itself
            if (_.includes(this.typeCategories, targetItems[0].$type)) {
                // create an object with the type as the key
                const targetTypeObj = _.keyBy(targetItems, '$type'),
                      targetTypes   = _.keys(targetTypeObj), // collect up the targets
                      // create an object with the type as the key
                      sourceTypeObj = _.keyBy(sourceItems, '$type'),
                      sourceTypes   = _.keys(sourceTypeObj), // collect up the targets
                      // get only the unique types from the target and source items
                      allTypes      = _.union(targetTypes, sourceTypes);
                let   len           = allTypes.length;
                
                // loop over all type groups and pass in their items to the `diffItems`
                // method
                while (len--) {
                    const itemType       = allTypes[len],
                          targetCategory = targetTypeObj[itemType] || {},
                          targetItems    = targetCategory.items,
                          sourceCategory = sourceTypeObj[itemType] || {},
                          sourceItems    = sourceCategory.items;
                          
                    this.diffItems(diffObj[type][dispName], itemType, targetItems, sourceItems);
                }
            } else {
                // otherwise, this item we're diffing is a member or a param and has
                // params / sub-params
                this.diffItems(diffObj[type][dispName], 'param', targetItems, sourceItems);
            }
        }
    }
    
    /**
     * Remove all empty arrays and objects recursively from the diff object
     * @param {Object} obj The diff object to clean
     */
    cleanObject (obj) {
        if (_.isObject(obj)) {
            _.each(obj, (val, key) => {
                this.cleanObject(val);
                if (_.isNil(val) || (_.isObject(val) && _.isEmpty(val))) {
                    delete obj[key];
                }
            });
        }
    }
}

module.exports = DiffParser;