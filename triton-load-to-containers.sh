#!/bin/env bash

cd auth_keys

for file in *; do
	IFS="@" read -ra FILE <<< $file
	triton ssh ${FILE[1]} "su - ${FILE[0]} -c 'cat > .ssh/authorized_keys'" < $file
done 
