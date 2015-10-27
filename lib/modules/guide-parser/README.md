Guide Parser Module
===

The purpose of this module is to generate markdown of class and class member changes between two versions.

## Running

    node index guide-parser [options] [targets]

### Options

 - **--input** or **-i** The root location of the product guides where the individual versions are children of.
    - `node index guide-parser --input=/path/to/extjs`
    - `node index guide-parser -i /path/to/extjs`
 - **--destination** or **-d** The location where the compiled JSON file should be written to.
    - `node index guide-parser --destination=/path/to/output`
    - `node index guide-parser -d /path/to/output`
 - **--version** or **-v** The version of the framework these guides are being generated for.
    - `node index guide-parser --version=6.0`
    - `node index guide-parser -v 6.0`
 - **--stylesheet** or *-s* An optional stylesheet to use instead of the default CSS file.
    - `node index guide-parser --stylesheet=/path/to/styles.css`
    - `node index guide-parser -s /path/to/styles.css`
 - **--template** or **-t** An optional Handlebars template to use instead of the default template.
    - `node index guide-parser --template=/path/to/template.hbs`
    - `node index guide-parser - t /path/to/template.hbs`
 - **--compress** or **-c** Optional, whether to minify the CSS and JS assets or the JSON file for the `tree` target.
    - `node index guide-parser --compress`
    - `node index guide-parser -c`

### Targets

This module has a single target to determine whether the guide parser should output static HTML or
JSON structure to be used as a menu for the guides.

    node index guide-parser tree
    node index guide-parser html

### Notes

The **`--input`** option should be the product directory. In the *sencha-documentation* repo, it would be `/sencha-documentation/markdown/src/main/markdown/extjs/`.

