/**
 * The main application class. An instance of this class is created by app.js when it
 * calls Ext.application(). This is the ideal place to handle application launch and
 * initialization details.
 */
Ext.define('DocsApp.Application', {
    extend: 'Ext.app.Application',

    name: 'DocsApp',
    defaultToken: '!/home',

    models: ['DocsApp.model.Base'],

    stores: [
        'DocsApp.store.main.Main',
        'guide.Topical',
        'doc.Package'
    ],

    launch: function () {
        // TODO - Launch the application
    },

    onAppUpdate: function () {
        Ext.Msg.confirm('Application Update', 'This application has an update, reload?',
            function (choice) {
                if (choice === 'yes') {
                    window.location.reload();
                }
            }
        );
    }
});