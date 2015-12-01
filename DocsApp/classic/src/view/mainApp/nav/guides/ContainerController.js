Ext.define('DocsApp.view.mainApp.nav.guides.ContainerController', {
    extend: 'Ext.app.ViewController',
    alias : 'controller.docsapp-mainapp-nav-guides-container',

    routes: {
        '!/guide:guide:heading': {
            action    : 'onGuide',
            conditions: {
                ':guide'  : '(?:(?:\/){1}([a-zA-Z0-0\/_]+))?',
                ':heading': '(?:(?:-){1}([a-zA-Z0-9_]+))?'
            }
        }
    },

    toggleExpandAll: function (btn) {
        var tree = this.lookupReference('topicalGuideTree'),
            expanded = btn.expanded;

        tree[expanded ? 'collapseAll' : 'expandAll']();
        btn.setText(expanded ? 'Expand All' : 'Collapse All');
        btn.expanded = !expanded;
    },

    onGuideFilterChange: function (field, newVal) {
        var tree = this.lookupReference('topicalGuideTree'),
            selected = tree.getSelectionModel().getSelection(),
            v;

        //tree.getStore().filterer = 'bottomup';
        tree.originalExpanded = tree.originalExpanded || [];

        if (!tree.originalExpanded.length) {
            tree.getRootNode().cascadeBy(function (node) {
                if (node.isExpanded()) {
                    tree.originalExpanded.push(node);
                }
            });
        }

        if (newVal.length) {
            v = new RegExp(newVal, 'i');
            Ext.suspendLayouts();
            tree.getStore().filter({
                filterFn: function(node) {
                    var children = node.childNodes,
                        len = children && children.length,

                        // Visibility of leaf nodes is whether they pass the test.
                        // Visibility of branch nodes depends on them having visible children.
                        visible = node.isLeaf() ? v.test(node.get('name')) : false,
                        i;

                    // We're visible if one of our child nodes is visible.
                    // No loop body here. We are looping only while the visible flag remains false.
                    // Child nodes are filtered before parents, so we can check them here.
                    // As soon as we find a visible child, this branch node must be visible.
                    for (i = 0; i < len && !(visible = children[i].get('visible')); i++);

                    return visible;
                },
                id: 'titleFilter'
            });
            tree.getRootNode().cascadeBy(function (node) {
                node[node.get('visible') ? 'expand' : 'collapse']();
            });

            Ext.resumeLayouts(true);
        } else {
            Ext.suspendLayouts();
            tree.getStore().clearFilter();
            tree.collapseAll();
            Ext.each(tree.originalExpanded, function (node) {
                node.expand();
            });
            tree.originalExpanded = [];
            Ext.resumeLayouts(true);
        }
        tree.getSelectionModel().select(selected);
    },

    onGuideClick: function (treeView, node) {
        var tabpanel, activeTab;

        if (node.isLeaf()) {
            tabpanel = this.getView().up('mainapp-container').lookupController().lookupReference('mainapp-tabpanel');
            activeTab = tabpanel.getActiveTab();
            if (activeTab.getGuidePath && activeTab.getGuidePath() === node.get('path')) {
                return;
            } else {
                //this.redirectTo('!/guide/' + node.get('path'));
                this.processClick(treeView, node);
            }
        }
    },

    onGuideDblClick: function (treeView, node) {
        var owner = this.getView().up('mainapp-container'),
            tabpanel, activeTab;

        if (node.isLeaf()) {
            tabpanel = this.getView().up('mainapp-container').lookupController().lookupReference('mainapp-tabpanel');
            activeTab = tabpanel.getActiveTab();
            if (activeTab.getGuidePath && activeTab.getGuidePath() === node.get('path')) {
                return;
            } else {
                owner.createTab = true;
                //this.redirectTo('!/guide/' + node.get('path'));
                this.processClick(treeView, node);
            }
        }
    },

    processClick: Ext.Function.createBuffered(function (treeView, node) {
        this.redirectTo('!/guide/' + node.get('path'), true);
    }, 260),

    onGuide: function (guide) {
        //http://localhost:1841/#!/guide/core_concepts/memory_management
        var store = Ext.getStore('guide.Topical'),
            path, node, tree;

        if (store.isLoaded()) {
            node = store.getRoot().findChildBy(function (node) {
                return node.isLeaf() && node.get('path') === guide;
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
            store.on('load', Ext.Function.bind(this.onGuide, this, [guide], false), this, {single: true});
        }
    },

    onFavoriteClick: function (view, rec, el, i, e) {
        if (e.getTarget('.x-grid-cell-inner-action-col')) {
            return;
        }
        this.redirectTo(rec.get('hash'));
    }
});
