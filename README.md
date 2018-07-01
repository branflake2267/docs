# Sencha Docs Site Generator
The home of the Sencha site generator or builder.

## Requirements

* (*)nix System, because the path system is not windows compatible yet.

## Configure

### Clone Docs Repository
Clone this repository to your machine

    $ git clone git@github.com:sencha/docs.git
    $ cd docs

### Install Cmd
Download and install [Sencha Cmd](https://www.sencha.com/products/sencha-cmd/) for your platform.

### Install NPM Packages
Initially build the project.

    $ cd ./lib/
    $ npm install


## Building Site
TODO(branflake2267) enhance build instructions...

* Options arguments:

		--cmdPath=../../../sencha-cmd

* Testing Sencha build
 

		node --max-old-space-size=4076 index create-app-html --buildConfigsDir=~/git/docs/build_config_sencha --product=extjs --version=6.5.3 --syncRemote=true --forceDoxi=true --log --production 


* Notes - TODO table

		// --max-old-space-size=4076 - memory or heap setting
		// index - entrypoint?
		// create-app-html - run module
		//  --product=[product] - config for product 





 
 


