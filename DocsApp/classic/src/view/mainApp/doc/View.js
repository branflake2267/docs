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
        className: null
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
                margin   : 10,
                handler  : 'onMemberNavBtnClick',
                listeners: {
                    afterrender: 'onMemberMenuButtonRender',
                    mouseover  : 'onMemberMenuOver',
                    mouseout   : 'onMemberMenuOut'
                }
            },
            items   : [{
                text    : 'Configs',
                relStore: 'configs',
                target  : 'configsHeader',
                bind    : {
                    hidden: '{memberCfg}',
                    badge : '{memberCfgCount}'
                }
            }, {
                text    : 'Properties',
                relStore: 'properties',
                target  : 'propertiesHeader',
                bind    : {
                    hidden: '{memberProperty}',
                    badge : '{memberPropertyCount}'
                }
            }, {
                text    : 'Methods',
                relStore: 'methods',
                target  : 'methodsHeader',
                bind    : {
                    hidden: '{memberMethod}',
                    badge : '{memberMethodCount}'
                }
            }, {
                text    : 'Events',
                relStore: 'events',
                target  : 'eventsHeader',
                bind    : {
                    hidden: '{memberEvent}',
                    badge : '{memberEventCount}'
                }
            }, {
                text    : 'CSS Vars',
                relStore: 'themevars',
                target  : 'cssVarHeader',
                bind    : {
                    hidden: '{memberCss_var}',
                    badge : '{memberCss_varCount}'
                }
            }, {
                text    : 'CSS Mixins',
                relStore: 'thememixins',
                target  : 'cssMixinHeader',
                bind    : {
                    hidden: '{memberCss_mixin}',
                    badge : '{memberCss_mixinCount}'
                }
            }]
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
        //layout: 'vbox',
        defaults: {
            anchor: '100%',
            xtype : 'checkboxfield'
        },
        items   : [{
            xtype    : 'textfield',
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
            bind      : '{catFilters.public}',
            listeners : {
                change: 'onAccessFilterChange'
            }
        }, {
            fieldLabel: 'Protected',
            bind      : '{catFilters.protected}',
            listeners : {
                change: 'onAccessFilterChange'
            }
        }, {
            fieldLabel: 'Private',
            bind      : '{catFilters.private}',
            listeners : {
                change: 'onAccessFilterChange'
            }
        }, '-', {
            fieldLabel: 'Inherited',
            bind      : '{catFilters.inherited}',
            listeners : {
                change: 'onAccessFilterChange'
            }
        }, {
            fieldLabel: 'Accessor',
            bind      : '{catFilters.accessor}',
            listeners : {
                change: 'onAccessFilterChange'
            }
        }, {
            fieldLabel: 'Deprecated',
            bind      : '{catFilters.deprecated}',
            listeners : {
                change: 'onAccessFilterChange'
            }
        }, {
            fieldLabel: 'Removed',
            bind      : '{catFilters.removed}',
            listeners : {
                change: 'onAccessFilterChange'
            }
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
        xtype    : 'container',
        reference: 'classDescription',
        //height: 1000,
        layout   : {
            type : 'hbox',
            align: 'stretchmax'
        },
        items    : [{
            xtype  : 'container',
            flex   : 1,
            padding: '0 20 20 20',
            bind   : {
                data: '{classFile}'
            },
            tpl    : '{[marked(values.text, { renderer: markedRenderer({ addHeaderId: false }) })]}'
        }, {
            xtype: 'component',
            width: 400,
            split: true,
            bind : '{classFile}',
            tpl  : new Ext.XTemplate(
                '<tpl if="alternateClassNames">',
                '<div>Alternate Class Names</div><div>{alternateClassNames}</div>',
                '</tpl>',
                '<tpl if="mixins">',
                '<div>Mixins</div><div>{mixins}</div>',
                '</tpl>',
                '<tpl if="requires">',
                '<div>Requires</div><div>{[this.getRequires(values)]}</div>',
                '</tpl>',
                {
                    getRequires: function (values) {
                        return values.requires.replace(/,/g, '<br>');
                    }
                }
            )
        }]

        // CONFIGS
    }, {
        xtype    : 'component',
        style    : 'color: red; font-size: 30px; line-height: 30px; font-weight: bold;',
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
        style    : 'color: red; font-size: 30px; line-height: 30px; font-weight: bold;',
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
        style    : 'color: red; font-size: 30px; line-height: 30px; font-weight: bold;',
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
        style    : 'color: red; font-size: 30px; line-height: 30px; font-weight: bold;',
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
        style    : 'color: red; font-size: 30px; line-height: 30px; font-weight: bold;',
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
        style    : 'color: red; font-size: 30px; line-height: 30px; font-weight: bold;',
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
    }
});
