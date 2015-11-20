Ext.define('DocsApp.view.mainApp.doc.View', {
    extend: 'Ext.panel.Panel',
    xtype : 'mainapp-doc-view',

    requires: [
        'DocsApp.view.mainApp.doc.MemberDataview',
        'DocsApp.view.button.BadgeButton',
        'DocsApp.view.mainApp.doc.MemberListMenu',
        'DocsApp.view.mainApp.doc.DocController',
        'DocsApp.view.mainApp.doc.DocModel'
    ],

    config: {
        className  : null,
        memberType : null,
        focusMember: null
    },

    viewModel : 'mainapp-docmodel',
    controller: 'main-doc-controller',

    iconCls   : 'x-fa fa-code',
    scrollable: true,

    layout  : 'anchor',
    defaults: {
        anchor: '100%'
    },

    dockedItems: [{
        xtype: 'toolbar',
        dock : 'top',
        items: [{
            iconCls: 'x-fa fa-star',
            ui: 'favorite',
            handler: 'addFavorite'
        }, {
            xtype : 'container',
            layout: 'vbox',
            items : [{
                xtype: 'component',
                bind : '{classFile.name}',
                cls  : 'da-class-name'
            }, {
                xtype : 'component',
                margin: '0 0 0 12',
                //bind: '{daAlias}'
                bind  : {
                    data: '{classFile}'
                },
                tpl   : new Ext.XTemplate('{[this.aliasOut(values)]}', {
                    aliasOut: function (values) {
                        var alias = values.alias,
                            isWidget;

                        if (alias) {
                            isWidget = alias.indexOf('widget.') === 0;
                            return isWidget ? '<span data-qtip="alias: ' + alias + '">xtype: ' + alias.substr(7) + '</span>' : 'alias: ' + alias;
                        }

                        return '';
                    }
                })
            }]
        }, {
            xtype   : 'container',
            flex    : 1,
            layout  : 'hbox',
            defaults: {
                xtype    : 'badgebutton',
                ui       : 'default-toolbar',
                margin   : 10,
                handler  : 'onMemberNavBtnClick',
                listeners: {
                    afterrender: 'onMemberMenuButtonRender',
                    mouseover  : 'onMemberMenuOver',
                    mouseout   : 'onMemberMenuOut'
                }
            },
            items   : [{
                text   : 'Configs',
                //relStore: 'configs',
                viewRef: 'memberCfg',
                target : 'configsHeader',
                bind   : {
                    hidden: '{memberCfg}',
                    badge : '{memberCfgCount}'
                }
            }, {
                text   : 'Properties',
                //relStore: 'properties',
                viewRef: 'memberProperty',
                target : 'propertiesHeader',
                bind   : {
                    hidden: '{memberProperty}',
                    badge : '{memberPropertyCount}'
                }
            }, {
                text   : 'Methods',
                //relStore: 'methods',
                viewRef: 'memberMethod',
                target : 'methodsHeader',
                bind   : {
                    hidden: '{memberMethod}',
                    badge : '{memberMethodCount}'
                }
            }, {
                text   : 'Events',
                //relStore: 'events',
                viewRef: 'memberEvent',
                target : 'eventsHeader',
                bind   : {
                    hidden: '{memberEvent}',
                    badge : '{memberEventCount}'
                }
            }, {
                text   : 'CSS Vars',
                //relStore: 'themevars',
                viewRef: 'memberCss_var',
                target : 'cssVarHeader',
                bind   : {
                    hidden: '{memberCss_var}',
                    badge : '{memberCss_varCount}'
                }
            }, {
                text   : 'CSS Mixins',
                //relStore: 'thememixins',
                viewRef: 'memberCss_mixin',
                target : 'cssMixinHeader',
                bind   : {
                    hidden: '{memberCss_mixin}',
                    badge : '{memberCss_mixinCount}'
                }
            }]
        }, {
            xtype    : 'mainapp-member-filter-picker',
            bind: {
                value: '{memberFilter}',
                hidden: '{!memberFilterDocked}'
            },
            listeners: {
                change: 'onFilterChange',
                buffer: 100
            }
        }, {
            enableToggle : true,
            text         : 'Expand All',
            iconCls      : 'x-fa fa-expand',
            width        : 110,
            toggleHandler: 'toggleMemberCollapse'
        }]
    }, {
        xtype   : 'toolbar',
        dock    : 'right',
        cls: 'da-class-categories-ct',
        bind: {
            hidden: '{memberFilterDocked}'
        },
        defaults: {
            anchor: '100%',
            xtype : 'checkboxfield'
        },
        items   : [{
            xtype    : 'textfield',
            bind: '{memberFilter}',
            emptyText: 'filter members...',
            triggers : {
                clear: {
                    cls    : 'x-form-clear-trigger',
                    handler: function () {
                        this.reset();
                    }
                }
            },
            listeners: {
                change: 'onFilterChange',
                buffer: 100
            }
        }, '-', {
            fieldLabel: 'Public',
            bind      : '{catFilters.pub}',
            margin: '0 0 0 5',
            listeners : {
                change: 'onAccessFilterChange'
            }
        }, {
            fieldLabel: 'Protected',
            bind      : '{catFilters.prot}',
            margin: '0 0 0 5',
            listeners : {
                change: 'onAccessFilterChange'
            }
        }, {
            fieldLabel: 'Private',
            bind      : '{catFilters.pri}',
            margin: '0 0 0 5',
            listeners : {
                change: 'onAccessFilterChange'
            }
        }, {
            xtype: 'tbseparator'
        }, {
            fieldLabel: 'Inherited',
            bind      : '{catFilters.inherited}',
            margin: '0 0 0 5',
            listeners : {
                change: 'onAccessFilterChange'
            }
        }, {
            fieldLabel: 'Accessor',
            bind      : '{catFilters.accessor}',
            margin: '0 0 0 5',
            listeners : {
                change: 'onAccessFilterChange'
            }
        }, {
            fieldLabel: 'Deprecated',
            bind      : '{catFilters.deprecated}',
            margin: '0 0 0 5',
            listeners : {
                change: 'onAccessFilterChange'
            }
        }, {
            fieldLabel: 'Removed',
            bind      : '{catFilters.removed}',
            margin    : '0 0 0 5',
            listeners : {
                change: 'onAccessFilterChange'
            }
        }, {
            xtype: 'tbseparator'
        }, {
            xtype: 'button',
            text : 'Hide Filter Menu',
            ui: 'default',
            iconCls: 'x-fa fa-arrow-circle-o-up',
            handler: 'toggleFilterMenuDocked'
        }]
    }],

    items: [{
        // floating, reusable ct for the list of members that shows below the member type button on hover
        xtype    : 'memberlistmenu',
        reference: 'memberListMenu',
        listeners: {
            afterrender: 'onMemberListMenuRender'
        }
    }, {
        // the class description and hierarchy view (class metadata)
        xtype      : 'panel',
        reference  : 'classDescription',
        bodyPadding: '0 20 20 20',
        bind       : {
            data: '{classFile}'
        },
        //tpl        : '{[marked(values.text, { addHeaderId: false })]}',
        tpl        : new Ext.XTemplate(
            '<div class="da-class-meta-ct">',
                '<tpl if="alternateClassNames">',
                    '<div class="ad-class-meta-header ad-class-meta-header-top">Alternate Class Names</div>',
                    '<div class="da-class-meta-list-body">',
                        '{[this.splitItems(values, "alternateClassNames")]}',
                    '</div>',
                '</tpl>',
                '<tpl if="mixins">',
                    '<div class="ad-class-meta-header">Mixins</div>',
                    '<div class="da-class-meta-list-body">',
                        '{[this.splitItems(values, "mixins")]}',
                    '</div>',
                '</tpl>',
                '<tpl if="requires">',
                    '<div class="ad-class-meta-header">Requires</div>',
                    '<div class="da-class-meta-list-body">',
                        '{[this.splitItems(values, "requires")]}',
                    '</div>',
                '</tpl>',
            '</div>',
            '{[marked(values.text, { addHeaderId: false })]}',
            {
                splitItems: function (values, node) {
                    var arr = values[node].split(','),
                        len = arr.length,
                        i = 0;

                    for (;i < len; i++) {
                        arr[i] = this.makeLinks(arr[i]);
                    }

                    return arr.join('<br>');
                },
                makeLinks: function (link) {
                    link      = link.replace(/\|/g, '/');
                    var links = link.split('/'),
                        len   = links.length,
                        out   = [],
                        i     = 0,
                        root, rec;

                    //this.classStore = this.classStore || me.up('mainapp-container').down('mainapp-nav-docs-container').lookupReference('packageDocTree').getStore();
                    this.classStore = this.classStore || Ext.ComponentQuery.query('mainapp-container')[0].down('mainapp-nav-docs-container').lookupReference('packageDocTree').getStore();
                    root            = this.classStore.getRoot();

                    for (; i < len; i++) {
                        rec = root.findChild('className', links[i].replace(/\[\]/g, ''), true);
                        if (rec) {
                            out.push(('<a href="#!/api/' + links[i] + '">' + links[i] + '</a>').replace('[]', ''));
                        } else {
                            out.push(links[i]);
                        }
                    }

                    return out.join('/');
                }
            }
        ),
        /*dockedItems: [{
            xtype: 'toolbar',
            scrollable: true,
            dock: 'right',
            //width: 400,
            cls: 'da-class-meta-ct',
            resizable: {
                handles: 'w'
            },
            //bind : '{classFile}',
            //tpl  :
            items: [{
                xtype: 'component',
                bind : '{classFile}',
                tpl: new Ext.XTemplate(
                    '<tpl if="alternateClassNames">',
                    '<div class="ad-class-meta-header ad-class-meta-header-top">Alternate Class Names</div><div class="da-class-meta-list-body">{[this.splitItems(values, "alternateClassNames")]}</div>',
                    '</tpl>',
                    '<tpl if="mixins">',
                    '<div class="ad-class-meta-header">Mixins</div><div class="da-class-meta-list-body">{[this.splitItems(values, "mixins")]}</div>',
                    '</tpl>',
                    '<tpl if="requires">',
                    '<div class="ad-class-meta-header">Requires</div><div class="da-class-meta-list-body">{[this.splitItems(values, "requires")]}</div>',
                    '</tpl>',
                    {
                        splitItems: function (values, node) {
                            var arr = values[node].split(','),
                                len = arr.length,
                                i = 0;

                            for (;i < len; i++) {
                                arr[i] = this.makeLinks(arr[i]);
                            }

                            return arr.join('<br>');
                        },
                        makeLinks: function (link) {
                            link      = link.replace(/\|/g, '/');
                            var links = link.split('/'),
                                len   = links.length,
                                out   = [],
                                i     = 0,
                                root, rec;

                            //this.classStore = this.classStore || me.up('mainapp-container').down('mainapp-nav-docs-container').lookupReference('packageDocTree').getStore();
                            this.classStore = this.classStore || Ext.ComponentQuery.query('mainapp-container')[0].down('mainapp-nav-docs-container').lookupReference('packageDocTree').getStore();
                            root            = this.classStore.getRoot();

                            for (; i < len; i++) {
                                rec = root.findChild('className', links[i].replace(/\[\]/g, ''), true);
                                if (rec) {
                                    out.push(('<a href="#!/api/' + links[i] + '">' + links[i] + '</a>').replace('[]', ''));
                                } else {
                                    out.push(links[i]);
                                }
                            }

                            return out.join('/');
                        }
                    }
                )
            }]
        }]*/
    }, {
        xtype: 'component',
        reference: 'classEmptyText'

        // CONFIGS
    }, {
        xtype    : 'component',
        cls      : 'da-class-member-section-header',
        reference: 'configsHeader',
        html     : 'Configs',
        hidden   : true
    }, {
        xtype    : 'main-member-dataview',
        reference: 'memberCfg',
        bind     : '{configs}',
        listeners: {
            refresh: 'onMemberViewRefresh'
        }

        // PROPERTIES
    }, {
        xtype    : 'component',
        cls      : 'da-class-member-section-header',
        reference: 'propertiesHeader',
        html     : 'Properties',
        hidden   : true
    }, {
        xtype    : 'main-member-dataview',
        reference: 'memberProperty',
        bind     : '{properties}',
        listeners: {
            refresh: 'onMemberViewRefresh'
        }

        // METHODS
    }, {
        xtype    : 'component',
        cls      : 'da-class-member-section-header',
        reference: 'methodsHeader',
        html     : 'Methods',
        hidden   : true
    }, {
        xtype    : 'main-member-dataview',
        reference: 'memberMethod',
        bind     : '{methods}',
        listeners: {
            refresh: 'onMemberViewRefresh'
        }

        // EVENTS
    }, {
        xtype    : 'component',
        cls      : 'da-class-member-section-header',
        reference: 'eventsHeader',
        html     : 'Events',
        hidden   : true
    }, {
        xtype    : 'main-member-dataview',
        reference: 'memberEvent',
        bind     : '{events}',
        listeners: {
            refresh: 'onMemberViewRefresh'
        }

        // VARS
    }, {
        xtype    : 'component',
        cls      : 'da-class-member-section-header',
        reference: 'cssVarHeader',
        html     : 'Theme Vars',
        hidden   : true
    }, {
        xtype    : 'main-member-dataview',
        reference: 'memberCss_var',
        bind     : '{themevars}',
        listeners: {
            refresh: 'onMemberViewRefresh'
        }

        // MIXINS
    }, {
        xtype    : 'component',
        cls      : 'da-class-member-section-header',
        reference: 'cssMixinHeader',
        html     : 'Theme Mixins',
        hidden   : true
    }, {
        xtype    : 'main-member-dataview',
        reference: 'memberCss_mixin',
        bind     : '{thememixins}',
        listeners: {
            refresh: 'onMemberViewRefresh'
        }
    }],

    updateClassName: function (name) {
        if (name) {
            this.setTitle(name);

            this.getViewModel().linkTo('classFile', {
                type: 'Class',
                id  : name
            });
        }
    },

    getRoute: function () {
        var str = '#!/api/' + this.getClassName(),
            memberType = this.getMemberType(),
            focusMember = this.getFocusMember();

        if (memberType) {
            str += '-' + memberType;
        }

        if (focusMember) {
            str += '-' + focusMember;
        }

        return str;
    }
});
