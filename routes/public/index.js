var express = require('express');
var util = require("../../util/util")
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
    var collection = req.db.get("articles");
    collection.find({}, {
        limit: 17,
        sort: {
            date: 1
        }
    }, function(e, docs) {
      res.render("home", {data: docs});
    });
});

router.get('/section/:section', function(req, res, next) {
    var sectionId = util.sectionToId(req.params.section);

    var collection = req.db.get("articles");
    collection.find({section: sectionId}, {
        limit: 12,
        sort: {
            date: 1
        }
    }, function(e, docs) {
      res.render("section", {section: util.idToSection(sectionId), title:"Recent environemental articles in the section " + util.idToSection(sectionId),  data: docs});
    });
});

router.get('/search', function(req, res, next) {
    res.render("search", {section: "Search", title: "Search for environmental articles by Exonians"});
});

router.get('/article/:title', function(req, res, next) {

    var collection = req.db.get("articles");
    var title = (req.params.title) ? req.params.title.toLowerCase() : "";
    if (title.length > 0) {
        console.log("finding url " + title);
        collection.find({
            url: title
        }, {}, function(e, docs) {
            if (docs && docs[0]) {
                //render that article
                docs[0].section = util.idToSection(docs[0].section);
                res.render("article", docs[0])

            } else {
                res.json({
                    error: "true"
                })
            }
        });
    } else {
        res.json({
            error: "true"
        })
    }

});

router.get('/author/:email', function(req, res, next) {
    var articles = req.db.get("articles");
    var author = req.db.get("authors");

    var data = {};
    author.find({email: req.params.email}, {}, function(e, docs){
      if(e || !docs || !docs[0]){

      }else{
        data.author = docs[0];
        articles.find({authors: req.params.email}, {}, function(e, arts){
            data.articles = arts;
            res.render("author", data);
        });
      }
    });

});

router.get('/about', function(req, res, next) {
    var collection = req.db.get("authors");
    collection.find({visible: true}, {}, function(e, docs){
        res.render("about", {data: docs});
    });
});

router.get('/exeter', function(req, res, next) {
    res.render("exeter");
});
module.exports = router;
