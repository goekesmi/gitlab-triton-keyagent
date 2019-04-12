#!/bin/env node

const Gitlab = require('gitlab/dist/es5').default
var fs = require("fs");


var config = require( "./mantaconfig.json" )

var gitlabconfig = require( "./gitlabconfig.json" )

var mantakeys = require( "./mantablob.json")

console.log (mantakeys);

var fs = require('fs');
var smartdc = require('smartdc');

var client = smartdc.createClient({
    sign: smartdc.privateKeySigner({
        key: fs.readFileSync(process.env.HOME + '/.ssh/id_rsa', 'utf8'),
        keyId: process.env.SDC_KEY_ID,
        user: process.env.SDC_ACCOUNT
    }),
    user: process.env.SDC_ACCOUNT,
    url: process.env.SDC_URL
});

const api = new Gitlab(gitlabconfig )

// List all users, delete users that don't exist in my config
client.listUsers(function(err, users) {
    if (err) {
        console.log('Unable to list users: ' + err);
        return;
    }

    users.forEach(function(m) {
        console.log('User: ' + JSON.stringify(m, null, 2));
	console.log( mantakeys.subuserkeys[m.login] )
	if ( typeof mantakeys.subuserkeys[m.login] == 'undefined' )
		{ 
		console.log ('deleting user ' + m.login )
		client.deleteUser(m, function(err) {
			    if (err) {
				console.log('Unable to delete user: ' + err);
				return;
			    }
				console.log('User deleted. ');
			}

) }
	
    });
});
// Add all users that don't exist in my configuration
mantakeys.users.forEach(function(m) {
	client.getUser(m, function(err,user) {
		if (err) {
        		console.log('err: ' + err);
			console.log( err.stringify)
			if (String(err).lastIndexOf('ResourceNotFoundError',0) == 0 ) {
				console.log ( 'I should create it.')
				client.createUser({'login': m, 'password':"none123$%^", 'email':m+"@msu.edu"}, function(err) {
					if (err) {
                                console.log('Unable to create user: ' + err);
                                return;
                            }
                                console.log('User created. ');
                        } )

				}
                       	return;
                        }
                console.log('User ' + user);

	})

});
// For each user delete keys that don't exist in my configuration
mantakeys.users.forEach(function(m) {
	client.listUserKeys(m, function(err,keys) {
		if (err) {
        		console.log('err: ' + err);
                       	return;
			}
		console.log( keys )

	})
} );

// For each user add keys that exist in my configuration
mantakeys.users.forEach(function(m) {
	client.getUser(m, function(err,user) {
		if (err) {
        		console.log('err: ' + err);
                       	return;
			}
		console.log( mantakeys.subuserkeys )
		mantakeys.subuserkeys[m].keys.forEach(function(key) {
			client.uploadUserKey(user, {'key': key }, 
				function(err,key) {
				if (err) {
					console.log('err: ' + err);
					return;
					}
				console.log('key ' + key );	}
				) } )
				return;
                        } )

	})


