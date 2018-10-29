# Sencha docs generator application 
This application glues the api docs and guides together into a web site. 

## CLI

* This npm package installs the `sencha-docs-generator` cli binary. 

### CLI Help

* Run `sencha-docs-generator -h` to console log the arg options. 

## Development

### NPM Login
This login is used to fetch the dependencies, such as Sencha CMD. 

* Run `npm login --registry=https://sencha.myget.org/F/internal/npm/ --scope=@sencha`

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


