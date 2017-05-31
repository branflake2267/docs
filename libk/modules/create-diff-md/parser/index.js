/* jshint node: true */
'use strict';

const Base   = require('../../base'),
      Utils  = require('../../shared/Utils'),
      debug  = require('../../../Debug');

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

        options.categories.forEach((category) => {
            this.initCount(category.name)
        });
    }

    initCount (type) {
        this[type + 'Count'] = {};

        this.options.countTypes.forEach((key) => {
            this[type + 'Count'][key] = {
                added    : 0,
                modified : 0,
                removed  : 0,
                total    : 0
            }
        });
    }

    addChangeCount (type, action, member) {
        let obj = this[type + 'Count'],
            key = this.options.countMasterKey,
            flagFn;

        ++this.totalCount;

        ++obj[key][action];

        if (member) {
            this.options.countTypes.forEach((countType) => {
                flagFn = this.flagFns[countType];

                if (countType===key || !flagFn) {
                    return;
                }

                if (this[flagFn](member)) {
                    ++obj[countType][action];
                }                
            });
        }
    }

    exec () {
        let changes = {
                name : this.options.newData.name
            };

        this.options.categories.forEach((category) => {
            this.execMember(category.name, changes);
        });
        // fold class properties into changes
        this.execMember('classProps', changes, true);

        return changes;
    }

    getPropertyChanges () {
        let changes = {},
            oldValue, newValue, obj;

        this.options.classProps.forEach((prop) => {
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
                    return null;
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
        });

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
        return {
            newMatches : Utils.getMatch('$type', type, this.options.newData.items),
            oldMatches : Utils.getMatch('$type', type, this.options.oldData.items)
        };
    }

    getChanges (type) {
        let info        = this.getItems(type),
            num         = 0,
            typeChanges = {},
            dupMap      = {},
            newItems    = info.newMatches && info.newMatches.items,
            oldItems    = info.oldMatches && info.oldMatches.items;

        if (newItems && oldItems) {
            newItems.forEach((newMatch) => {
                this.addChangeCount(type, 'total');

                if (newMatch.ignore) {
                    this.log('ignoring member' + this.options.newData.name + newMatch.name, 'info');
                    //debug.info('ignoring member', this.options.newData.name, newMatch.name);
                    debug.log(newMatch);

                    this.addChangeCount(type, 'ignore');
                } else {
                    let dup = dupMap[newMatch.name];

                    if (dup && typeof dup !== 'function') {
                        debug.error('duplicate found', this.options.newData.name, newMatch.name);
                        debug.log(dup);
                        debug.log(newMatch);

                        return;
                    }

                    dupMap[newMatch.name] = newMatch;

                    if (newMatch.name) {
                        let oldMatch = Utils.getMatch('name', newMatch.name, oldItems),
                            changes  = this.getItemChanges(newMatch, oldMatch),
                            arr, obj;

                        if (changes) {
                            arr = typeChanges[changes.action];

                            this.addChangeCount(type, changes.action, newMatch);

                            if (!arr) {
                                arr = typeChanges[changes.action] = [];
                            }

                            if (changes.action === 'modified') {
                                obj = this.createChange(undefined, changes, newMatch);

                                if (changes.items) {
                                    obj.items = changes.items;
                                }

                                if (changes.newValue || changes.oldValue || changes.key) {
                                    obj.key      = changes.key;
                                    obj.newValue = changes.newValue;
                                    obj.oldValue = changes.oldValue;
                                }

                                arr.push(obj);
                            } else {
                                
                                obj = this.createChange(undefined, changes, newMatch);

                                arr.push(obj);
                            }

                            num++;
                        }
                    } else {
                        debug.info('no name found', this.options.newData.name);
                        debug.log(newMatch);
                    }
                }
            });

            oldItems.forEach((oldMatch) => {
                let newMatch = Utils.getMatch('name', oldMatch.name, newItems),
                    arr, obj;

                if (!oldMatch.ignore && !newMatch) {
                    arr = typeChanges.removed;

                    this.addChangeCount(type, 'removed');

                    if (!arr) {
                        arr = typeChanges.removed = [];
                    }

                    obj = this.createChange(undefined, oldMatch);

                    arr.push(obj);

                    num++;
                }
            });
        }

        return num ? typeChanges : null;
    }

    isPrivateAccess (obj, currentObj) {
        obj = currentObj || obj;
        return obj.access && obj.access === 'private' ? true : false;
    }

    isDeprecated (obj, currentObj) {
        obj = currentObj || obj;
        return obj.deprecatedVersion ? true : false;
    }

    isClass (obj, currentObj) {
        obj = currentObj || obj;
        return obj.$type && obj.$type === 'class' ? true : false;
    }

    getItemChanges (newObj, oldObj) {
        let info, newVal, oldVal;

        if (oldObj) {
            tests.forEach((test) => {
                newVal = newObj[test];
                oldVal = oldObj[test];

                if (!info && newVal !==oldVal) {
                    info = this.createChange('modified', newObj);

                    info.key      = test;
                    info.newValue = newVal;
                    info.oldValue = oldVal;
                }
            });

            if (newObj.items) {
                newObj.items.forEach((newItem) => {
                    let oldItem = Utils.getMatch('name', newItem.name, oldObj.items);

                    if (oldItem) {
                        let changes = this.getItemChanges(newItem, oldItem);

                        if (changes) {
                            info = this.addChildChanges(info, 'modified', newObj, 'modified', changes);
                        }
                    } else {
                        info = this.addChildChanges(info, 'modified', newObj, 'added', [this.createChange('added', newItem)]);
                    }
                });
            }

            if (oldObj.items) {
                oldObj.items.forEach((oldItem) => {
                    let newItem = Utils.getMatch('name', oldItem.name, newObj.items);

                    if (!newItem) {
                        info = this.addChildChanges(info, 'modified', newObj, 'removed', [this.createChange('removed', oldItem)]);
                    }
                });
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

        for (key in this.flagFns) {
            flagFn = this.flagFns[key];
            obj['is' + Utils.capitalize(key)] = this[flagFn](member, latest);
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
