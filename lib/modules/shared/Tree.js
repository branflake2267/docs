var Sort = require('./Sort');

function Tree(config) {
    if (config) {
        var name;

        for (name in config) {
            this[name] = config[name];
        }
    }
}

Tree.prototype.delimiter = '.';

Tree.prototype.fromArray = function(arr) {
    var me   = this,
        tree = {};

    arr.forEach(function(item) {
        me.parseNamespace(item.split(me.delimiter), tree, null, item);
    });

    return me.parseItems(tree);
};

Tree.prototype.parseNamespace = function(path, tree, last, item) {
    var current   = path.shift(),
        className = (last ? last + '.' : '') + current,
        node;

    if (current && !tree[current]) {
        //this is the directory node structure
        node = {
            name      : current,
            rawName   : current,
            className : className,
            children  : {}
        };

        if (this.nodeParser) {
            node = this.nodeParser(node, item);
        }

        if (!tree[current] || !tree[current].children) {
            tree[current] = node;
        }
    }

    if (path && path.length) {
        //has more child directories
        this.parseNamespace(path, tree[current].children, className, item);
    }
};

Tree.prototype.parseItems = function(obj) {
    var temp = [],
        name, value;

    for (name in obj) {
        value = obj[name];

        //only need to recurse if is an array and has a children array that isn't empty
        if (typeof value === 'object' && value.children && !value.children.length) {
            //removes the key names to be an index key
            value.children = this.parseItems(value.children);

            if (value.children.length) {
                value.leaf = false;
            } else {
                value.leaf = true;

                delete value.children;
            }
        } else {
            value.leaf = true;
        }

        temp.push(value);
    }

    return this.sortItems(temp);
};

Tree.prototype.sortItems = function(items) {
    var sorter = new Sort([
        'leaf',
        'rawName'
    ]);

    sorter.sort(items);

    return items;
};

module.exports = Tree;
