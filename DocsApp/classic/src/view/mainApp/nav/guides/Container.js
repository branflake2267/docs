Ext.define('DocsApp.view.mainApp.nav.guides.Container', {
    extend: 'Ext.tab.Panel',
    xtype: 'mainapp-nav-guides-container',
    
    title: 'Guides',
    iconCls: 'x-fa fa-book',
    tabPosition: 'bottom',
    
    items: [{
        xtype: 'gridpanel',
        title: 'Guided View',
        hideHeaders: true,
        columns: [{
            text: 'Titles',
            dataIndex: 'text',
            flex: 1
        }],
        store: {
            fields: [],
            data: [{
                text: 'Welcome to Ext JS'
            }, {
                text: 'Basic Install and Setup'
            }, {
                text: 'Components Overview'
            }, {
                text: 'Tutorial #1'
            }, {
                text: 'Containers and Layouts'
            }, {
                text: 'Tutorial #2'
            }, {
                text: 'Data: Models and Stores'
            }, {
                text: 'Tutorial #3'
            }, {
                text: 'Introduction to Applications'
            }, {
                text: 'View Controllers'
            }, {
                text: 'Tutorial #4'
            }, {
                text: 'View Models and Data Binding'
            }, {
                text: 'Tutorial #5'
            }, {
                text: 'Full Application Walkthrough'
            }]
        }
    }, {
        xtype: 'treepanel',
        title: 'Topical View',
            tbar: ['->', {
            text: 'Expand All'
        }],
        rootVisible: false,
        root: {
            expanded: true,
            children: [{
                text: 'Setup and Getting Started', // includes "Why Ext JS"
                leaf: true
            }, {
                text: 'What\'s New / Upgrading',
                children: [{
                    text: 'What\'s New in Ext JS',
                    leaf: true
                }, {
                    text: 'Classic Toolkit Diff Guide',
                    leaf: true
                }, {
                    text: 'Modern Toolkit Diff Guide',
                    leaf: true
                }, {
                    text: 'Ext JS 6 (Classic) - Upgrade Guide',
                    leaf: true
                }, {
                    text: 'Ext JS 6 (Modern) - Upgrade Guide',
                    leaf: true
                }]
            }, {
                text: 'Components',
                children: [{
                    text: 'Forms',
                    leaf: true
                }, {
                    text: 'Charts',
                    leaf: true
                }, {
                    text: 'Trees',
                    leaf: true
                }, {
                    text: 'Grids',
                    children: [{
                        text: 'Grid Panel',
                        leaf: true
                    }, {
                        text: 'Pivot Grid',
                        leaf: true
                    }, {
                        text: 'Widgets and Widget Columns',
                        leaf: true
                    }]
                }]
            }, {
                text: 'Core Concepts',
                children: [{
                    text: 'Accessibility',
                    leaf: true
                }, {
                    text: 'Class System',
                    leaf: true
                }, {
                    text: 'Components',
                    leaf: true
                }, {
                    text: 'Data',
                    children: [{
                        text: 'Data Overview',
                        leaf: true
                    }, {
                        text: 'Ext Direct - Specification',
                        leaf: true
                    }, {
                        text: 'Ext Direct - MySQL and PHP',
                        leaf: true
                    }]
                }, {
                    text: 'Event System',
                    leaf: true
                }, {
                    text: 'Font Packages',
                    leaf: true
                }, {
                    text: 'Layouts and Containers',
                    leaf: true
                }, {
                    text: 'Localization',
                    leaf: true
                }, {
                    text: 'Memory Management',
                    leaf: true
                }, {
                    text: 'OOP Basics',
                    leaf: true
                }, {
                    text: 'Right To Left Support',
                    leaf: true
                }, {
                    text: 'Tablet Support',
                    leaf: true
                }]
            }, {
                text: 'Application Architecture',
                children: [{
                    text: 'Introduction to App Architecture',
                    leaf: true
                }, {
                    text: 'View Controllers',
                    leaf: true
                }, {
                    text: 'View Models and Data Binding',
                    leaf: true
                }, {
                    text: 'View Model Internals',
                    leaf: true
                }, {
                    text: 'Using Routes',
                    leaf: true
                }]
            }, {
                text: 'Tutorials and How To\'s',
                children: [{
                    text: 'Building a Login App',
                    leaf: true
                }, {
                    text: 'Theming Ext JS',
                    leaf: true
                }]
            }, {
                text: 'Enterprise Tools',
                children: [{
                    text: 'AMF Data Sources',
                    leaf: true
                }, {
                    text: 'SOAP Data Sources',
                    leaf: true
                }]
            }, {
                text: 'Ext JS - FAQ',
                leaf: true
            }]
        }
    }]
});