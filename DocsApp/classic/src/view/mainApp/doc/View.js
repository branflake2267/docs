Ext.define('DocsApp.view.mainApp.doc.View', {
    extend: 'Ext.panel.Panel',
    xtype: 'mainapp-doc-view',

    requires: [
        'DocsApp.view.mainApp.doc.MemberDataview'
    ],

    config: {
        className: null
    },

    viewModel: 'mainapp-docmodel',
    controller: 'main-doc-controller',

    iconCls: 'x-fa fa-code',
    scrollable: true,

    layout: 'anchor',
    defaults: {
        anchor: '100%'
    },

    dockedItems: [{
        xtype: 'toolbar',
        dock: 'top',
        items: [{
            iconCls: 'x-fa fa-star',
            handler: 'addFavorite'
        }, {
            xtype: 'component',
            bind: '{classFile.name}',
            cls: 'da-class-name'
        }, {
            xtype: 'component',
            //bind: '{daAlias}'
            bind: {
                data: '{classFile}'
            },
            tpl: new Ext.XTemplate('{[this.aliasOut(values)]}', {
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
        }, '->', {
            xtype: 'textfield',
            emptyText: 'filter members...',
            triggers: {
                clear: {
                    cls: 'x-form-clear-trigger',
                    handler: function () {
                        this.reset();
                    }
                }
            }
        }, {
            enableToggle: true,
            text: 'Expand All',
            iconCls: 'x-fa fa-expand',
            width: 110,
            toggleHandler: function (button, pressed) {
                button.setText(pressed ? 'Collapse All' : 'Expand All');
                button.setIconCls(pressed ? 'x-fa fa-compress' : 'x-fa fa-expand');
            }
        }]
    }, {
        xtype: 'toolbar',
        dock: 'right',
        //layout: 'vbox',
        defaults: {
            anchor: '100%',
            xtype: 'checkboxfield'
        },
        items: [{
            fieldLabel: 'Public'
        }, {
            fieldLabel: 'Protected'
        }, {
            fieldLabel: 'Private'
        }, '-', {
            fieldLabel: 'Inherited'
        }, {
            fieldLabel: 'Accessor'
        }, {
            fieldLabel: 'Deprecated'
        }, {
            fieldLabel: 'Removed'
        }]
    /*}, {
        xtype: 'toolbar',
        dock: 'left',
        style: 'background-color: #4a4a4a;',
        layout: {
            type: 'vbox',
            align: 'stretchmax'
        },
        items: [{
            text: 'View as Tabs',
            width: 114,
            asTabs: true,
            handler: function () {
                var me = this,
                    tabs = me.asTabs;

                me.setText(tabs ? 'View Combined' : 'View as Tabs');
                me.asTabs = !me.asTabs;
            }
        }, {
            xtype: 'container',
            layout: {
                type: 'vbox',
                align: 'stretch'
            },
            defaultType: 'button',
            items: [{
                text: 'Configs'
            }, {
                text: 'Properties'
            }, {
                text: 'Methods'
            }, {
                text: 'Events'
            }]
        }]*/
    }],

    items: [{
        xtype: 'toolbar',
        //dock: 'left',
        style: 'background-color: #4a4a4a;',
        layout: {
            type: 'hbox',
            align: 'stretchmax'
        },
        items: [{
            text: 'View as Tabs',
            width: 114,
            asTabs: true,
            handler: function () {
                var me = this,
                    tabs = me.asTabs;

                me.setText(tabs ? 'View Combined' : 'View as Tabs');
                me.asTabs = !me.asTabs;
            }
        }, {
            text: 'Configs'
        }, {
            text: 'Properties'
        }, {
            text: 'Methods'
        }, {
            text: 'Events'
        }]
    }, {
        xtype: 'container',
        //height: 1000,
        layout: {
            type: 'hbox',
            align: 'stretchmax'
        },
        items: [{
            xtype: 'container',
            flex: 1,
            padding: '0 20 20 20',
            bind: {
                data: '{classFile}'
            },
            tpl: '{[marked(values.text, { renderer: markedRenderer({ addHeaderId: false }) })]}'
        }, {
            xtype: 'component',
            width: 400,
            split: true,
            bind: '{classFile}',
            tpl: new Ext.XTemplate(
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
    }, {
        xtype: 'component',
        style: 'color: red; font-size: 30px; line-height: 30px; font-weight: bold;',
        reference: 'configsHeader',
        html: 'Configs',
        hidden: true
    }, {
        xtype: 'main-member-dataview',
        reference: 'memberCfg',
        bind: '{configs}'
    }, {
        xtype: 'component',
        style: 'color: red; font-size: 30px; line-height: 30px; font-weight: bold;',
        reference: 'propertiesHeader',
        html: 'Properties',
        hidden: true
    }, {
        xtype: 'main-member-dataview',
        reference: 'memberProperty',
        bind: '{properties}',
        itemTpl: new Ext.XTemplate(
            '<h3 class="{$type}">{name} : {type}',

            '<tpl if="readonly"><span class="readonly">READONLY</span></tpl>',
                '<tpl if="access">',
                    "<tpl if='access == \"private\"'>" ,
                        '<span class="private">PRIVATE</span>' ,
                    "<tpl elseif='access == \"protected\"'>",
                        '<span class="protected">PROTECTED</span>' ,
                '</tpl>',
            '</tpl></h3>',

            '<tpl if="text"><p>{text}</p></tpl>'
        )
    }, {
        xtype: 'component',
        style: 'color: red; font-size: 30px; line-height: 30px; font-weight: bold;',
        reference: 'methodsHeader',
        html: 'Methods',
        hidden: true
    }, {
        xtype: 'main-member-dataview',
        reference: 'memberMethod',
        bind: '{methods}'
    }, {
        xtype: 'component',
        style: 'color: red; font-size: 30px; line-height: 30px; font-weight: bold;',
        reference: 'eventsHeader',
        html: 'Events',
        hidden: true
    }, {
        xtype: 'main-member-dataview',
        reference: 'memberEvent',
        bind: '{events}'
    }, {
        xtype: 'component',
        style: 'color: red; font-size: 30px; line-height: 30px; font-weight: bold;',
        reference: 'cssVarHeader',
        html: 'Theme Vars',
        hidden: true
    }, {
        xtype: 'main-member-dataview',
        reference: 'memberCss_var',
        bind: '{themevars}'
    }, {
        xtype: 'component',
        style: 'color: red; font-size: 30px; line-height: 30px; font-weight: bold;',
        reference: 'cssMixinHeader',
        html: 'Theme Mixins',
        hidden: true
    }, {
        xtype: 'main-member-dataview',
        reference: 'memberCss_mixin',
        bind: '{thememixins}'
    }],

    updateClassName : function(name) {
        if (name) {
            this.setTitle(name);

            this.getViewModel().linkTo('classFile', {
                type: 'Class',
                id: name
            });
        }
    }
});
