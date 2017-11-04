import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var'

import './main.html';

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

function registerEvent(obj, self)
{
  for (var index = 0; index < 1; index++) {
    // console.log(obj[index].events_url);
    Meteor.call("eventQuery", obj[index].events_url, obj[index].etag, index, function(error, results) {
      if (error) {
        // console.log(error);
      } else {
        console.log(results);
        if (obj[results.index].etag == null) {
          obj[results.index].etag = results.response.headers.etag;
        } else if (results.response.statusCode == 304) {
          console.log("Nothing to update");
        }  else {
          console.log("Must update");
          obj[results.index].etag = results.response.headers.etag;
          launchQuery(self, "https://api.github.com/search/repositories?q=stars%3A%3E1+nodejs&sort=stars&order=desc&per_page=10&page=0");
        }
        // console.log(obj[results.index].events_url);
      }
    });

  }
  // console.log(obj);

}


function launchQuery(self, query) {
  Meteor.call("getQuery", query, function(error, results) {
    if (error) {
      if (error != null && error != false)
      self.repositories.set([{name: error.reason}]);
    }
    else {
      var data = [];
      if (results.data.incomplete_results) {
        // self.repositories.set([{name: 'The Github API has timed out, reloading...'}]);
        launchQuery(self, query);
      }
      else {
        for (var index = 0; index < results.data.items.length; index++) {
          // console.log(results.data.items[index])
          var obj = {};
          for (var item in results.data.items[index]) {
            if (item == 'name' && results.data.items[index].hasOwnProperty(item))
            obj.name = results.data.items[index][item];
            else if (item == 'html_url' && results.data.items[index].hasOwnProperty(item))
            obj.url = results.data.items[index][item];
            else if (item == 'created_at' && results.data.items[index].hasOwnProperty(item))
            obj.created_at = timeSince(Date.parse(results.data.items[index][item]));
            else if (item == 'description' && results.data.items[index].hasOwnProperty(item))
            obj.description = results.data.items[index][item];
            else if (item == 'stargazers_count' && results.data.items[index].hasOwnProperty(item))
            obj.stars = results.data.items[index][item];
            else if (item == 'forks_count' && results.data.items[index].hasOwnProperty(item))
            obj.forks = results.data.items[index][item];
            else if (item == 'events_url' && results.data.items[index].hasOwnProperty(item))
            obj.events_url = results.data.items[index][item];
          }
          obj.etag = null;
          data.push(obj);
        }
        self.repositories.set(data);
        // registerEvent(data, self);
        // setInterval(function() {registerEvent(data, self);}, 10000);
      }
    }
  });
}

Template.body.onCreated(function bodyOnCreated(){
  var self = this;
  self.repositories = new ReactiveVar([{ name: 'Waiting for the server response...'}]);
  if (Meteor.isClient) {
    launchQuery(self, "https://api.github.com/search/repositories?q=stars%3A%3E1+nodejs&sort=stars&order=desc&per_page=10&page=0");
  }
});

Template.body.helpers({
  repositories: function () {
    // console.log(Template.instance().repositories.get());
    return Template.instance().repositories.get();
  }
});
