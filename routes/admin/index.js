var express = require('express');
var passport = require('passport');
var Account = require('../../models/account');
var router = express.Router();

var googledrive = require("../../util/googledrive.js");
var pSaver = require("../../util/picturesaver");
var util = require("../../util/util")
var fs = require('fs');

var multer = require('multer')
var upload = multer({
    dest: 'tmp/'
});

router.get('/register', function(req, res) {
    res.render('adminregister', {});
});

router.post('/register', function(req, res, next) {
    if (req.user && req.user.username == "admin") {
        Account.register(new Account({
            username: req.body.username
        }), req.body.password, function(err, account) {
            if (err) {
                return res.render('adminregister', {
                    error: err.message
                });
            }

            passport.authenticate('local')(req, res, function() {
                req.session.save(function(err) {
                    if (err) {
                        return next(err);
                    }
                    res.redirect('/admin');
                });
            });
        });
    } else {
        res.send("MUST BE Admin of Admins to add new user");
    }

});


router.get('/login', function(req, res) {
    res.render('adminlogin', {
        user: req.user,
        error: req.flash('error')
    });
});

router.post('/login', passport.authenticate('local', {
    failureRedirect: '/admin/login',
    failureFlash: true
}), function(req, res, next) {
    req.session.save(function(err) {
        if (err) {
            return next(err);
        }
        res.redirect('/admin');
    });
});

router.get('/logout', function(req, res, next) {
    req.logout();
    req.session.save(function(err) {
        if (err) {
            return next(err);
        }
        res.redirect('/');
    });
});

router.get('/ping', function(req, res) {
    res.status(200).send("pong!");
});



//MANAGEMENT UI routes

router.get('/', isAuthenticated, function(req, res) {
    res.render('admindashboard.ejs');
});

router.get('/article', isAuthenticated, function(req, res) {
    res.render('adminarticle.ejs', {
        potentialArticle: null,
        error: null
    });
});

router.post('/new-article', isAuthenticated, function(req, res) {
    var id = req.body.googleid;

    //get the article
    util.googleIdIsUsed(req.db.get("articles"), id, function(message) {
        if (message.error) {

            res.json(message);


        } else {
            googledrive.getArticle(id, function(article) {
                if (article != false) {
                    savepictureHelper(0, article, function() {
                        article.googleid = id;
                        console.log('about to get author info')
                        util.getAuthorInfo(req.db.get("authors"), article, function(info) {
                            article.authorInfo = info;
                            article.authorInfoString = JSON.stringify(info);
                            res.json(article);
                        });

                    });
                } else {
                    res.json({
                        error: "not able to retrieve article"
                    });
                }

            });
        }
    });
});

router.post('/confirm-article', isAuthenticated, function(req, res) {
    var articleToSave = JSON.parse(req.body.article);
    var collection = req.db.get("articles");

    util.googleIdIsUsed(collection, articleToSave.googleid, function(message) {
        if (message.error) {
            res.json(message);
        } else {
            console.log("getting unique url")
            util.getUniqueUrl(articleToSave.title, collection, function(url) {
                articleToSave.url = url;
                //add 180 character summary

                articleToSave.summary = util.getSummary(articleToSave.content);

                req.db.get("articles").insert(articleToSave, function(err, doc) {
                    res.json({
                        success: true
                    });
                });
            });
        }
    });


});

router.get('/list-articles', isAuthenticated, function(req, res) {
    var collection = req.db.get("articles");

    collection.find({}, {
        limit: 25,
        sort: {
            date: 1
        },
        fields: {
            title: 1,
            googleid: 1,
            url: 1
        }
    }, function(e, docs) {
        if (e) {
            res.json({
                error: "Problem accessing database"
            });
        }
        res.json({
            "article": docs
        });
    });
});

router.get('/list-all-articles', isAuthenticated, function(req, res) {
    var collection = req.db.get("articles");

    collection.find({}, {
        sort: {
            date: 1
        },
        fields: {
            title: 1,
            googleid: 1,
            url: 1
        }
    }, function(e, docs) {
        if (e) {
            res.json({
                error: "Problem accessing database"
            });
        }
        res.json({
            "article": docs
        });
    });
});

router.post('/delete-article', isAuthenticated, function(req, res) {
    var collection = req.db.get("articles");
    var id = req.body.id;
    collection.remove({
        _id: id
    }, function(e, docs) {
        if (e) res.json({
            success: false
        });
        else res.json({
            success: true
        });
    });
});

