#!/bin/env node

const Gitlab = require("gitlab/dist/es5").default;
var fs = require("fs");

var config = require("./mantaconfig.json");

var gitlabconfig = require("./gitlabconfig.json");

const api = new Gitlab(gitlabconfig);

function FillOutConfig(hostconfig) {
  if (typeof hostconfig.projects == "undefined") {
    hostconfig.projects = [];
  }
  if (typeof hostconfig.groups == "undefined") {
    hostconfig.groups = [];
  }
  if (typeof hostconfig.groups_owners == "undefined") {
    hostconfig.groups_owners = [];
  }
  if (typeof hostconfig.users == "undefined") {
    hostconfig.users = [];
  }
  ExpandProjects(hostconfig);
}

// Expands group listings to users, and adds each user to the userlist on the in memory structure
function ExpandProjects(hostconfig) {
  gitlabprojects = api.Projects.all().then(gitlabprojects => {
    // Reduce the list of projects to the projects I've selected.
    const selectedprojects = gitlabprojects.filter(function(element) {
      return hostconfig.projects.indexOf(element.name) >= 0;
    });

    // There may be more than one project, Generate a list of jobs to
    // get each group membership and add it to the list.  Parallel and async.
    var jobs = selectedprojects.map(function(project) {
      return api.ProjectMembers.all(project.name).then(members => {
        members.forEach(function(member) {
          hostconfig.users.push(member.username);
        });
      });
    });
    // Dispatch the jobs, wait for all to complete.
    Promise.all(jobs).then(result => {
      // Deduplicate the listing os users
      hostconfig.users = Array.from(new Set(hostconfig.users));
      hostconfig.expandprojectsdone = true;
      // go add the users in the Groups
      ExpandGroups(hostconfig);
    });
  });
}

// Expands group listings to users, and adds each user to the userlist on the in memory structure
function ExpandGroups(hostconfig) {
  gitlabgroups = api.Groups.all().then(gitlabgroups => {
    // Reduce the list of groups to the groups I've selected.
    const selectedgroups = gitlabgroups.filter(function(element) {
      return hostconfig.groups.indexOf(element.name) >= 0;
    });

    // There may be more than one group, Generate a list of jobs to
    // get each group membership and add it to the list.  Parallel and async.
    var jobs = selectedgroups.map(function(group) {
      return api.GroupMembers.all(group.name).then(members => {
        members.forEach(function(member) {
          hostconfig.users.push(member.username);
        });
      });
    });
    // Dispatch the jobs, wait for all to complete.
    Promise.all(jobs).then(result => {
      // Deduplicate the listing os users
      hostconfig.users = Array.from(new Set(hostconfig.users));
      hostconfig.expandgroupdone = true;
      // go add the listing of keys for this host
      ExpandGroupsOwners(hostconfig);
    });
  });
}

// Expands group listings to users, and adds each user to the userlist on the in memory structure
// This adds a filter for group members that are at level 50, aka owner
function ExpandGroupsOwners(hostconfig) {
  gitlabgroups = api.Groups.all().then(gitlabgroups => {
    // Reduce the list of groups to the groups I've selected.
    const selectedgroups = gitlabgroups.filter(function(element) {
      return hostconfig.groups_owners.indexOf(element.name) >= 0;
    });

    // There may be more than one group, Generate a list of jobs to
    // get each group membership and add it to the list.  Parallel and async.
    var jobs = selectedgroups.map(function(group) {
      return api.GroupMembers.all(group.name).then(members => {
        members.forEach(function(member) {
          if (member.access_level == 50) {
            hostconfig.users.push(member.username);
          }
        });
      });
    });
    // Dispatch the jobs, wait for all to complete.
    Promise.all(jobs).then(result => {
      // Deduplicate the listing os users
      hostconfig.users = Array.from(new Set(hostconfig.users));
      hostconfig.expandgroupdone = true;
      // go add the listing of keys for this host
      AddKeys(hostconfig);
    });
  });
}

// Adds the keys for the listed users to the hostconfig.
function AddKeys(hostconfig) {
  if (typeof hostconfig.keys == "undefined") {
    hostconfig.keys = [];
  }
  if (typeof hostconfig.subuserkeys == "undefined") {
    hostconfig.subuserkeys = {};
  }
  gitlabusers = api.Users.all().then(gitlabusers => {
    // Only use the users listed, and only if they are set to 'active'
    const selectedusers = gitlabusers.filter(function(element) {
      return (
        hostconfig.users.indexOf(element.username) >= 0 &&
        element.state == "active"
      );
    });
    // Job to go get each user's keys and add them to the key list.

    var jobs = selectedusers.map(function(user) {
      hostconfig.subuserkeys[user.username] = {};
      hostconfig.subuserkeys[user.username].keys = [];
      return api.UserKeys.all({ userId: user.id }).then(keys => {
        keys.forEach(function(e) {
          hostconfig.subuserkeys[user.username].keys.push(e.key);
        });
      });
    });
    // Dispatch all jobs and wait for them to complete.
    Promise.all(jobs).then(result => {
      hostconfig.addkeysdone = true;
      // Time to go write out the authorized key files
      GenerateSubuserKeys(hostconfig);
    });
  });
}

function GenerateSubuserKeys(hostconfig) {
  console.log(JSON.stringify(hostconfig));
}

FillOutConfig(config.subusers);
