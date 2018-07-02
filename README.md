# Sencha Docs Site Generator
The home of the Sencha site generator or builder.

## Requirements

* (*)nix System, because the path system is not windows compatible yet.

### CMD
Download and install [Sencha Cmd](https://www.sencha.com/products/sencha-cmd/).


## Build

### Clone Repo
Clone this repository.

* `git clone git@github.com:sencha/docs.git`

### Install 
Start by installing the npm packages. 

* `cd ./lib/`
* `npm install` 


### Generate
Use node to run the build generation cmd. 
See the example for more specific information.

* Options arguments:

		--cmdPath=../../../sencha-cmd

* Example build command.
 

		node --max-old-space-size=4076 index create-app-html --buildConfigsDir=~/git/docs/build_config_sencha --product=extjs --version=6.5.3 --syncRemote=true --forceDoxi=true --log --production 
 





 
 


