Ext.define('DocsApp.view.mainApp.doc.DocController', {
    extend: 'Ext.app.ViewController',
    alias: 'controller.main-doc-controller',

    menuDelay: 200,
    menuCanClose: true,

    initViewModel: function (vm) {
        var me = this;

        me.callParent([vm]);

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
        store.on({
            // we'll update the member list / count on the member type button / tab
            // on each filter call
            datachanged: function () {
                // show the member count / members on the type tab / button used for nav
            }
        });
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
        var memberViews = this.getView().query('main-member-dataview'),
            len = memberViews.length,
            i = 0,
            view, store, target, rawText, nodes, nodesLen, j;

        this.getViewModel().getStore('allMembers').addFilter([{
            property: 'name',
            value: val,
            anyMatch: true
        }]);

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

        this.lookupReference('classDescription').setHidden(val.length);
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
            view = this.lookupReference('memberListView');
        menu.setHidden(this.menuCanClose);
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
                .setSize(docEl.getWidth(), Ext.getBody().getHeight() - btn.getEl().getBottom() + btnBorder)
                .showAt(docEl.getLocalX(), btnEl.getBottom() - btn.ownerCt.getEl().getBottom() - btnBorder);

            me.lookupReference('memberListView').setBind({
                store: '{' + btn.relStore + '}'
            });
            me.getViewModel().notify();
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