It is expected to have a `config.json` file to describe what guides should be parsed. This should be in the **`--input`**
option path next to the version directories. A sample `config.json` file is:

    {
        "versions" : [
            "6.0",
            "5.1",
            "5.0"
        ],
        "contents" : [
            {
                "name"     : "Examples",
                "slug"     : "examples",
                "children" : [
                    {
                        "link" : "http://examples.sencha.com/extjs/6.0.1/examples/",
                        "name" : "6.0.1 Examples",
                        "slug" : "601examples"
                    },
                    {
                        "link" : "http://examples.sencha.com/extjs/6.0.0/examples/",
                        "name" : "6.0.0 Examples",
                        "slug" : "600examples"
                    }
                ],
                "excludes" : [
                    {
                        "name" : "",
                        "slug" : "500examples.php"
                    },
                    {
                        "name" : "",
                        "slug" : "501examples.php"
                    },
                    {
                        "name" : "",
                        "slug" : "510examples.php"
                    },
                    {
                        "name" : "",
                        "slug" : "511examples.php"
                    }
                ]
            },
            {
                "name"     : "Getting Started",
                "slug"     : "getting_started",
                "children" : [
                    {
                        "name" : "Setup &amp; Getting Started",
                        "slug" : "getting_started"
                    },
                    {
                        "name" : "Ext JS - FAQ",
                        "slug" : "extjs_faq"
                    },
                    {
                        "name" : "Create a Sample Login App",
                        "slug" : "login_app"
                    }
                ],
                "excludes" : [
                    {
                        "name" : "",
                        "slug" : "ecosystem"
                    }
                ]
            },
            {
                "name"     : "What's New?",
                "slug"     : "whats_new",
                "children" : [
                    {
                        "name" : "Release Notes",
                        "slug" : "release_notes"
                    },
                    {
                        "name" : "What's New in Ext JS 6",
                        "slug" : "whats_new"
                    }
                ],
                "excludes" : [
                    {
                        "name" : "",
                        "slug" : "whats_new510"
                    },
                    {
                        "name" : "",
                        "slug" : "whats_new501"
                    },
                    {
                        "name" : "",
                        "slug" : "whats_new500"
                    }
                ]
            },
            {
                "name"     : "Upgrades &amp; Migrations",
                "slug"     : "upgrades_migrations",
                "children" : [
                    {
                        "name" : "Ext JS 5 to 6 - Upgrade Guide",
                        "slug" : "extjs_upgrade_guide"
                    },
                    {
                        "name" : "Touch 2.4 to 6 - Upgrade Guide",
                        "slug" : "modern_upgrade_guide"
                    },
                    {
                        "name" : "Ext JS 6 - Pivot Grid Upgrade Guide",
                        "slug" : "pivot_grid_update_guide"
                    }
                ],
                "excludes" : [
                    {
                        "name" : "",
                        "slug" : "charts_upgrade_guide"
                    }
                ]
            },
            {
                "name"     : "Core Concepts",
                "slug"     : "core_concepts",
                "children" : [
                    {
                        "name" : "The Class System",
                        "slug" : "classes"
                    },
                    {
                        "name" : "Layouts and Containers",
                        "slug" : "layouts"
                    },
                    {
                        "name" : "Components",
                        "slug" : "components"
                    },
                    {
                        "name" : "Data Package",
                        "slug" : "data_package"
                    },
                    {
                        "name" : "Events and Gestures",
                        "slug" : "events"
                    },
                    {
                        "name" : "Drag and Drop",
                        "slug" : "drag_drop"
                    },
                    {
                        "name" : "Theming System",
                        "slug" : "theming"
                    },
                    {
                        "name" : "Memory Management",
                        "slug" : "memory_management"
                    },
                    {
                        "name" : "Draw Package",
                        "slug" : "drawing"
                    },
                    {
                        "name" : "Accessibility",
                        "slug" : "accessibility"
                    },
                    {
                        "name" : "Localization",
                        "slug" : "localization"
                    },
                    {
                        "name" : "Right to Left in Ext JS",
                        "slug" : "rtl"
                    },
                    {
                        "name" : "Sencha Font Packages",
                        "slug" : "font_ext"
                    },
                    {
                        "name" : "Tablet Support",
                        "slug" : "tablet_support"
                    }
                ]
            },
            {
                "name"     : "Architecture",
                "slug"     : "application_architecture",
                "children" : [
                    {
                        "name" : "Introduction to Application Architecture",
                        "slug" : "application_architecture"
                    },
                    {
                        "name" : "Developing for Multiple Screens",
                        "slug" : "developing_for_multiple_screens_and_environments"
                    },
                    {
                        "name" : "View Controllers",
                        "slug" : "view_controllers"
                    },
                    {
                        "name" : "View Models &amp; Data Binding",
                        "slug" : "view_models_data_binding"
                    },
                    {
                        "name" : "View Model Internals",
                        "slug" : "view_model_internals"
                    },
                    {
                        "name" : "Using the Router",
                        "slug" : "router"
                    }
                ]
            },
            {
                "name"     : "UI Components",
                "slug"     : "components",
                "children" : [
                    {
                        "name" : "Forms",
                        "slug" : "forms"
                    },
                    {
                        "name" : "Introduction to Charting",
                        "slug" : "introduction_to_charting"
                    },
                    {
                        "name" : "Trees",
                        "slug" : "trees"
                    },
                    {
                        "name" : "Grids",
                        "slug" : "grids"
                    },
                    {
                        "displayNew" : true,
                        "name"       : "Pivot Grid",
                        "slug"       : "pivot_grid"
                    },
                    {
                        "name" : "Widgets and Widget Columns",
                        "slug" : "widgets_widgets_columns"
                    }
                ],
                "excludes" : [
                    {
                        "name" : "Containers",
                        "slug" : "containers"
                    },
                    {
                        "name" : "Panels",
                        "slug" : "panels"
                    },
                    {
                        "name" : "Windows",
                        "slug" : "windows"
                    },
                    {
                        "name" : "Buttons",
                        "slug" : "buttons"
                    },
                    {
                        "name" : "Menus",
                        "slug" : "menus"
                    },
                    {
                        "name" : "Tab Panels",
                        "slug" : "tab_panels"
                    }
                ]
            },
            {
                "name"     : "Backend Connectors",
                "slug"     : "backend_connectors",
                "children" : [
                    {
                        "name" : "SOAP Services",
                        "slug" : "soap"
                    },
                    {
                        "name" : "AMF Data Sources",
                        "slug" : "amf"
                    },
                    {
                        "name"     : "Ext Direct",
                        "slug"     : "direct",
                        "children" : [
                            {
                                "name" : "Ext Direct Specification",
                                "slug" : "specification"
                            },
                            {
                                "name" : "Ext Direct with MySQL and PHP",
                                "slug" : "mysql_php"
                            }
                        ]
                    }
                ]
            },
            {
                "name"     : "Other Resources",
                "slug"     : "other_resources",
                "children" : [
                    {
                        "name" : "Basics of OOP",
                        "slug" : "oop_concepts"
                    },
                    {
                        "name" : "Ext JS Ecosystem",
                        "slug" : "ecosystem"
                    },
                    {
                        "name" : "From the Sencha Blog",
                        "slug" : "sencha_blog"
                    }
                ]
            }
        ]
    }
