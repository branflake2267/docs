'use strict';

const Sort = require('./Sort');

class Tree {
    constructor (config) {
        if (config) {
            let name;

            for (name in config) {
                this[name] = config[name];
            }
        }
    }

    get delimiter () {
        return '.';
    }

    fromArray (arr) {
        let me   = this,
            tree = {};

        arr.forEach(function(item) {
            me.parseNamespace(item.split(me.delimiter), tree, null, item);
        });

        return me.parseItems(tree);
    }

    parseNamespace (path, tree, last, item) {
        let current   = path.shift(),
            className = (last ? last + '.' : '') + current,
            node;

        if (current && !tree[current]) {
            //this is the directory node structure
            node = {
                name      : current.replace(/-\d+$/,''),
                href      : current,
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
    }

    parseItems (obj) {
        let temp = [],
            name, value;

        let me = this;

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

            if (value.href && (value.leaf || value.type === 'singleton')) {
                //path.relative(guideDir, me.destination + '/js') + '/',
                value.href = value.className;
            }

            temp.push(value);
        }

        return this.sortItems(temp);
    }

    sortItems (items) {
        let sorter = new Sort([
            'leaf',
            'name'
        ]);

        sorter.sort(items);

        return items;
    }
}

module.exports = Tree;
