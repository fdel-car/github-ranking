import { Meteor } from 'meteor/meteor';
import { HTTP } from 'meteor/http'
import { check } from 'meteor/check'

Meteor.publish('emojis', function() {
  return Emojis.find();
});

if (Meteor.isServer) {
    Meteor.methods({
        getQuery: function (query) {
            check(query, String);
            this.unblock();
            try {
                return HTTP.call("GET", query + '?client_id=2df6abf2faef111e45b8&client_secret=f98521b3f893111e387c2844b54c8043b92b9ced', {'headers': {'User-Agent': 'app-test'}});
            } catch (error) {
                if (error.response.statusCode == 403) {
                    throw new Meteor.Error("rate-limit exceeded", "There's been too many call made to the Github API, please wait just a minute before reloading.");
                }
                return false;
            }
        },
        eventQuery: function (query, etag, index) {
            check(query, String);
            check(index, Number);
            if (etag != null) {
                check(etag, String);
            }
            this.unblock();
            try {
                if (etag == null) {
                    var results = {};
                    results.response = HTTP.call("GET", query + '?client_id=2df6abf2faef111e45b8&client_secret=f98521b3f893111e387c2844b54c8043b92b9ced', {'headers': {'User-Agent': 'app-test'}});
                    results.index = index;
                    return results;
                } else {
                    var results = {};
                    results.response = HTTP.call("GET", query + '?client_id=2df6abf2faef111e45b8&client_secret=f98521b3f893111e387c2844b54c8043b92b9ced', {'headers': {'User-Agent': 'app-test', 'If-None-Match': etag}});
                    results.index = index;
                    return results;
                }
            } catch (error) {
                if (error.response.statusCode == 304) {
                    throw new Meteor.Error("not-modified", "No new events since last check.");
                } else if (error.response.statusCode == 403) {
                  var rateLimitReset = new Date(error.response.headers['x-ratelimit-reset'] * 1000);
                  console.log("You must wait until " + rateLimitReset.getHours() + ':' + rateLimitReset.getMinutes() + " to do more event call to the Github API.");
                    throw new Meteor.Error("rate-limit exceeded", "You must wait until " + rateLimitReset.getHours() + ':' + rateLimitReset.getMinutes() + " to do more event call to the Github API.");
                }
                return false;
            }
        }
    });
}
