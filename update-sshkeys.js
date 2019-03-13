#!/bin/env node

const Gitlab = require('gitlab/dist/es5').default
var fs = require("fs");


var config = require( "./hostconfig.json" )

var gitlabconfig = require( "./gitlabconfig.json" )

const api = new Gitlab(gitlabconfig )

// Expands group listings to users, and adds each user to the userlist on the in memory structure
function ExpandProjects(hostconfig) {
	gitlabprojects = api.Projects.all()
	.then( (gitlabprojects) => {
		// Reduce the list of projects to the projects I've selected.
		const selectedprojects = gitlabprojects.filter( function(element) { return hostconfig.projects.indexOf(element.name) >= 0; }); 

		// There may be more than one project, Generate a list of jobs to 
		// get each group membership and add it to the list.  Parallel and async.
		var jobs = selectedprojects.map( function (project) {
				return api.ProjectMembers.all(project.name)
					.then( (members) => {
					members.forEach( function(member) { hostconfig.users.push(member.username) })
					})
				})
		// Dispatch the jobs, wait for all to complete.
		Promise.all(jobs).then( (result) => { 
			// Deduplicate the listing os users
			hostconfig.users = Array.from(new Set (hostconfig.users));
			hostconfig.expandprojectsdone=true;
			// go add the users in the Groups 
			ExpandGroups(hostconfig);
		})

	})

}

// Expands group listings to users, and adds each user to the userlist on the in memory structure
function ExpandGroups(hostconfig) {
	gitlabgroups = api.Groups.all()
	.then( (gitlabgroups) => {
		// Reduce the list of groups to the groups I've selected.
		const selectedgroups = gitlabgroups.filter( function(element) { return hostconfig.groups.indexOf(element.name) >= 0; }); 

		// There may be more than one group, Generate a list of jobs to 
		// get each group membership and add it to the list.  Parallel and async.
		var jobs = selectedgroups.map( function (group) {
				return api.GroupMembers.all(group.name)
					.then( (members) => {
					members.forEach( function(member) { hostconfig.users.push(member.username) })
					})
				})
		// Dispatch the jobs, wait for all to complete.
		Promise.all(jobs).then( (result) => { 
			// Deduplicate the listing os users
			hostconfig.users = Array.from(new Set (hostconfig.users));
			hostconfig.expandgroupdone=true;
			// go add the listing of keys for this host
			AddKeys(hostconfig);
		})

	})

}


// Adds the keys for the listed users to the hostconfig.
function AddKeys(hostconfig) {
	hostconfig.keys =[];
	gitlabusers = api.Users.all()
	.then( (gitlabusers) => {
		// Only use the users listed, and only if they are set to 'active'
		const selectedusers = gitlabusers.filter( function(element) { return hostconfig.users.indexOf(element.username) >= 0 && element.state == 'active' ; }); 
		// Job to go get each user's keys and add them to the key list.
		var jobs = selectedusers.map( function (user) {
				return api.UserKeys.all({userId: user.id} )
					.then((keys) => {
					keys.forEach( function(e) {hostconfig.keys.push(e.key)});
					}) } );
		// Dispatch all jobs and wait for them to complete.
		Promise.all(jobs).then( (result) => {
			hostconfig.addkeysdone=true;
			// Time to go write out the authorized key files
			GenerateAuthorizedKeys(hostconfig)
			})
		})
	}
	
	
function GenerateAuthorizedKeys(hostconfig) {
	var keys = "#### This file maintained by Gitlab-triton-keyagent \n#### Local changes will be automatically overwritten"
	console.log ( hostconfig.username + '@' + hostconfig.host );
	hostconfig.keys.forEach( function (key) { keys = keys + '\n' + key } );
	keys = keys + '\n'

	fs.writeFile("./auth_keys/" + hostconfig.username + '@' + hostconfig.host , keys, function(err, data) {
  		if (err) console.log(err);
		});

}


config.forEach( function(host) { 
	ExpandProjects(host) 
	});


