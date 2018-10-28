Ext.define('DocsApp.view.mainApp.ContainerController', {
    extend: 'Ext.app.ViewController',
    alias : 'controller.docsapp-mainapp-container',

    routes: {
        '!/guide:guide:heading': {
        //'!/guide:guide': {
            action    : 'onGuide',
            conditions: {
                ':guide'  : '(?:(?:\/){1}([a-zA-Z0-0\/_]+))?',
                ':heading': '(?:(?:-){1}([a-zA-Z0-9_]+))?'
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
        //http://localhost:1841/#!/guide/core_concepts/memory_management
        var me = this,
            store = Ext.getStore('guide.Topical'),
            view = me.getView(),
            createTab = view.createTab,
            reuseDoc, node, id, tabpanel, tab, insert;

        if (store.isLoaded()) {
            node = store.getRoot().findChildBy(function (node) {
                return node.isLeaf() && node.get('path') === guide;
            }, me, true);

            if (!node) {
                return;
            }

            id       = node.get('path');
            tabpanel = this.lookupReference('mainapp-tabpanel');
            tab      = tabpanel.child('[guidePath=' + id + ']');

            tabpanel.suspendLayouts();

            // if we're to recycle the tab
            if (!createTab) {
                tab = tab || tabpanel.child('mainapp-guide-view[recycle=true]');
                reuseDoc = tabpanel.child('mainapp-doc-view[recycle=true]');
                if (reuseDoc) {
                    reuseDoc.tab.hide();
                }
            }

            if (tab && createTab) {
                tab.recycle = false;
                tab.tab.setClosable(true);
            }

            if (!tab) {
                insert = createTab ? tabpanel.items.getCount() : 1;
                tab = tabpanel.insert(insert, {
                    xtype       : 'mainapp-guide-view',
                    recycle     : !createTab,
                    guidePath   : id,
                    focusHeading: heading,
                    closable    : createTab
                });
            }

            if (heading) {
                me.focusHeader(tab, id, heading);
            }

            tabpanel.setActiveItem(tab).tab.show();
            tabpanel.resumeLayouts(true);

            view.createTab = false;
        } else {
            store.on('load', Ext.Function.bind(this.onGuide, this, [guide, heading], false), this, {single: true});
        }
    },

    focusHeader: function (tab, path, heading) {
        var el, header, scroller;

        if (tab.rendered) {
            if (tab.html) {
                el = tab.getEl();
                header = el.down('#' + path.replace(/\//g, '-_-') + '_-_' + heading);

                if (header) {
                    scroller = tab.getScrollable();
                    scroller.scrollTo(0, -1);
                    header.scrollIntoView(scroller.getElement(), false, false, true);
                    scroller.getElement().scrollBy(0, -15, false);
                }
            } else {
                tab.on({
                    loaded: this.focusHeader,
                    single: true,
                    args: [tab, path, heading]
                });
            }
        } else {
            tab.on('afterrender', this.focusHeader, this, {
                single: true,
                args: [tab, path, heading]
            });
        }
    },

    onApi: function (cls, type, member) {
        var store = Ext.getStore('doc.Package');

        if (cls && store.isLoaded()) {
            var node = store.findNode('className', cls),
                view = this.getView(),
                createTab = view.createTab,
                reuseDoc, tabpanel, tab, insert;

            if (!node) {
                Ext.Msg.alert(cls + ' class not found.');
                view.createTab = false;
                return;
            }

            tabpanel = this.lookupReference('mainapp-tabpanel');
            tab      = tabpanel.child('[className=' + cls + ']');

            tabpanel.suspendLayouts();

            // if we're to recycle the tab
            if (!createTab) {
                tab = tab || tabpanel.child('mainapp-doc-view[recycle=true]');
                reuseDoc = tabpanel.child('mainapp-guide-view[recycle=true]');
                if (reuseDoc) {
                    reuseDoc.tab.hide();
                }
            }

            if (tab && createTab) {
                tab.recycle = false;
                tab.tab.setClosable(true);
            }

            if (!tab) {
                insert = createTab ? tabpanel.items.getCount() : 1;
                tab = tabpanel.insert(insert, {
                    xtype      : 'mainapp-doc-view',
                    recycle    : !createTab,
                    className  : cls,
                    memberType : type,
                    focusMember: member,
                    closable   : createTab
                });
            }

            if (tab.className !== cls) {
                tab.setClassName(cls);
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

            tabpanel.setActiveItem(tab).tab.show();
            tabpanel.resumeLayouts(true);

            view.createTab = false;
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
                        target = Ext.get(target = view.getNode(rec));
                    } else {
                        target = view.prev().getEl();
                    }
                    scroller = tab.getScrollable();
                    Ext.on({
                        idle: function () {
                            scroller.scrollTo(0, -1);
                            target.scrollIntoView(scroller.getElement(), false, false, true);
                        },
                        delay: 1,
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