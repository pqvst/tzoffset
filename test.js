const async = require("async");
const moment = require("moment");
const mongo = require("mongodb");
const client = mongo.MongoClient;

const generator = require("./generator");
const DB_URL = "mongodb://<username>:<password>@<hostname>:<port>/<database>";
const DB_COLLECTION = "tzoffset_test";


let db, res;
async.waterfall([

    // connect to database
    function (done) {
        client.connect(DB_URL, (err, _db) => {
            db = _db;
            done(err);
        });
    },

    //------------------------------------------------------
    // drop test collection
    //function (done) {
    //    db.collection(DB_COLLECTION).drop((err) => {
    //        done(err);
    //    });
    //},
    //------------------------------------------------------

    //------------------------------------------------------
    // insert test documents
    //function (done) {
    //    const docs = [
    //        { time: new Date("2016-03-27T00:59:59Z"), name: "CET" },
    //        { time: new Date("2016-03-27T01:00:00Z"), name: "CEST" },
    //        { time: new Date("2016-03-27T01:00:01Z"), name: "CEST" },
    //        { time: new Date("2016-10-30T00:59:59Z"), name: "CEST" },
    //        { time: new Date("2016-10-30T01:00:00Z"), name: "CET" },
    //        { time: new Date("2016-10-30T01:00:01Z"), name: "CET" }
    //    ];
    //    db.collection(DB_COLLECTION).insert(docs, (err, res) => {
    //        done(err);
    //    })
    //},
    //------------------------------------------------------

    // perform test query
    function (done) {
        const start = moment.utc("2016-01-01T00:00:00Z");
        const end = moment.utc("2017-01-01T00:00:00Z");
        const tz = "Europe/Berlin";

        const cond = generator(start, end, tz);
        db.collection(DB_COLLECTION).aggregate([
            {
                $project: {
                    name: "$name",
                    time_orig: "$time",
                    time_conv: cond
                }
            },
            {
                $limit: 100
            }
        ]).toArray((err, _res) => {
            res = _res;
            done(err);
        });
    }

], (err) => {

    if (err) {
        console.error(err);
    } else {
        console.log(res);
    }

    if (db) {
        db.close();
    }

});