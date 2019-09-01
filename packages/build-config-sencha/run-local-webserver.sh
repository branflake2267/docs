#!/bin/bash

# Required host records: /etc/hosts
#127.0.0.1 fiddle-dev.sencha.com
#127.0.0.1 support-dev.sencha.com
#127.0.0.1 api-dev.sencha.com
#127.0.0.1 docs-dev.sencha.com

# 1. Run the ssl reverse proxy app

# 2. docs-dev.sencha.com - using the ssl reverse proxy to test locally
cd ./build/output
python -m http.server 3003

# 3. Goto: https://docs-dev.sencha.com/