Ext.define('DocsApp.view.mainApp.nav.guides.ContainerController', {
    extend: 'Ext.app.ViewController',
    alias: 'controller.docsapp-mainapp-nav-guides-container',

    routes: {
        '!/guide/:id' : 'onGuide'
    },

    expandAll: function() {
        var tree = this.lookupReference('topicalGuideTree');

        tree.expandAll();
    },

    onGuideClick: function(treeView, node) {
        if (node.isLeaf()) {
            this.redirectTo('!/guide/' + node.getId());
        }
    },

    onGuide: function(id) {
        var store = Ext.getStore('guide.Topical');

        if (store.isLoaded()) {
            var node = store.getNodeById(id),
                tree = this.lookupReference('topicalGuideTree');

            //expand the path and select the node
            tree.expandPath(node.getPath(), {
                select : true,
                focus: true
            });
        } else {
            store.on('load', Ext.Function.bind(this.onGuide, this, [id], false), this, {single: true});
        }
    }
});
