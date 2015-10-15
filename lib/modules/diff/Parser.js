var debug = require('../../Debug'),
    Utils = require('./Utils');

var tests = [
    'access',
    'alias',
    'alternateClassNames',
    'constructor',
    'deprecatedVersion',
    'hide',
    'inheritdoc',
    'localDoc',
    'mixins',
    'optional',
    'preventable',
    'readonly',
    'requires',
    'static',
    'type',
    'uses',
    'value'
];

function Parser(newObj, oldObj) {
    this.newData = newObj;
    this.oldData = oldObj;
}

Parser.prototype.exec = function() {
    var me      = this,
        changes = {
            name : me.newData.name
        };

    me.execMember('configs',        changes);
    me.execMember('properties',     changes);
    me.execMember('methods',        changes);
    me.execMember('static-methods', changes);
    me.execMember('events',         changes);

    return changes;
};

Parser.prototype.execMember = function(type, changes) {
    var members = this.getChanges(type),
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
};

Parser.prototype.getItems = function(type) {
    return {
        newMatches : Utils.getMatch('$type', type, this.newData.items),
        oldMatches : Utils.getMatch('$type', type, this.oldData.items)
    };
};

Parser.prototype.getChanges = function(type) {
    var me          = this,
        info        = this.getItems(type),
        num         = 0,
        typeChanges = {},
        dupMap      = {},
        newItems    = info.newMatches && info.newMatches.items,
        oldItems    = info.oldMatches && info.oldMatches.items;

    if (newItems && oldItems) {
        newItems.forEach(function(newMatch) {
            if (newMatch.ignore) {
                debug.info('ignoring member', me.newData.name, newMatch.name);
                debug.log(newMatch);
            } else {
                var dup = dupMap[newMatch.name];

                if (dup && typeof dup !== 'function') {
                    debug.error('duplicate found', me.newData.name, newMatch.name);
                    debug.log(dup);
                    debug.log(newMatch);

                    return;
                }

                dupMap[newMatch.name] = newMatch;

                if (newMatch.name) {
                    var oldMatch = Utils.getMatch('name', newMatch.name, oldItems),
                        changes  = me.getItemChanges(newMatch, oldMatch),
                        arr, obj;

                    if (changes) {
                        arr = typeChanges[changes.action];

                        if (!arr) {
                            arr = typeChanges[changes.action] = [];
                        }

                        if (changes.action === 'modified') {
                            obj = {
                                name : changes.name
                            };

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
                            arr.push(changes.name);
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
            var newMatch = Utils.getMatch('name', oldMatch.name, newItems),
                arr;

            if (!newMatch) {
                arr = typeChanges.removed;

                if (!arr) {
                    arr = typeChanges.removed = [];
                }

                arr.push(oldMatch.name);

                num++;
            }
        });
    }

    return num ? typeChanges : null;
};

Parser.prototype.getItemChanges = function(newObj, oldObj) {
    var me = this,
        info;

    if (oldObj) {
        tests.forEach(function(test) {
            if (!info && newObj[test] !== oldObj[test]) {
                info = me.createChange('modified', newObj.name);

                info.key      = test;
                info.newValue = newObj[test];
                info.oldValue = oldObj[test];
            }
        });

        if (newObj.items) {
            newObj.items.forEach(function(newItem) {
                var oldItem = Utils.getMatch('name', newItem.name, oldObj.items);

                if (oldItem) {
                    var changes = me.getItemChanges(newItem, oldItem);

                    if (changes) {
                        info = me.addChildChanges(info, 'modified', newObj.name, 'modified', changes);
                    }
                } else {
                    info = me.addChildChanges(info, 'modified', newObj.name, 'added', [
                        newItem.name
                    ]);
                }
            });
        }

        if (oldObj.items) {
            oldObj.items.forEach(function(oldItem) {
                var newItem = Utils.getMatch('name', oldItem.name, newObj.items);

                if (!newItem) {
                    info = me.addChildChanges(info, 'modified', newObj.name, 'removed', [
                        oldItem.name
                    ]);
                }
            });
        }
    } else {
        info = {
            action : 'added',
            name   : newObj.name
        };
    }

    return info;
}

Parser.prototype.createChange = function(action, name) {
    return {
        action : action,
        name   : name
    };
};

Parser.prototype.addChildChanges = function(info, action, name, childAction, changes) {
    if (!info) {
        info = this.createChange(action, name);
    }

    if (!info.items) {
        info.items = {};
    }

    if (!info.items[childAction]) {
        info.items[childAction] = [];
    }

    info.items[childAction] = info.items[childAction].concat(changes);

    return info;
};

module.exports = Parser;
