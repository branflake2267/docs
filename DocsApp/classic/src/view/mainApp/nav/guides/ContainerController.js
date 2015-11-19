Ext.define('DocsApp.view.mainApp.nav.guides.ContainerController', {
    extend: 'Ext.app.ViewController',
    alias : 'controller.docsapp-mainapp-nav-guides-container',

    routes: {
        '!/guide:guide:heading': {
            action    : 'onGuide',
            conditions: {
                ':guide'  : '(?:(?:\/){1}([a-z_-]+))?',
                ':heading': '(?:(?:-){1}([a-z_]+))?'
            }
        }
    },

    expandAll: function () {
        var tree = this.lookupReference('topicalGuideTree');

        tree.expandAll();
    },

    onGuideClick: function (treeView, node) {
        if (node.isLeaf()) {
            //this.redirectTo('!/guide/' + node.getId());
            this.redirectTo('!/guide/' + node.get('slug'));
        }
    },

    onGuide: function (guide, heading) {
        var store = Ext.getStore('guide.Topical'),
            node, tree;
        
        if (store.isLoaded()) {
            node = store.getRoot().findChildBy(function (node) {
                return node.isLeaf() && node.get('slug') === guide;
            }, this, true);

            if (!node) {
                return;
            }

            tree = this.lookupReference('topicalGuideTree');

            //expand the path and select the node
            tree.expandPath(node.getPath(), {
                select: true,
                focus : true
            });
        } else {
            store.on('load', Ext.Function.bind(this.onGuide, this, [guide, heading], false), this, {single: true});
        }
    },

    onFavoriteClick: function (view, rec, el, i, e) {
        if (e.getTarget('.x-grid-cell-inner-action-col')) {
            return;
        }
        this.redirectTo(rec.get('hash'));
    }
});
