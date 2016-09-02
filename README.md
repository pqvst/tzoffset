# tzoffset
This utility helps convert times from UTC to a specified timezone in mongo (database-side rather than application side). This is crucial when aggregating data by date ranges (for example aggregate by day/week/month in a specific timezone). This cannot be done application-side since the bucketing will be wrong.

A naive solution simply applies a constant offset to all dates. However, when the dataset contains varying timezone offsets (e.g. daylight savings time) then this method will yield incorrect results. This utility solves that issue.

![Screenshot](/screenshot.png)

## Features
* Specify start/end range
* Specify target timezone
* Generate $cond expression

## How to use
The generator takes a start date, end date, and a target timezone. The source timezone is assumed UTC.

    generator(start, end, timezone) { ... }

The generator returns a mongo $cond expression that can be used directly for projecting. The function assumes that the time is in a field called ``time``. This can easily be changed as needed.

    // specify start, end, and target timezone
    const start = moment.utc("2016-01-01T00:00:00Z");
    const end = moment.utc("2017-01-01T00:00:00Z");
    const tz = "Europe/Berlin";
    
    // generate the $cond expression
    const cond = generator(start, end, tz);
    
    // create a projection
    db.collection(DB_COLLECTION).aggregate([
        {
            $project: {
                name: "$name",
                time_orig: "$time",
                time_conv: cond
            }
        }
    ]).toArray((err, res) => {
        console.log(res);
    });


## How it works
The generator works like this:

First, fetch zone object from ``moment-timezone`` for the timezone

Then, find all ``{ until, offset }`` pairs for the specified start-end range

Recursively build the $cond expression:

    $cond: {
        if: { $lt: ["$time", new Date(until)] },
        then: { $subtract: ["$time", offset] },
        else: { 
            $cond: { ... } 
        }
    }

For a start-end range that doesn't contain any boundaries, the condition will look something like this:

    {
        "$subtract": ["$time", -3600000]
    }

For a more complicated start-end range containing one or more boundaries, the condition will be a bit more complicated:

    {
        "$cond": {
            "if": {
                "$lt": ["$time",new Date("2016-03-27T01:00:00.000Z")]
            },
            "then": {
                "$subtract": ["$time",-3600000]
            },
            "else": {
                "$cond": {
                    "if": {
                        "$lt": ["$time",new Date("2016-10-30T01:00:00.000Z")]
                    },
                    "then": {
                        "$subtract": ["$time",-7200000]
                    },
                    "else": {
                        "$subtract": ["$time",-3600000]
                    }
                }
            }
        }
    }


## Discussion
* https://jira.mongodb.org/browse/SERVER-6310
* http://stackoverflow.com/questions/18852095/how-to-agregate-by-year-month-day-on-a-different-timezone
* http://stackoverflow.com/questions/31353740/aggregating-in-local-timezone-in-mongodb
