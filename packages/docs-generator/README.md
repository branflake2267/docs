# Sencha docs generator application 
This application glues the api docs and guides together into a web site. 

## Development

### NPM Login
This login is used to fetch the Sencha CMD repository. 

* Run `npm login --registry=https://sencha.myget.org/F/internal/npm/ --scope=@sencha` - Used for @sencha/cmd.

### Build

* Run `npm install`

### Debug
Instead of running `npm instll` run `npm link`.

* Run `npm link` this will link the binary to the global repository. 
    * Or `cd build-config-sencha` and then run `npm link ../docs-generator`.
    * Or `cd build-config-example` and then run `npm link ../docs-generator`.
* Run `sh ./build*.sh` to test one of the builds.

### Testing

* TODO - sencha test
* TODO - unit tests
* TODO - build runs tests

### Deploy

* Increment version
* [TeamCity Build](https://teamcity.sencha.com/viewType.html?buildTypeId=EngineeringOperations_NodeModules_SenchaDocsGenerator)

