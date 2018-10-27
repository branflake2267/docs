/**
 * Created by seth on 11/3/15.
 */
Ext.define('DocsApp.overrides.dom.Element', {
    override: 'Ext.dom.Element',

    monitorMouseEnter: function (delay, handler, scope) {
        var me = this,
            timer,
            listeners = {
                mouseenter: function(e) {
                    //<feature legacyBrowser>
                    if (Ext.isIE9m) {
                        e.enableIEAsync();
                    }
                    //</feature>
                    timer = Ext.defer(handler, delay, scope || me, [e]);
                },
                mouseleave: function() {
                    clearTimeout(timer);
                }
            };

        me.on(listeners);
        return listeners;
    }
});