Ext.define('DocsApp.view.mainApp.doc.DocController', {
    extend: 'Ext.app.ViewController',
    alias: 'controller.main-doc-controller',

    menuDelay: 200,
    menuCanClose: true,

    initViewModel: function (vm) {
        var me = this;

        me.callParent([vm]);

        vm.bind('{classFile}', function (classFile) {
            vm.set('allMembers', classFile.classMembers());
        });

        vm.bind('{configs}', function (store) {
            me.memberStoreBound(store, 'configs');
        });
        vm.bind('{properties}', function (store) {
            me.memberStoreBound(store, 'properties');
        });
        vm.bind('{methods}', function (store) {
            me.memberStoreBound(store, 'methods');
        });
        vm.bind('{events}', function (store) {
            me.memberStoreBound(store, 'events');
        });
    },

    memberStoreBound: function (store, type) {
        this.hideShowMemberInfo(store, type);
    },

    hideShowMemberInfo: function (store, type) {
        var empty = store.getCount() === 0;

        this.getView().lookupReference(type + 'Header').setVisible(!empty);
    },

    addFavorite: function (btn) {
        var view = this.getView(),
            className = view.getClassName(),
            store = view.up('mainapp-container').lookupReference('favoritesCombined').getStore(),
            rec = store.getById(className);

        if (!rec) {
            store.add({
                name: className,
                id: className,
                hash: '!/api/' + className,
                type: 'API docs'
            });
        }
    },

    onMemberClick: function (view, rec, el, i, e) {
        var expander = e.getTarget('.da-expander-toggle');

        if (expander) {
            Ext.fly(el).toggleCls('da-member-expanded');
            Ext.fly(expander).toggleCls('fa-compress');
        }
    },

    toggleMemberCollapse: function (button, pressed) {
        var items = this.getView().getEl().select('.da-member-item');

        items[pressed ? 'addCls' : 'removeCls']('da-member-expanded');

        button.setText(pressed ? 'Collapse All' : 'Expand All');
        button.setIconCls(pressed ? 'x-fa fa-compress' : 'x-fa fa-expand');
    },

    onMemberViewRefresh: function (dataview) {
        var store = dataview.getStore(),
            count, vm, ref;

        if (store.type === 'chained') {
            count = store.getCount();
            vm = this.getViewModel();
            ref = dataview.reference;

            if (!dataview.hasLoaded) {
                dataview.hasLoaded = true;
                vm.set(ref, count === 0);
            }
            vm.set(ref + 'Count', count);

            dataview.previousSibling().setHidden(!count);
        }
    },

    onFilterChange: function (field, val) {
        /*var memberViews = this.getView().query('main-member-dataview'),
            len = memberViews.length,
            i = 0,
            store = this.getViewModel().get('allMembers'),
            view, target, rawText, nodes, nodesLen, j;

        store.addFilter([{
            property: 'name',
            value: val,
            anyMatch: true
        }]);

        // highlight the portion of the member name matching the filter text
        for (; i < len; i++) {
            view = memberViews[i];
            nodes = view.getNodes();
            nodesLen = nodes.length;
            j = 0;

            for (; j < nodesLen; j++) {
                target = Ext.get(nodes[j]).down('.da-member-name');
                rawText = target.getHtml();

                if (val.length) {
                    target.setHtml(rawText.replace(new RegExp(val, 'i'), '<span class="da-member-name-highlighted">' + val + '</span>'));
                } else {
                    target.setHtml(Ext.util.Format.stripTags(rawText));
                }
            }
        }

        // hide / show the member section title based on whether any members were found by the filter
        this.lookupReference('classDescription').setHidden(val.length);*/
        this.doFilter();
    },

    onAccessFilterChange: Ext.Function.createBuffered(function () {
        /*var me = this,
        vm = me.getViewModel(),
            store = vm.get('allMembers'),
            cats = vm.get('catFilters') || {},
            filterId = 'catFilter';

        if (!store) {
            vm.bind('allMembers', me.onAccessFilterChange, me, {
                single: true
            });
            return;
        }

        store.addFilter({
            filterFn: function (item) {
                var access = item.get('access'),
                    itemInherited  = item.get('isInherited'),
                    itemDeprecated = item.get('deprecatedMessage'),
                    itemRemoved    = item.get('removedMessage'),
                    isPublic, isProtected, isPrivate, isInherited, isAccessor, isDeprecated, isRemoved;

                isPublic = (cats.public & !access);
                isProtected = (cats.protected & access === 'protected');
                isPrivate   = (cats.private & access === 'private');
                isInherited = (!itemInherited || cats.inherited == itemInherited) ? 1 : 0;
                //isAccessor = (cats.inherited & item.get('accessor'));
                isDeprecated = (!itemDeprecated || cats.deprecated == !!itemDeprecated) ? 1 : 0;
                isRemoved    = (!itemRemoved || cats.removed & !!itemRemoved) ? 1 : 0;

                return ((isPublic | isProtected | isPrivate) & isInherited & isDeprecated & isRemoved);
            },
            id      : filterId
        });*/
        var me = this,
            vm = me.getViewModel();

        if (!vm.get('allMembers')) {
            vm.bind('allMembers', me.onAccessFilterChange, me, {
                single: true
            });
            return;
        }

        me.doFilter();
    }, 10),

    doFilter: function () {
        /*var vm = this.getViewModel(),
            cats = vm.get('catFilters'),
            memberViews = this.getView().query('main-member-dataview'),
            len = memberViews.length,
            i = 0,
            prefix = 'da-class-member-',
            view, el;

        for (;i < len; i++) {
            view = memberViews[i];
            el = view.getEl();

            el.toggleCls(prefix + 'isPublic', cats.pub);
            el.toggleCls(prefix + 'isProtected', cats.prot);
            el.toggleCls(prefix + 'isPrivate', cats.pri);
            el.toggleCls(prefix + 'isInherited', cats.inherited);
            el.toggleCls(prefix + 'isDeprecated', cats.deprecated);
            el.toggleCls(prefix + 'isRemoved', cats.removed);
        }*/

        var vm          = this.getViewModel(),
            filterVal   = this.lookupReference('memberFilter').getValue() || '',
            cats        = vm.get('catFilters'),
            memberViews = this.getView().query('main-member-dataview'),
            len         = memberViews.length,
            i           = 0,
            view, store, count;

        for (;i < len; i++) {
            view  = memberViews[i];
            store = view.getStore();
            count = 0;

            Ext.suspendLayouts();
            store.each(function (item) {
                var node = Ext.get(view.getNode(item)),
                    name = item.get('name'),
                    access         = item.get('access'),
                    accessor       = item.get('accessor'),
                    itemInherited  = item.get('isInherited'),
                    itemAccessor   = item.get('accessor'),
                    itemDeprecated = item.get('deprecatedMessage'),
                    itemRemoved    = item.get('removedVersion'),
                    isMatched, isPublic, isProtected, isPrivate, isInherited, isAccessor, isDeprecated, isRemoved,
                    target, rawText;

                isMatched    = (filterVal.length === 0 | name.search(new RegExp(filterVal, 'i')) !== -1);
                isPublic     = (cats.pub & !access);
                isProtected  = (cats.pro & access === 'protected');
                isPrivate    = (cats.pri & access === 'private');
                isInherited  = (!itemInherited || cats.inherited == itemInherited) ? 1 : 0;
                isAccessor   = (!itemAccessor || cats.accessor & item.get('accessor'));
                isDeprecated = (!itemDeprecated || cats.deprecated == !!itemDeprecated) ? 1 : 0;
                isRemoved    = (!itemRemoved || cats.removed & !!itemRemoved) ? 1 : 0;

                target = node.down('.da-member-name');

                if (filterVal.length) {
                    target.setHtml(Ext.util.Format.stripTags(target.getHtml()));
                    rawText = target.getHtml();
                    target.setHtml(rawText.replace(new RegExp(filterVal, 'i'), '<span class="da-member-name-highlighted">' + filterVal + '</span>'));
                } else {
                    target.setHtml(Ext.util.Format.stripTags(target.getHtml()));
                }

                if ((isPublic | isProtected | isPrivate) & isMatched & isAccessor & isInherited & isDeprecated & isRemoved) {
                    node.show();
                    count++;
                } else {
                    node.setVisibilityMode(Ext.dom.Element.DISPLAY).hide();
                }
            });
            view.previousSibling().setHidden(!count);
            Ext.resumeLayouts(true);
        }
    },

    onMemberNavBtnClick: function (btn) {
        var targetEl = this.lookupReference(btn.target).getEl(),
            scroller = this.getView().getScrollable();

        scroller.scrollTo(0, -1);
        this.lookupReference('memberListMenu').hide();
        targetEl.scrollIntoView(scroller.getElement(), false, false, true);
    },

    onMemberMenuOver: function (btn) {
        this.menuCanClose = false;
    },

    onMemberMenuOut: function (btn) {
        this.menuCanClose = true;
    },

    hideMemberMenu: function () {
        var menu = this.lookupReference('memberListMenu'),
            canCLose = this.menuCanClose,
            btn = menu.listMenuBtn;

        menu.setHidden(canCLose);
        if (btn && canCLose) {
            btn.removeCls('da-class-member-nav-btn-active');
        }
    },

    onMemberMenuButtonRender: function (btn) {
        var me = this,
            btnEl = btn.getEl(),
            btnBorder = btnEl.getBorderWidth('b')
            doc = me.getView(),
            docEl = doc.getEl(),
            delay = me.menuDelay,
            memberListMenu = me.lookupReference('memberListMenu');

        btnEl.monitorMouseEnter(delay, function () {
            memberListMenu
                .setSize(doc.body.getWidth(), doc.body.getHeight() + (btn.ownerCt.ownerCt.getEl().getBottom() - btn.getEl().getBottom()))
                .showAt(docEl.getLocalX(), 0 - (btn.ownerCt.ownerCt.getEl().getBottom() - btn.getEl().getBottom()) - btnBorder - 1);

            me.lookupReference('memberListView').setBind({
                store: '{' + btn.relStore + '}'
            });
            me.getViewModel().notify();
            btn.addCls('da-class-member-nav-btn-active');

            if (memberListMenu.listMenuBtn && memberListMenu.listMenuBtn !== btn) {
                memberListMenu.listMenuBtn.removeCls('da-class-member-nav-btn-active');
            }
            memberListMenu.listMenuBtn = btn;
        });

        btn.getEl().monitorMouseLeave(me.menuDelay, me.hideMemberMenu, me);
    },

    onMemberListMenuRender: function (menu) {
        var me = this;

        menu.getEl().monitorMouseLeave(me.menuDelay, me.hideMemberMenu, me);

        menu.getEl().on({
            mouseenter: 'onMemberMenuOver',
            mouseleave: 'onMemberMenuOut'
        });
    },

    onMemberListItemClick: function (view, rec) {
        var type = rec.get('$type');
        type = (type === 'config') ? 'cfg' : type;
        this.lookupReference('memberListMenu').hide();
        this.redirectTo('#!/api/' + this.getView().getClassName() + '-' + type + '-' + rec.get('name'), true);
    }
});