router.post('/refresh-article', isAuthenticated, function(req, res) {
    var collection = req.db.get("articles");
    var id = req.body.id;
    collection.find({
        _id: id
    }, {}, function(e, docs) {
        if (e || !docs[0]) {
            res.json({
                error: "Could not find article"
            });
        } else {
            var googleId = docs[0].googleid;
            googledrive.getArticle(googleId, function(article) {

                if (article != false) {
                    savepictureHelper(0, article, function() {
                        article.googleid = googleId;
                        if (article.title != docs[0].title) {
                            util.getUniqueUrl(article.title, collection, function(url) {
                                article.url = url;
                                util.getAuthorInfo(req.db.get("authors"), article, function(info) {
                                    article.authorInfo = info;
                                    article.authorInfoString = JSON.stringify(info);
                                    article.summary = util.getSummary(article.content);
                                    collection.update({
                                        _id: id
                                    }, article, function(err, updatedata) {
                                        if (err) res.json({
                                            error: "Could not find article"
                                        });
                                        else res.json(article)
                                    });

                                });
                            });
                        } else {
                            article.url = docs[0].url;
                            util.getAuthorInfo(req.db.get("authors"), article, function(info) {
                                article.authorInfo = info;
                                article.authorInfoString = JSON.stringify(info);
                                article.summary = util.getSummary(article.content);
                              collection.update({
                                  _id: id
                              }, article, function(err, updatedata) {
                                  if (err) res.json({
                                      error: "Could not find article"
                                  });
                                  else res.json(article)
                              });
                            });
                        }
                    });
                } else {
                    res.json({
                        error: "not able to retrieve article"
                    });
                }

            });
        }

    });
});

router.post('/preview-article', isAuthenticated, function(req, res) {
    var collection = req.db.get("articles");
    var id = req.body.id;
    collection.find({
        _id: id
    }, function(e, docs) {
        if (e || !docs[0]) res.json({
            error: "Could not find article"
        });
        else res.json(docs[0]);
    });
});

router.get('/list-authors', isAuthenticated, function(req, res) {
    var collection = req.db.get("authors");
    collection.find({}, {}, function(e, docs) {
        res.json(docs);
    });
});

router.post('/delete-author', isAuthenticated, function(req, res) {
    var collection = req.db.get("authors");
    var id = req.body.id;
    collection.remove({
        _id: id
    }, function(e, docs) {
        if (e) res.json({
            success: false
        });
        else res.json({
            success: true
        });
    });
});

router.get('/delete-author', isAuthenticated, function(req, res) {
    var collection = req.db.get("author");
    var id = req.body.id;
    collection.remove({
        _id: id
    }, function(e, docs) {
        if (e) res.json({
            success: false
        });
        else res.json({
            success: true
        });
    });
});

router.get('/edit-author/:email', isAuthenticated, function(req, res) {
    var collection = req.db.get("authors");
    var email = req.params.email.toString();

    if (email.length < 1) {
        res.render("admineditauthor", {
            email: null,
            name: null,
            about: null,
            visible: false
        });
    } else {
        collection.find({
            "email": email
        }, {}, function(e, docs) {
            if (docs && docs.length > 0)
                res.render("admineditauthor", docs[0]);
            else
                res.render("admineditauthor", {
                    email: null,
                    name: null,
                    about: null,
                    visible: false
                });
        });
    }
});

router.get('/edit-author', isAuthenticated, function(req, res) {
    res.render("admineditauthor", {
        email: null,
        name: null,
        about: null,
        visible: false
    });
});

router.post('/edit-author', isAuthenticated, upload.single('image'), function(req, res) {

    if (req.file) {
        pSaver.saveAuthor(req.file.path, req.body.email, function() {
            req.db.get("authors").update({
                email: req.body.email
            }, req.body, {
                upsert: true,
                safe: false
            }, function(e, docs) {

                res.redirect("/admin/authors");
            })
        });
    } else {
      console.log(req.body.visible);
      if(!req.body.visible) req.body.visible = "false";
      if(req.body.visible.toString() === "true" || req.body.visible.toString() === "on" ) req.body.visible = true;
      else req.body.visible = false;

        req.db.get("authors").update({
            email: req.body.email
        }, req.body, {
            upsert: true,
            safe: false
        }, function(e, docs) {

            res.redirect("/admin/authors");
        })
    } // form fields


    //additionally update articles
    util.updateAuthor(req.db.get("articles"), req.body.email.toString(), req.body.name.toString());


});

router.get('/authors', isAuthenticated, function(req, res) {
    var collection = req.db.get("authors");
    var id = req.body.id;

    collection.find({}, {}, function(e, docs) {
        res.render("adminauthors", {
            data: docs
        });
    });
});

router.post('/toggle-visible', isAuthenticated, upload.single('image'), function(req, res) {
    var collection = req.db.get("authors");
    console.log(req.body.visible)

    var vis = req.body.visible.toString() === "true";
    console.log("setting it to " + vis);
    collection.update({
        _id: req.body.id
    }, {
        $set: {
            visible: vis
        }
    }, {}, function(er, d) {
        res.json({
            error: false
        });
    });
});
var savepictureHelper = function(index, article, callback) {
    if (index == article.imageURL.length) {
        callback();
    } else {
        pSaver.savePicture(article.imageURL[index], article.imageID[index], function() {
            savepictureHelper(index + 1, article, callback);
        });
    }

}




//ROUTES FOR MANAGING ARTICLES




function isAuthenticated(req, res, next) {
    if (req.isAuthenticated())
        return next();
    else
        res.redirect('/admin/login');
}

module.exports = router;
