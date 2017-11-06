import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var'

import './body.html';

var interval = null;

Meteor.startup(function() {
  Meteor.subscribe('emojis');
});

function timeSince(date) {
  var seconds = Math.floor((new Date() - date) / 1000);
  var interval = Math.floor(seconds / 31536000);
  if (interval > 1)
  return interval + " years";
  interval = Math.floor(seconds / 2592000);
  if (interval > 1)
  return interval + " months";
  interval = Math.floor(seconds / 86400);
  if (interval > 1)
  return interval + " days";
  interval = Math.floor(seconds / 3600);
  if (interval > 1)
  return interval + " hours";
  interval = Math.floor(seconds / 60);
  if (interval > 1)
  return interval + " minutes";
  return Math.floor(seconds) + " seconds";
}

function registerEvent(obj)
{
  for (var index = 0; index < obj.length; index++) {
    Meteor.call("eventQuery", obj[index].events_url, obj[index].etag, index, function(error, results) {
      if (error) {
        console.log(error);
      } else {
        if (obj[results.index].etag == null) {
          obj[results.index].etag = results.response.headers.etag;
          // ETag init.
        } else if (results.response.statusCode == 304) {
          // Nothing to update.
        }  else {
          console.log("Must update " + obj[results.index].name + ', ' + results.response.data[0].type + ".");
          obj[results.index].etag = results.response.headers.etag;
          Meteor.call("getQuery", "https://api.github.com/repositories/" + obj[results.index].id, function(error, result) {
            if (error) {
              console.log(error);
            } else {
              obj[results.index].name = result.data.name;
              obj[results.index].created_at = timeSince(Date.parse(result.data.created_at));
              obj[results.index].description = result.data.description;
              obj[results.index].stars = result.data.watchers_count;
              obj[results.index].forks = result.data.forks_count;
              Session.set('repositories', obj);
            }
          });
        }
      }
    });

  }
}


function launchQuery(query) {
  Meteor.call("getQuery", query, function(error, results) {
    if (error) {
      if (error != null && error != false)
      Session.set('repositories', [{name: error.reason, created_at: 'few seconds', description: 'Sorry !', stars: 'Stars', forks: 'Forks'}]);
    }
    else {
      var data = [];
      if (results.data.incomplete_results) {
        console.log("The Github API has timed out, reloading...");
        launchQuery(query);
      }
      else {
        for (var index = 0; index < results.data.items.length; index++) {
          var obj = {};
          for (var item in results.data.items[index]) {
            if (item == 'id' && results.data.items[index].hasOwnProperty(item))
            obj.id = results.data.items[index][item];
            if (item == 'name' && results.data.items[index].hasOwnProperty(item))
            obj.name = results.data.items[index][item];
            else if (item == 'html_url' && results.data.items[index].hasOwnProperty(item))
            obj.url = results.data.items[index][item];
            else if (item == 'created_at' && results.data.items[index].hasOwnProperty(item))
            obj.created_at = timeSince(Date.parse(results.data.items[index][item]));
            else if (item == 'description' && results.data.items[index].hasOwnProperty(item))
            obj.description = results.data.items[index][item];
            else if (item == 'watchers_count' && results.data.items[index].hasOwnProperty(item))
            obj.stars = results.data.items[index][item];
            else if (item == 'forks_count' && results.data.items[index].hasOwnProperty(item))
            obj.forks = results.data.items[index][item];
            else if (item == 'events_url' && results.data.items[index].hasOwnProperty(item))
            obj.events_url = results.data.items[index][item];
          }
          obj.etag = null;
          data.push(obj);
        }
        Session.set('repositories', data);
        registerEvent(data);
        if (interval != null) {
          clearInterval(interval);
          interval = null;
        }
        interval = setInterval(function() {registerEvent(data);}, /*7200*/8000);
      }
    }
  });
}

Template.body.onCreated(function bodyOnCreated(){
  Session.setDefault('repositories', [{ name: 'Waiting for the server response...', created_at: 'few seconds', description: 'Should be here any seconds now !', stars: 'Stars', forks: 'Forks'}]);
  Session.setDefault('tag_repositories', "Node.js");
  var search_pages = [];
  for (var index = 0; index < 5; index++) {
    var obj = {};
    obj.index = index + 1;
    obj.current_index = 1;
    search_pages.push(obj);
  }
  Session.setDefault('search_pages', search_pages);
  if (Meteor.isClient) {
    launchQuery("https://api.github.com/search/repositories?q=stars%3A%3E1+" + Session.get('tag_repositories').toLowerCase().replace(/\.js$/, "js") + "&sort=stars&order=desc&per_page=10&page=" + Session.get('search_pages')[0].current_index);
  }
});

Template.registerHelper('equals', function (a, b) {
  return a === b;
});

Template.registerHelper('last_index', function (a) {
  var l = Session.get('search_pages').length;
  return a === l;
});

Template.body.helpers({
  repositories: function () {
    return Session.get('repositories');
  },
  tag_repositories: function () {
    return Session.get('tag_repositories');
  },
  search_pages: function () {
    return Session.get('search_pages');
  }
});

if (Meteor.isClient) {
  Template.body.events({
    'click .dropdown-item': function (event) {
      event.preventDefault();
      if (interval != null) {
        clearInterval(interval);
        interval = null;
      }
      launchQuery("https://api.github.com/search/repositories?q=stars%3A%3E1+" + event.target.text.toLowerCase().replace(/\.js$/, "js") + "&sort=stars&order=desc&per_page=10&page=" + Session.get('search_pages')[0].current_index);
      Session.set('tag_repositories', event.target.text);
    },
    'click .page-link': function (event) {
      event.preventDefault();
      var data = Session.get('search_pages');
      var target;
      if (event.target.text == 'Next') {
        target = data[0].current_index + 1;
        if (target > data.length)
          target = data.length;
      } else if (event.target.text == 'Previous') {
        target = data[0].current_index - 1;
        if (target < 1)
          target = 1;
      } else {
        target = parseInt(event.target.text);
        if (target < 1)
          target = 1;
        if (target > data.length)
          target = data.length;
      }
      for (var index = 0; index < data.length; index++) {
        data[index].current_index = target;
      }
      if (interval != null) {
        clearInterval(interval);
        interval = null;
      }
      launchQuery("https://api.github.com/search/repositories?q=stars%3A%3E1+" + Session.get('tag_repositories').toLowerCase().replace(/\.js$/, "js") + "&sort=stars&order=desc&per_page=10&page=" + data[0].current_index);
      Session.set('search_pages', data);
    }
  });
}
