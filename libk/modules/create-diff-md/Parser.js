'use strict';

const Utils  = require('../shared/Utils');
const debug  = require('./Debug');

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

class Parser {
    constructor (config) {
        let me = this;

        Utils.apply(me, config);

        me.totalCount = 0;
 
        me.flagFns = {
            private    : 'isPrivateAccess',
            deprecated : 'isDeprecated',
            class      : 'isClass'
        };       

        me.categories.forEach(function(category) {
            me.initCount(category.name)
        });
    }

    initCount (type) {
        var me = this;

        this[type + 'Count'] = {};

        this.countTypes.forEach(function(key) {
            me[type + 'Count'][key] = {
                added    : 0,
                modified : 0,
                removed  : 0,
                total    : 0
            }
        });
    }

    addChangeCount (type, action, member) {
        let me = this,
            obj = this[type + 'Count'],
            key = this.countMasterKey,
            flagFn;

        ++this.totalCount;

        ++obj[key][action];

        if (member) {
            this.countTypes.forEach(function(countType) {
                flagFn = me.flagFns[countType];

                if (countType===key || !flagFn) {
                    return;
                }

                if (me[flagFn](member)) {
                    ++obj[countType][action];
                }                
            });
        }
    }

    exec () {
        let me      = this,
            changes = {
                name : me.newData.name
            };

        me.categories.forEach(function(category) {
            me.execMember(category.name, changes);
        });
        // fold class properties into changes
        me.execMember('classProps', changes, true);

        return changes;
    }

    getPropertyChanges () {
        let me = this,
            changes = {},
            oldValue, newValue, obj;

        me.classProps.forEach(function(prop) {
            oldValue = me.oldData[prop.name];
            newValue = me.newData[prop.name];

            if (newValue) {

                if (oldValue && newValue !== oldValue) {
                    obj = me.createChange('modified', me.newData);

                    if (!changes.modified) {
                        changes['modified'] = [];
                    }

                    changes.modified.push(obj);
                } else if (!oldValue ) {
                    obj = me.createChange('added', me.newData);

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
                obj = me.createChange('removed', me.oldData);
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
            newMatches : Utils.getMatch('$type', type, this.newData.items),
            oldMatches : Utils.getMatch('$type', type, this.oldData.items)
        };
    }

    getChanges (type) {
        let me          = this,
            info        = this.getItems(type),
            num         = 0,
            typeChanges = {},
            dupMap      = {},
            newItems    = info.newMatches && info.newMatches.items,
            oldItems    = info.oldMatches && info.oldMatches.items;

        if (newItems && oldItems) {
            newItems.forEach(function(newMatch) {
                me.addChangeCount(type, 'total');

                if (newMatch.ignore) {
                    debug.info('ignoring member', me.newData.name, newMatch.name);
                    debug.log(newMatch);

                    me.addChangeCount(type, 'ignore');
                } else {
                    let dup = dupMap[newMatch.name];

                    if (dup && typeof dup !== 'function') {
                        debug.error('duplicate found', me.newData.name, newMatch.name);
                        debug.log(dup);
                        debug.log(newMatch);

                        return;
                    }

                    dupMap[newMatch.name] = newMatch;

                    if (newMatch.name) {
                        let oldMatch = Utils.getMatch('name', newMatch.name, oldItems),
                            changes  = me.getItemChanges(newMatch, oldMatch),
                            arr, obj;

                        if (changes) {
                            arr = typeChanges[changes.action];

                            me.addChangeCount(type, changes.action, newMatch);

                            if (!arr) {
                                arr = typeChanges[changes.action] = [];
                            }

                            if (changes.action === 'modified') {
                                obj = me.createChange(undefined, changes, newMatch);

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
                                
                                obj = me.createChange(undefined, changes, newMatch);

                                arr.push(obj);
                            }

                            num++;
                        }
                    } else {
                        debug.info('no name found', me.newData.name);
                        debug.log(newMatch);
                    }
                }
            });

            oldItems.forEach(function(oldMatch) {
                let newMatch = Utils.getMatch('name', oldMatch.name, newItems),
                    arr, obj;

                if (!oldMatch.ignore && !newMatch) {
                    arr = typeChanges.removed;

                    me.addChangeCount(type, 'removed');

                    if (!arr) {
                        arr = typeChanges.removed = [];
                    }

                    obj = me.createChange(undefined, oldMatch);

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
        let me = this,
            info, newVal, oldVal;

        if (oldObj) {
            tests.forEach(function(test) {
                newVal = newObj[test];
                oldVal = oldObj[test];

                if (!info && newVal !==oldVal) {
                    info = me.createChange('modified', newObj);

                    info.key      = test;
                    info.newValue = newVal;
                    info.oldValue = oldVal;
                }
            });

            if (newObj.items) {
                newObj.items.forEach(function(newItem) {
                    let oldItem = Utils.getMatch('name', newItem.name, oldObj.items);

                    if (oldItem) {
                        let changes = me.getItemChanges(newItem, oldItem);

                        if (changes) {
                            info = me.addChildChanges(info, 'modified', newObj, 'modified', changes);
                        }
                    } else {
                        info = me.addChildChanges(info, 'modified', newObj, 'added', [me.createChange('added', newItem)]);
                    }
                });
            }

            if (oldObj.items) {
                oldObj.items.forEach(function(oldItem) {
                    let newItem = Utils.getMatch('name', oldItem.name, newObj.items);

                    if (!newItem) {
                        info = me.addChildChanges(info, 'modified', newObj, 'removed', [me.createChange('removed', oldItem)]);
                    }
                });
            }
        } else {
            info = me.createChange('added', newObj);
        }

        return info;
    }

    createChange (action, member, latest) {
        let me = this,
            obj = {
                action       : action,
                name         : member.name,
                $type        : member.$type
            },
            key, flagFn;

        for (key in me.flagFns) {
            flagFn = me.flagFns[key];
            obj['is' + Utils.capitalize(key)] = me[flagFn](member, latest);
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
