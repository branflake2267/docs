# Sencha Docs Site Config
Generates Sencha product documentation site. 


## Project Dependencies

### Guides
The Sencha Guides. 

* [Sencha guides](https://github.com/sencha/guides) git repo.

### Source
The source configuration. 

* [docs_project_config.json](./configs/docs_project_config.json) source configuration here.


## Build
Build the docs by running the node command in the bash script.

### 1. Github sshkey
* Add your sshkey to the git dash. 
* You'll need acess to these repos: github.com/extjs/SDK, github.com/sencha/guides and github.com/sencha/cmd.

### 2. NPM Login
Login into the internal repository. 

* Run `npm login --registry=https://sencha.myget.org/F/internal/npm/ --scope=@sencha`

### 3. Install
Start by building the node library.

* Run `npm install -g @sencha/docs-generator` to install for global cli use. 

### 4. Run Script

* To confirm it's installed run `sencha-docs-generator`
* To Run with configs, first remove npx from .sh files, then run `sh ./build.*.sh`. 


## Debug
Instead of instaling the CLI command globablly, install it locally or run with VSCode.

### Local CLI
* Run `npm link ../docs-generator/` - From this directory, this will link the cli command, so it can be ran with npx.
* Then run `sh ./build*.sh` - Be sure `npx sencha-docs-generator` is used in the sh script. 

### Debug VSCode
Using VSCode will allow you to set breakpoints, inspect stacks, variables and console output with ease. 

* Run `npm link ../docs-generator/` - This will link the binary. (Run from the ./build-config-sencha directory.)
* Run the VSCode launcher, to debug one of the sencha doc configs. 


## Build Output
The build output will go into the generated `./build` directory. 

* Open [build output](./build/output)

### Build Directory Manifest
Everything in the build directory is generated. 
It can be deleted.

* `./build/_temp` - doxi manifest
* `./build/input` - doxi output
* `./build/output` - html output
* `./build/repos` - cloned git repos

