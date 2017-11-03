import { Meteor } from 'meteor/meteor';
import { HTTP } from 'meteor/http'
import { check } from 'meteor/check'

if (Meteor.isServer) {
    Meteor.methods({
        getQuery: function (query) {
            check(query, String);
            this.unblock();
            try {
                return HTTP.call("GET", query, {'headers': {'User-Agent': 'app-test'}});
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
                    // console.log("first-call");
                    var results = {};
                    results.response = HTTP.call("GET", query, {'headers': {'User-Agent': 'app-test'}});
                    results.index = index;
                    return results;
                } else {
                    // console.log("subsequent-call");
                    var results = {};
                    results.response = HTTP.call("GET", query, {'headers': {'User-Agent': 'app-test', 'If-None-Match': etag}});
                    results.index = index;
                    return results;
                }
                // console.log(query);
                // return true;
            } catch (error) {
                if (error.response.statusCode == 304) {
                    throw new Meteor.Error("not-modified", "No new events since last check.");
                } else if (error.response.statusCode == 403) {
                    console.log(new Date(error.response.headers['x-ratelimit-reset'] * 1000));
                    throw new Meteor.Error("rate-limit exceeded", "There's been too many call made to the Github API, please wait just a minute before reloading.");
                }
                return false;
            }
        }
    });
}
