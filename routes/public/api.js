var express = require('express');
var util = require("../../util/util")
var router = express.Router();

/* GET users listing. */


router.get('/list-articles', function(req, res, next) {


    var collection = req.db.get("articles")
    var number = (parseInt(req.query.number)) ? parseInt(req.query.number) : 0;
    collection.aggregate(
        [{
            $match: {
                "url": {
                    $ne: req.query.url
                }
            }
        }, {
            $sample: {
                size: number
            }
        }],
        function(e, docs) {


            if (e) res.json(e);
            else res.json(docs);

        });

});

router.get('/search', function(req, res, next) {


    var collection = req.db.get("articles")
    var querys = (req.query.query.toString()).split(" ").splice(0, 6);
    var frequencymap = {};
    iterateQueries(collection, frequencymap, 0, querys, function() {
        //sort frequency map by frequuncy

        var sorted = [];
        for (a in frequencymap) {
            sorted.push([a, frequencymap[a]])
        }
        sorted.sort(function(a, b) {
            return a[1].value - b[1].value;
        });
        sorted.reverse();
        res.json(sorted);
    });

});

function getAllResults(collection, field, query, score, frequencymap, callback) {
    var runid = new Date().getTime();
    var search = {};


    search[field] = {
        $regex: "\\b" + query + "\\b",
        $options: 'i' //i: ignore case, m: multiline, etc
    };

    collection.find(search, {}, function(e, docs) {

        for (var i = 0; i < docs.length; i++) {
            var doc = docs[i];
            if (!frequencymap[doc._id]) frequencymap[doc._id] = {value:0, article: doc};
            frequencymap[doc._id].value += score;
        }
        
        callback();
    });
}

function iterateQueries(collection, frequencymap, i, querys, callback) {

    if (i >= querys.length) {
        callback();
    } else {


        getAllResults(collection, "title", querys[i], 3, frequencymap, function() {
            getAllResults(collection, "authorInfoString", querys[i], 4, frequencymap, function() {
                //do the last one on our own

               //replace with real author name
                var count = 0;
                for (var prop in frequencymap) {
                    if (frequencymap.hasOwnProperty(prop)) {
                        ++count;
                    }
                }


                if (count < 5) {

                    getAllResults(collection, "content", querys[i], 1, frequencymap, function() { //replace with real author name

                        iterateQueries(collection, frequencymap, (i + 1), querys, callback);
                    });
                } else {
                    iterateQueries(collection, frequencymap, (i + 1), querys, callback);
                }
            });
        });
    }
}

module.exports = router;
