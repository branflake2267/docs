/* jshint node: true */
'use strict';

const Base   = require('../../base'),
      _      = require('lodash'),
      Utils  = require('../../shared/Utils');

const tests = [
    'access',
    'alias',
    'alternateClassNames',
    'constructor',
    'deprecatedVersion',
    'hide',
    'inheritdoc',
    'localDoc',
    'optional',
    'preventable',
    'readonly',
    'requires',
    'static',
    'type',
    'uses',
    'value'
];

class Parser extends Base {
    constructor (options) {
        super(options);

        this.totalCount = 0;

        this.flagFns = {
            private    : 'isPrivateAccess',
            deprecated : 'isDeprecated',
            class      : 'isClass'
        };

        let categories = options.categories,
            len        = categories.length,
            i          = 0;
        
        for (; i < len; i++) {
            let {name} = categories[i];
            
            this.initCount(name);
        }
    }

    initCount (type) {
        this[`${type}Count`] = {};
        
        let countTypes = this.options.countTypes,
            len = countTypes.length,
            i = 0;
            
        for (; i < len; i++) {
            let key = countTypes[i];
            
            this[`${type}Count`][key] = {
                added    : 0,
                modified : 0,
                removed  : 0,
                total    : 0
            };
        }
    }

    addChangeCount (type, action, member) {
        let obj     = this[`${type}Count`],
            options = this.options,
            key     = options.countMasterKey;

        ++this.totalCount;

        ++obj[key][action];

        if (member) {
            let countTypes = options.countTypes,
                len = countTypes.length,
                i = 0;
            
            for (; i < len; i++) {
                let countType = countTypes[i],
                    flagFn = this.flagFns[countType];

                if (countType === key || !flagFn) {
                    return;
                }

                if (this[flagFn](member)) {
                    ++obj[countType][action];
                } 
            }
        }
    }

    exec () {
        let options    = this.options,
            categories = options.categories,
            len        = categories.length,
            i          = 0,
            changes    = {
                name : options.newData.name
            };
        
        for (; i < len; i++) {
            let {name} = categories[i];
            
            this.execMember(name, changes);
        }
        
        // fold class properties into changes
        this.execMember('classProps', changes, true);

        return changes;
    }

    getPropertyChanges () {
        let changes    = {},
            options    = this.options,
            newData    = options.newData,
            classProps = options.classProps,
            len        = classProps.length,
            i          = 0;
        
        let oldValue, newValue, obj;
        
        for (; i < len; i++) {
            let prop = classProps[i];
            
            oldValue = this.options.oldData[prop.name];
            newValue = this.options.newData[prop.name];

            if (newValue) {

                if (oldValue && newValue !== oldValue) {
                    obj = this.createChange('modified', this.options.newData);

                    if (!changes.modified) {
                        changes.modified = [];
                    }

                    changes.modified.push(obj);
                } else if (!oldValue ) {
                    obj = this.createChange('added', this.options.newData);

                    if (!changes.added) {
                        changes.added = [];
                    }

                    changes.added.push(obj);
                } else {
                    continue;
                }      

                obj.key = prop.name;
                obj.newValue = newValue;
                obj.oldValue = oldValue; 
            }
            else if (oldValue) {
                obj = this.createChange('removed', this.options.oldData);
                obj.key = prop.name;
                obj.oldValue = oldValue;

                if (!changes.removed) {
                    changes.removed = [];
                }

                changes.removed.push(obj);
            }
        }

        return changes;
    }

    execMember (type, changes, subType) {
        let members = !subType ? this.getChanges(type) : this.getPropertyChanges(),
            num     = 0,
            obj;

        if (members) {
            if (members.added) {
                obj = changes.added;

                if (!obj) {
                    obj = changes.added = {};
                }

                obj[type] = members.added;
                num++;
            }

            if (members.modified) {
                obj = changes.modified;

                if (!obj) {
                    obj = changes.modified = {};
                }

                obj[type] = members.modified;
                num++;
            }

            if (members.removed) {
                obj = changes.removed;

                if (!obj) {
                    obj = changes.removed = {};
                }

                obj[type] = members.removed;
                num++;
            }
        }
    }

    getItems (type) {
        let options = this.options;
        
        return {
            newMatches : Utils.getMatch('$type', type, options.newData.items),
            oldMatches : Utils.getMatch('$type', type, options.oldData.items)
        };
    }

