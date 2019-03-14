#!/bin/env bash

rm ./auth_keys/*

./update-sshkeys.js
./triton-load-to-containers.sh  


