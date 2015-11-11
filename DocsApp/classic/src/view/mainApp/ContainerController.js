Ext.define('DocsApp.view.mainApp.ContainerController', {
    extend: 'Ext.app.ViewController',
    alias : 'controller.docsapp-mainapp-container',

    routes: {
        '!/guide:guide:heading': {
            action    : 'onGuide',
            conditions: {
                ':guide'  : '(?:(?:\/){1}([a-z_]+))?',
                ':heading': '(?:(?:-){1}([a-z_]+))?'
            }
        },
        '!/api:cls:type:member': {
            action    : 'onApi',
            conditions: {
                ':cls'   : '(?:(?:\/){1}([A-Za-z.]+))?',
                ':type'  : '(?:(?:-){1}([a-z]+))?',
                ':member': '(?:(?:-){1}([A-Za-z]+))?'
            }
        }
    },

    onMainAppAfterrender: function () {
    },

    onGuide: function (guide, heading) {
        var me = this,
            store = Ext.getStore('guide.Topical'),
            node, id, tabpanel, tab;

        if (store.isLoaded()) {
            node = store.getRoot().findChildBy(function (node) {
                return node.isLeaf() && node.get('slug') === guide;
            }, me, true);

            if (!node) {
                return;
            }

            id = node.get('id');
            tabpanel = this.lookupReference('mainapp-tabpanel');
            tab      = tabpanel.child('[guideId=' + id + ']');

            tabpanel.suspendLayouts();

            if (!tab) {
                tab = tabpanel.add({
                    xtype  : 'mainapp-guide-view',
                    guideId: id
                });
            }

            if (heading) {
                me.focusHeader(tab, id, heading);
            }

            tabpanel.setActiveItem(tab);
            tabpanel.resumeLayouts(true);
        } else {
            store.on('load', Ext.Function.bind(this.onGuide, this, [guide, heading], false), this, {single: true});
        }
    },

    focusHeader: function (tab, id, heading) {
        var el, header, scroller;

        if (tab.rendered) {
            if (tab.html) {
                el = tab.getEl();
                header = el.down('#' + id.replace(/_-_/g, '-_-') + '_-_' + heading);
                // core_concepts-_-memory_management_-_framework_level_leaks   HEADER ID
                // core_concepts_-_memory_management_-_framework_level_leaks   TREE ID + HEADER
                if (header) {
                    scroller = tab.getScrollable();
                    scroller.scrollTo(0, -1);
                    header.scrollIntoView(scroller.getElement(), false, false, true);
                }
            } else {
                tab.on({
                    loaded: this.focusHeader,
                    single: true,
                    args: [tab, id, heading]
                });
            }
            //console.log(tab.getEl());
        } else {
            tab.on('afterrender', this.focusHeader, this, {
                single: true,
                args: [tab, id, heading]
            });
        }
    },

    onApi: function (cls, type, member) {
        var store = Ext.getStore('doc.Package');

        if (cls && store.isLoaded()) {
            var node = store.findNode('className', cls),
                tabpanel, tab, memberStore;

            if (!node) {
                Ext.Msg.alert(cls + ' class not found.');
                return;
            }

            tabpanel = this.lookupReference('mainapp-tabpanel');
            tab      = tabpanel.child('[className=' + cls + ']');

            tabpanel.suspendLayouts();

            if (!tab) {
                tab = tabpanel.add({
                    xtype      : 'mainapp-doc-view',
                    className  : cls,
                    memberType : type,
                    focusMember: member
                });
            }

            if (type) {
                tab.setMemberType(type);
            }

            if (member) {
                tab.setFocusMember(member);
            }

            //memberStore = tab.lookupViewModel().get('allMembers');

            if (type) {
                this.focusMember(tab, type, member);
            }

            tabpanel.setActiveItem(tab);
            tabpanel.resumeLayouts(true);
        } else {
            store.on('load', Ext.Function.bind(this.onApi, this, [cls, type, member], false), this, {single: true});
        }
    },

    focusMember: function (tab, type, member) {
        var me   = this,
            view = tab.lookupReference('member' + Ext.String.capitalize(type || '')),
            store, scroller, rec, target;

        if (view) {
            if (view.rendered) {
                store = view.getStore();
                if (store.type == 'chained') {
                    if (member) {
                        rec    = store.findRecord('name', member);
                        target = Ext.fly(target = view.getNode(rec));
                    } else {
                        target = view.prev().getEl();
                    }
                    scroller = tab.getScrollable();
                    scroller.scrollTo(0, -1);
                    Ext.on({
                        idle  : function () {
                            target.scrollIntoView(scroller.getElement(), false, false, true);
                        },
                        single: true
                    });
                } else {
                    tab.lookupViewModel().bind(view.initialConfig.bind, function (a) {
                        me.focusMember(tab, type, member);
                    }, me);
                }
            } else {
                view.on('boxready', me.focusMember, me, {
                    single: true,
                    args  : [tab, type, member]
                });
            }
        }
    },

    onTabChange: function (tabpanel, newTab) {
        var route = newTab.getRoute ? newTab.getRoute() : null;

        if (route) {
            this.redirectTo(route);
        }
    },

    onFavoriteClick: function (view, rec, el, i, e) {
        if (e.getTarget('.x-grid-cell-inner-action-col')) {
            return;
        }
        this.redirectTo(rec.get('hash'));
    }
});
