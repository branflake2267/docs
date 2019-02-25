# Sencha Docs Site Generator
The Sencha docs site generator takes guides and api documentation and makes a site. 

## TODO

* TODO [Transfer the JsDuck content to wiki here](https://github.com/senchalabs/jsduck/wiki)


## Reference

### Writing Guides

* [Writing Guides with Markdown](https://github.com/sencha/docs/wiki)

### Writing API Docs

* [Writing API Docs for Doxi](https://github.com/sencha/docs/wiki) 


## Getting Started
Try out the example build configuration.

* Navigate to the basic example: [Example Build Configuration](./packages/build-config-example).

## Demo
Check out what the docs generator does for Sencha.

* Explore how Sencha does it: [Sencha Documentation](https://docs.sencha.com)

## Requirements

* (*)nix System only. Windows systems will come later.

## Repo Manifest

| Package                                                  | Description                             |
|----------------------------------------------------------|-----------------------------------------|
| [@sencha/docs-generator](./packages/docs-generator)      | Sencha docs site generator CLI app.     |
| [build-config-example](./packages/build-config-example)  | Example config demo.                    |
| [build-config-sencha](./packages/build-config-sencha)    | Sencah docs site config.                |
| [DocsApp](./pakcages/DocsApp)                            | The JS logic used on the site.          |
| [custom-gramophone](./packages/custom-gramophone)        | Repackaged module                       |
| [custom-marked](./packages/custom-marked)                | Repackaged module                       |

* TODO DocsApp - Upgrade to use NPM module and Ext JS modern tooling. 
* TODO custom packages - Move off of the custom packages. 

## License

* [Apache 2.0](./LICENSE.md)

## Contributors

* Contributors read the [instructions here](./CONTRIBUTOR.md).

