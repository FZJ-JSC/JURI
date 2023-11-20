#!/usr/bin/bash
# Copyright (c) 2023 Forschungszentrum Juelich GmbH.
# This file is part of JURI. 
#
# This is an open source software distributed under the GPLv3 license. More information see the LICENSE file at the top level.
#
# Contributions must follow the Contributor License Agreement. More information see the CONTRIBUTING.md file at the top level.
#
# Contributors:
#    Wolfgang Frings (Forschungszentrum Juelich GmbH) 
#    Sebastian Lührs (Forschungszentrum Juelich GmbH) 
#    Filipe Guimarães (Forschungszentrum Juelich GmbH) 

usage() {
  echo -e "This script creates the required symbolic links to use Juri (Juelich Reporting Interface)"
  echo -e "in a given path (that should receive the data created from LLview)."
  echo -e "Usage:\n$0 [path_from] [path_to]"
  echo -e "         path_from: juri location"
  echo -e "         path_to:   job report data location (parent from data/ folder)"
}

if [ "$#" -le 1 ]; then
  echo -e "Illegal number of parameters. At least two paths are required."
  usage
  exit 1
fi

shopt -s extglob
set -x

FROM=${1%%+(/)}
TO=${2%%+(/)}
rm $TO/css 2> /dev/null
ln -sf $FROM/css $TO/css
rm $TO/fonts 2> /dev/null
ln -sf $FROM/fonts $TO/fonts
rm $TO/img 2> /dev/null
ln -sf $FROM/img $TO/img
rm $TO/index.html 2> /dev/null
ln -sf $FROM/index.html $TO/index.html
rm $TO/js 2> /dev/null
ln -sf $FROM/js $TO/js
rm $TO/json 2> /dev/null
ln -sf $FROM/json $TO/json
rm $TO/php 2> /dev/null
ln -sf $FROM/php $TO/php
rm $TO/templates 2> /dev/null
ln -sf $FROM/templates $TO/templates
rm $TO/config 2> /dev/null
ln -sf $FROM/config $TO/config
rm $TO/login.php 2> /dev/null
ln -sf $FROM/login.php $TO/login.php
rm $TO/error404.html 2> /dev/null
ln -sf $FROM/error404.html $TO/error404.html

exit
