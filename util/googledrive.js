var fs = require('fs');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var cheerio = require('cheerio')
var OAuth2 = google.auth.OAuth2;
var shortid = require("shortid");
var util = require("../util/util");

var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'drive-nodejs-quickstart.json';

var regexSequences = {
    "date": /^date\s*=\s((\d|\/)*)/i,
    "title": /^title\s*=\s*(.*)/i,
    "section": /^section\s*=\s*(.*)/i,
    "authors": /^authors?\s*=\s*(.*)/i
};


var authedDrive;
var oathClient;
//authorizes the google drive api to
var initialize = function(fileId, callback) {
    fs.readFile('./util/security/client_secret.json', function processClientSecrets(err, content) {
        if (err) {
            console.log('Error loading client secret file: ' + err);
            return;
        }
        var credentials = JSON.parse(content);

        var clientSecret = credentials.installed.client_secret;
        var clientId = credentials.installed.client_id;
        var redirectUrl = credentials.installed.redirect_uris[0];
        // console.log(clientSecret + " " + clientId + " " + redirectUrl);
        var oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);
        oathClient = oauth2Client;
        fs.readFile(TOKEN_PATH, function(err, token) {

            oauth2Client.credentials = JSON.parse(token);
            var drive = google.drive({
                version: 'v2',
                auth: oauth2Client
            });
            authedDrive = drive;

            return callback(fileId);
        });
    });
}




var getArticle = function(fileId, callback) {

    refreshTokenIfNeeded(function() {

        var html = "";
        authedDrive.files.export({
                fileId: fileId,
                mimeType: 'text/html'
            }).on('data', function(chunk) {
                var part = chunk.toString();
                html += part;
            })
            .on('error', function(err) {
                console.log('Error during download', err);
            }).on('end', function() {
                var article = convertToArticle(html);
                callback(article);
            })
    });
};

var convertToArticle = function(html){
  //set up initial article
  var date = new Date();
  var article = {
      "title": "No Title Found",
      "authors": [],
      "date": (date),
      "section": "no section",
      "content": "no Text found",
      "imageURL": [],
      "imageID": []
  };

  //check for errors

  try{
    var potentialErrorJson = JSON.parse(html);
    console.log(potentialErrorJson);
    if(potentialErrorJson && potentialErrorJson.error){
      console.log('returning false')
      return false;
    }
  }catch(e){

  }

  var $ = cheerio.load(html);
  var articleText = "";
  var primaryPicture;


  $('p').each(function(i, elem) {
      $(this).find("img").each(function(k, img) {
          var url = $(this).attr("src");
          var id = shortid.generate();


          if (!primaryPicture) {
              articleText = "<img class='article-picture' src='/dynamic/normal/" + id + ".png'>" + articleText;
              primaryPicture = true;
          } else {
              articleText += "<img class='article-picture' src='/dynamic/normal/" + id + ".png'>";
          }
          article.imageURL.push(url);
          article.imageID.push(id);
      });
      // console.log("newline:");

      var pText = $(this).text();
      var isMetaData = false;
      for (var key in regexSequences) {
          if (regexSequences[key].test(pText)) {
              isMetaData = true;
              var match = regexSequences[key].exec(pText)[1];

              if (key == "title") {
                  article.title = match.trim();
              } else if (key == "date") {
                  article.date = new Date(match.trim());
              } else if (key == "authors") {
                  article.authors = (match.trim()).split(",");
                  for (var i = 0; i < article.authors.length; i++) {
                      article.authors[i] = article.authors[i].trim();
                  }
              }else if (key == "section") {
                  article.section = util.sectionToId((match.trim()).split(","));
                  console.log("sectionid = " + article.section)
              }
          }
      }
      if(!isMetaData){
        if (/\S/.test(pText)) {
            articleText += "<p>" + pText + "</p>";
        }
      }
  });
  article.content = articleText;
  return article;
}

var lastRefresh = Number.MIN_VALUE;
var refreshTokenIfNeeded = function(callback) {

    var currentTime = new Date().getTime();

    if (currentTime - 30000 > lastRefresh) {
        oathClient.refreshAccessToken(function(err, tokens) {
            oathClient.credentials = tokens;
            lastRefresh = currentTime;
            return callback();
        });
    } else {
        return callback();
    }
}

var getProductionFiles = function(callback) {

    return new Promise(function(fulfill, reject) {
        refreshTokenIfNeeded(function() {
            authedDrive.files.list({
                maxResults: "1000",
                orderBy: "createdDates"
            }, function(err, response) {
                if (err) {
                    // console.log(err);
                    reject(err);
                } else {
                    var fileInfo = [];
                    // console.log(err);
                    var files = response.items;


                    for (var i = 0; i < files.length; i++) {
                        var file = files[i];
                        fileInfo.push({
                            title: file.title,
                            id: file.id
                        });
                    }

                    fulfill(fileInfo);
                }
            });
        });
    });

}

// initialize(function(){
// initialize("", function(_) {
//     getArticle("16ji38U7K1dGhh5eLSKXg7VC-wBC_t4OyvoCx7-1cwh4");
//     // getProductionFiles().then(
//     // function(res){
//     //     console.log(res);
//     // },
//     // function(err){
//     //   console.log(err);
//     // });
//
// });
module.exports.initialize = initialize;
module.exports.getArticle = getArticle;

// });
