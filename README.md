# Sencha Docs Site Generator
The Sencha docs site generator takes guides and api documentation and makes a site. 

The docs site generator uses Doxi Api Docs formatting. 

The guides platform allows you to save time and elliminates multiple versions of the same content across your api versions. 
It also uses simple markdown to render the html. 
Which makes writing docs quick and easy. 

## TODO

* TODO finish docs diff fix in PR, this changes `-version=6.7` to `-productVersion=6.7`
* TODO [Transfer the JsDuck content to wiki here](https://github.com/senchalabs/jsduck/wiki)
* TODO add release notes. 
* TODO add third party attributions


## Getting Started
Try out the example build configuration.

* Navigate to the basic example: [Example Build Configuration](./packages/build-config-example).


## Demo
Check out what the docs generator does for Sencha.

* Explore how Sencha does it: [Sencha Documentation](https://docs.sencha.com)


## Requirements

* (*)nix System only. Windows systems will come later. (TODO fix joining paths)


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


## Reference

* [Writing Guides with Markdown](https://github.com/sencha/docs/wiki)
* [Writing API Docs for Doxi](https://github.com/sencha/docs/wiki) 


## License

* [Apache 2.0](./LICENSE.md)

## Contributors

* Contributors read the [instructions here](./CONTRIBUTOR.md).


## Debugging

* Create VS Code launcher. Copy one of the existing.
* Set  "--syncRemote=false", to true.
* Run the build from VS Code launcher
* Set  "--syncRemote=false", to false.
* Make changes in the build/* folder.
* Copy the changes that were made to guides or docs repo.
