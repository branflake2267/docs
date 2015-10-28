/**
 * Created by seth on 10/28/15.
 */
Ext.define('DocsApp.view.button.BadgeButton', {
    extend: 'Ext.button.Button',
    xtype: 'badgebutton',

    config: {
        badge: null
    },

    childEls: [
        'badgeEl'
    ],

    cls: 'da-badge-button',

    initComponent: function () {
        this.renderTpl += '<span id="{id}-badgeEl" class="da-badgeElCls" data-ref="badgeEl">{badge}</span>';

        this.callParent();
    },

    initRenderData: function () {
        return Ext.apply(this.callParent(), {
            badge: this.badge
        });
    },

    updateBadge: function (text) {
        if (this.rendered) {
            this.badgeEl.setHtml(text);
        }
    }
});