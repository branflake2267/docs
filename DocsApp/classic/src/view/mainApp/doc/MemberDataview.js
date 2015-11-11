Ext.define('DocsApp.view.mainApp.doc.MemberDataview', {
    extend: 'Ext.view.View',
    xtype : 'main-member-dataview',

    itemSelector    : 'div.da-member-item',
    disableSelection: true,
    initComponent   : function () {
        var me = this;

        me.itemTpl = new Ext.XTemplate(
            '<tpl if="items">',
                '{[this.evalItems(values)]}',
            '</tpl>',
            '<div class="da-member-item">',

                '<h3 class="da-member da-{$type}">',
                    '<span class="da-member-name">{name}</span> ',

                    '<tpl if="items">',
                        '<tpl if="myParams">',
                            '( ',
                            '<tpl for="myParams">',
                                '<tpl if="optional">[</tpl>',
                                '{name}',
                                '<tpl if="optional">]</tpl>',
                                '<tpl if="xindex !== xcount">, </tpl>',
                            '</tpl>',
                            ' ) ',
                        '</tpl>',
                    '</tpl>',

                    '<tpl if="type">',
                        '<span class="da-type">: {[this.makeLinks(values.type)]}</span>',
                    '</tpl>',

                    '<tpl if="myReturn">',
                        ' : ',
                        '<tpl for="myReturn">',
                            '{[this.makeLinks(values.type)]}',
                        '</tpl>',
                    '</tpl>',

                    '<tpl if="readonly"><span class="da-readonly">readonly</span></tpl>',
                    '<tpl if="deprecatedVersion">',
                        '<span class="da-deprecated">deprecated</span>',
                    '</tpl>',
                    '<tpl if="removedVersion">',
                        '<span class="da-removed">removed</span>',
                    '</tpl>',
                    '<tpl if="access">',
                        '<tpl if="access == \'private\'">',
                            '<span class="da-private">private</span>',
                        '<tpl elseif="access == \'protected\'">',
                            '<span class="da-protected">protected</span>',
                        '</tpl>',
                    '</tpl>',
                    '<tpl if="template">',
                        '<span class="da-template">template</span>',
                    '</tpl>',
                    '<tpl if="static">',
                        '<span class="da-static">static</span>',
                    '</tpl>',
                    '<tpl if="preventable">',
                        '<span class="da-preventable">preventable</span>',
                    '</tpl>',
                    '<tpl if="preventable">',
                        '<div class="da-preventable-msg">This action following this event is <b>preventable.</b> When any',
                        'of the listeners returns false, the action is cancelled.</div>',
                    '</tpl>',
                    '<tpl if="deprecatedMessage">',
                        '<div class="da-deprecated-msg">{deprecatedMessage}</div>',
                    '</tpl>',
                    '<tpl if="removedMessage">',
                        '<div class="da-removed-msg">{removedMessage}</div>',
                    '</tpl>',
                '</h3>',

                '<div class="da-member-detail">',
                    '<tpl if="text"><div class="da-member-text">{text}</div></tpl>',
                    '<tpl if="value"><div class="da-defaults-to">Defaults to: {type}</div></tpl>',
                    '<tpl if="items">',
                        '<tpl if="myParams">',
                            '<div class="da-params-header">Parameters</div>',
                            '<tpl for="myParams">',
                                '<ul>',
                                    '<li>',
                                        '<b>{name}</b> ',
                                        '{type}',
                                        '<br>{text}',
                                        // add defaults value if it has one
                                    '</li>',
                                '</ul>',
                            '</tpl>',
                        '</tpl>',

                        '<tpl if="myReturn">',
                            '<div class="da-return-header">Returns</div>',
                            '<tpl for="myReturn">',
                                '<ul>',
                                    '<li>',
                                        '{type}',
                                        '<br>{text}',
                                    '</li>',
                                '</ul>',
                            '</tpl>',
                        '</tpl>',
                    '</tpl>',
                '</div>',

                '<div class="da-expander-toggle x-fa fa-expand"></div>',

                '<div class="da-member-source-class-ct">',
                    '<span <tpl if="isInherited">class="da-member-inherited"</tpl>>{srcClass}</span>',
                '</div>',

            '</div>',
            {
                evalItems: function (values) {
                    var items = values.items,
                        len   = items.length,
                        i     = 0;

                    values.myParams = false;
                    values.myReturn = false;

                    for (; i < len; i++) {
                        if (items[i].$type === 'param') {
                            params          = true;
                            values.myParams = values.myParams || [];
                            values.myParams.push(items[i]);
                        }
                        if (items[i].$type === 'return') {
                            returns         = true;
                            values.myReturn = items[i];
                        }
                    }
                }
            }, {
                makeLinks: function (link) {
                    link      = link.replace(/\|/g, '/');
                    var links = link.split('/'),
                        len   = links.length,
                        out   = [],
                        i     = 0,
                        root, rec;

                    me.classStore = me.classStore || me.up('mainapp-container').down('mainapp-nav-docs-container').lookupReference('packageDocTree').getStore();
                    root          = me.classStore.getRoot();

                    for (; i < len; i++) {
                        rec = root.findChild('className', links[i].replace(/\[\]/g, ''), true);
                        if (rec) {
                            out.push('<a href="!/api/' + links[i] + '">' + links[i] + '</a>');
                        } else {
                            out.push(links[i]);
                        }
                    }

                    return out.join('/');
                }
            }
        );

        me.callParent();
    },
    listeners       : {
        itemclick: 'onMemberClick'
    }
});