    getChanges (type) {
        let options     = this.options,
            info        = this.getItems(type),
            num         = 0,
            typeChanges = {},
            dupMap      = {},
            newMatches  = info.newMatches,
            newItems    = newMatches && newMatches.items,
            oldMatches  = info.oldMatches,
            oldItems    = oldMatches && oldMatches.items;

        if (newItems && oldItems) {
            let len = newItems.length,
                i   = 0;
                
            for (; i < len; i++) {
                let newMatch = newItems[i],
                    {ignore, name} = newMatch;
                
                this.addChangeCount(type, 'total');

                if (ignore) {
                    this.log(`ignoring member ${options.newData.name} ${name}`, 'info');
                    this.log(newMatch);

                    this.addChangeCount(type, 'ignore');
                } else {
                    let dup = dupMap[name];

                    if (dup && typeof dup !== 'function') {
                        this.log(`duplicate found ${options.newData.name} ${name}`, 'error');
                        this.log(dup);
                        this.log(newMatch);

                        continue;
                    }

                    dupMap[name] = newMatch;

                    if (name) {
                        let oldMatch = Utils.getMatch('name', name, oldItems),
                            changes  = this.getItemChanges(newMatch, oldMatch),
                            arr, obj;

                        if (changes) {
                            let {action, items, newValue, oldValue, key} = changes;
                            
                            arr = typeChanges[action];

                            this.addChangeCount(type, action, newMatch);

                            if (!arr) {
                                arr = typeChanges[action] = [];
                            }

                            if (action === 'modified') {
                                obj = this.createChange(undefined, changes, newMatch);

                                if (items) {
                                    obj.items = items;
                                }

                                if (newValue || oldValue || key) {
                                    obj.key      = key;
                                    obj.newValue = newValue;
                                    obj.oldValue = oldValue;
                                }

                                arr.push(obj);
                            } else {
                                
                                obj = this.createChange(undefined, changes, newMatch);

                                arr.push(obj);
                            }

                            num++;
                        }
                    } else {
                        this.log('no name found' + this.options.newData.name, 'info');
                        this.log(newMatch);
                    }
                }
            }
            
            len = oldItems.length;
            i   = 0;
            
            for (; i < len; i++) {
                let oldMatch = oldItems[i],
                    {name, ignore} = oldMatch,
                    newMatch = Utils.getMatch('name', name, newItems),
                    arr, obj;

                if (!ignore && !newMatch) {
                    arr = typeChanges.removed;

                    this.addChangeCount(type, 'removed');

                    if (!arr) {
                        arr = typeChanges.removed = [];
                    }

                    obj = this.createChange(undefined, oldMatch);

                    arr.push(obj);

                    num++;
                }
            }
        }

        return num ? typeChanges : null;
    }

    isPrivateAccess (obj, currentObj) {
        obj = currentObj || obj;
        
        let {access} = obj;
        
        return access && access === 'private' ? true : false;
    }

    isDeprecated (obj, currentObj) {
        obj = currentObj || obj;
        return obj.deprecatedVersion ? true : false;
    }

    isClass (obj, currentObj) {
        obj = currentObj || obj;
        
        let {$type} = obj;
        
        return $type && $type === 'class' ? true : false;
    }

    getItemChanges (newObj, oldObj) {
        let info;

        if (oldObj) {
            let len = tests.length,
                i   = 0;
            
            for (; i < len; i++) {
                let test   = tests[i],
                    newVal = newObj[test],
                    oldVal = oldObj[test];

                if (!info && newVal !==oldVal) {
                    info = this.createChange('modified', newObj);

                    info.key      = test;
                    info.newValue = newVal;
                    info.oldValue = oldVal;
                }
            }

            let newItems = newObj.items;

            if (newItems) {
                len = newItems.length;
                i   = 0;
                
                for (; i < len; i++) {
                    let newItem = newItems[i],
                        oldItem = Utils.getMatch('name', newItem.name, oldObj.items);

                    if (oldItem) {
                        let changes = this.getItemChanges(newItem, oldItem);

                        if (changes) {
                            info = this.addChildChanges(info, 'modified', newObj, 'modified', changes);
                        }
                    } else {
                        info = this.addChildChanges(info, 'modified', newObj, 'added', [this.createChange('added', newItem)]);
                    }
                }
            }

            let oldItems = oldObj.items;

            if (oldItems) {
                len = oldItems.length;
                i   = 0;
                
                for (; i < len; i++) {
                    let oldItem = oldItems[i],
                        newItem = Utils.getMatch('name', oldItem.name, newObj.items);

                    if (!newItem) {
                        info = this.addChildChanges(info, 'modified', newObj, 'removed', [this.createChange('removed', oldItem)]);
                    }
                }
            }
        } else {
            info = this.createChange('added', newObj);
        }

        return info;
    }

    createChange (action, member, latest) {
        let obj = {
                action       : action,
                name         : member.name,
                $type        : member.$type
            },
            key, flagFn;
            
        let flagFns = this.flagFns,
            keys    = Object.keys(flagFns),
            len     = keys.length,
            i       = 0;
        
        for (; i < len; i++) {
            let key    = keys[i],
                flagFn = flagFns[key];
            
            obj[`is${_.capitalize(key)}`] = this[flagFn](member, latest);
        }

        return obj;
    }

    addChildChanges (info, action, member, childAction, changes) {
        if (!info) {
            info = this.createChange(action, member);
        }

        if (!info.items) {
            info.items = {};
        }

        if (!info.items[childAction]) {
            info.items[childAction] = [];
        }

        info.items[childAction] = info.items[childAction].concat(changes);

        return info;
    }
}

module.exports = Parser;
