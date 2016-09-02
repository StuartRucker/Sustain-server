var sectionToId = function(section) {


    if (section) {
        section = section.toString();
        section = (section.toLowerCase()).trim();
        if (section == "world") {
            return 1;
        } else if (section == "oped" || section == "op-ed") {
            return 2;
        } else if (section == "humor" || section == "humour") {
            return 3;
        } else if (section == "campus") {
            return 4;
        } else if (section == "tips" || section == "tip") {
            return 5;
        } else {
            return 0;
        }
    }

    return 0;
}

var sections = ["World", "Op-ed", "Humor", "Campus", "Tips"];
var idToSection = function(id) {
    id = parseInt(id);
    id = id - 1;
    if (id < 0 || id >= sections.length) {
        return "NONE";
    } else {
        return sections[id];
    }
}

var getUniqueUrl = function(title, collection, callback) {

    var newTitle = ((title.replaceAll(" ", "-")).replaceAll("\\?", "")).toLowerCase();
    newTitle = newTitle.replace(/[^a-zA-Z0-9-]/gi, "");
    urlHelper(0, newTitle, collection, function(correctUrl) {
        if (correctUrl == "db error") callback("db error");
        else callback(correctUrl);
    })
}

var urlHelper = function(index, title, collection, callback) {
    var newTitle = title + ((index == 0) ? "" : ("-" + index));
    if (newTitle.length < 1) newTitle = index.toString();
    collection.find({
        url: newTitle
    }, {}, function(e, docs) {
        if (e) callback("db error");

        if (docs.length == 0) {
            callback(newTitle);
        } else {
            urlHelper(index + 1, title, collection, callback);
        }
    })
}

//checks if an article with that googleid already exists
var googleIdIsUsed = function(collection, id, callback) {
    collection.find({
        googleid: id
    }, {
        fields: {
            _id: 1,
            title: 1,
            url: 1
        }
    }, function(e, docs) {
        if (e) callback({
            error: "database error"
        });

        if (docs.length == 0) {
            callback({
                success: true
            });
        } else {
            callback({
                error: "There already exists an article associated with this google id: <br> <a href ='/article/" + docs[0].url + "'>" + docs[0].title + "</a>"
            });
        }

    });
}

var updateAuthor = function(collection, email, name) {
    console.log("updateing author");
    collection.find({
        authors: email
    }, {}, function(e, docs) {
        console.log(docs.length + " results");
        for (var i = 0; i < docs.length; i++) {
            // console.log(JSON.stringify(docs[i]));
            //now iterate throught that articles articeInfo
            console.log("looping throught docs");
            if (docs[i].authorInfo) {

                for (var k = 0; k < docs[i].authorInfo.length; k++) {

                    if (docs[i].authorInfo[k].email.toLowerCase().trim() == email.toLowerCase().trim()) {
                        docs[i].authorInfo[k].name = name;

                    }
                }
                docs[i].authorInfoString = JSON.stringify(docs[i].authorInfo);
                // console.log(JSON.stringify(docs[i]));
                collection.update({
                    _id: docs[i]._id
                }, docs[i], {}, function(e, docs) {

                });
            }
        }
    });
}

var getSummary = function(content) {
    var regex1 = /(<([^>]+)>)/ig;
    var regex2 = /\s/ig;


    content = content.replace(regex1, " ");
    content = content.replace(regex2, " ");
    return content.substring(0, 180);
}

//goes through the authors, and tries to match them with a name
var getAuthorInfo = function(collection, article, callback) {
    console.log("called author info")
    var authorInfo = [];
    for (var i = 0; i < article.authors.length; i++) {
        authorInfo.push({
            email: article.authors[i].toString().toLowerCase(),
            name: null
        });
    }
    authorInfoHelper(collection, 0, authorInfo, function(data) {
        console.log("callback of " + data);
        callback(data);
    });
};

var authorInfoHelper = function(collection, index, authorInfo, callback) {
    if (index >= authorInfo.length) {
        callback(authorInfo);
    } else {
        collection.find({
            email: authorInfo[index].email
        }, {}, function(e, docs) {
            if (!e && docs && docs[0]) {
                authorInfo[index].name = docs[0].name;
            }
            authorInfoHelper(collection, index + 1, authorInfo, callback);
        });
    }


};

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

module.exports.sectionToId = sectionToId;
module.exports.idToSection = idToSection;
module.exports.updateAuthor = updateAuthor;
module.exports.getUniqueUrl = getUniqueUrl;
module.exports.googleIdIsUsed = googleIdIsUsed;
module.exports.getSummary = getSummary;
module.exports.getAuthorInfo = getAuthorInfo;
