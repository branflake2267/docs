# Sencha Docs Site Generator
The home of the Sencha site generator or builder.

## Required set up

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

Options arguments:
--cmdPath=../../../sencha-cmd

node --max-old-space-size=4076 index create-app-html --workspace=~/git/docs/build_config_sencha --product=extjs --version=6.5.3 --syncRemote=true --forceDoxi=true --log --production 

// --max-old-space-size=4076 - memory or heap setting
// index - entrypoint?
// create-app-html - run module
//  --product=[product] - config for product 





 
 


