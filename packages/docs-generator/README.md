# Sencha Docs Generator CLI
This application glues the [Doxi](https://github.com/sencha/doxi) api docs and markdown guides together into a web site. 

## Getting Started

### Prep
Login to the npm.sencha.com. 

* [Sign up](https://www.sencha.com/products/extjs/communityedition/) for Ext JS CE to get NPM credentials.
* Login by running: `npm login --registry=https://sencha.myget.org/F/community/npm/ --scope=@sencha`

### Install
Start by installing the system process `sencha-docs-generator`.

* Install using: `install -g @sencha/sencha-docs-generator`

### CLI Execution
Running can be done in the terminal or command prompt. 

* Run `sencha-docs-generator -h`


## Development

### NPM Login
This login is used to fetch the dependencies from the [internal repository](https://sencha.myget.org/feed/internal/package/npm/@sencha/docs-generator), such as Sencha CMD. 

* Run `npm login --registry=https://sencha.myget.org/F/community/npm/ --scope=@sencha`

### Dependencies
Builds are dependent on these packages. 

* `@sencha/cmd` - Sencha CMD
* `@sencha/custom-gramophone` - Repackaged module
* `@sencha/custom-marked` - Repackaged module

### Build

* Run `npm install`. This will install the binary in `node_modules/.bin/sencha-docs-generator`.

### Debug
Instead of running `npm install` run `npm link`. If you do use `npm link`, run it from the config directory.

* Run `npm link` this will link the binary to the global repository. 
    * Or better yet, `cd build-config-sencha` and then run `npm link ../docs-generator`.
    * Or better yet, `cd build-config-example` and then run `npm link ../docs-generator`.
* Run `sh ./build*.sh` to test one of the builds.

### Testing

* TODO - sencha test
* TODO - unit tests
* TODO - build runs tests

### Deploy

* Increment version
* [TeamCity Build](https://teamcity.sencha.com/viewType.html?buildTypeId=EngineeringOperations_NodeModules_SenchaDocsGenerator)


