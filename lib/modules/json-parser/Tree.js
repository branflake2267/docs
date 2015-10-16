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
        me.parseNamespace(item.split(me.delimiter), tree, item);
    });

    return me.parseItems(tree);
};

Tree.prototype.parseNamespace = function(path, tree, item) {
    var current = path.shift(),
        node;

    if (current) {
        //this is the directory node structure
        node = {
            name     : this.nodeParser ? this.nodeParser(current, item) : current,
            children : {}
        };

        if (!tree[current] || !tree[current].children) {
            tree[current] = node;
        }
    }

    if (path && path.length) {
        //has more child directories
        this.parseNamespace(path, tree[current].children, item);
    }
};

Tree.prototype.parseItems = function(obj) {
    var temp = [],
        name, value;

    for (name in obj) {
        if (obj.hasOwnProperty(name)) {
            value = obj[name];

            //only need to recurse if is an array and has a children array that isn't empty
            if (typeof value === 'object' && value.children && !value.children.length) {
                //removes the key names to be an index key
                value.children = this.parseItems(value.children);
            }

            temp.push(value);
        }
    }

    return temp;
};

module.exports = Tree;
