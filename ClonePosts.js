const { MongoClient } = require("mongodb");
const chalk = require("chalk");
const url = "mongodb://localhost:27017/cloneDB";
const async = require("async");
const request = require("request");

// start the work
MongoClient.connect(url, { useNewUrlParser: true }, (err, db) => {
  if (err) {
    console.log(err);
    process.exit(0);
  }

  var dbo = db.db("cloneDB");
  var collection = dbo.collection("media");
  // grab posts
  request("Wordpress Page URL", (err, response, body) => {
    let data = JSON.parse(body);
    //console.log(data);
    let userData = [];
    data.forEach((singleData) => {
      async.waterfall(
        [
          (callback) => {
            // get the featured image
            request(
              `https:/URL/${singleData.featured_media}`,
              (err, res, body) => {
                if (err) {
                  console.log(err);
                  return callback(null, null);
                }
                let data = JSON.parse(body);
                console.log("featued image = ", data.source_url);
                return callback(null, data.source_url);
              }
            );
          },
          (featueredImage, callback) => {
            // get categories name
            dbo
              .collection("categories")
              .find({ id: { $in: singleData.categories } })
              .toArray((err, result) => {
                let catname = [];
                result.forEach((singleResult) => {
                  catname.push({
                    name: singleResult.name,
                    slug: singleResult.slug,
                  });
                });
                console.log("categories = ", catname);
                return callback(null, featueredImage, catname);
              });
          },
          (featueredImage, catNames, callback) => {
            // get tags name
            dbo
              .collection("tags")
              .find({ id: { $in: singleData.tags } })
              .toArray((err, result) => {
                let tagname = [];
                result.forEach((singleResult) => {
                  tagname.push({
                    name: singleResult.name,
                    slug: singleResult.slug,
                  });
                });
                console.log("tags = ", tagname);
                return callback(null, featueredImage, catNames, tagname);
              });
          },
        ],
        (err, image, cats, tags) => {
          let parseContent = JSON.parse(JSON.stringify(singleData.content));
          let formatContent = parseContent.rendered.split("\n").join("");
          let formatContentspaces = formatContent.split("\t").join("");
          let convertedCategories = +singleData.categories.join();
          let convertCondition = (data) => {
            if (data === 64) {
              return 0;
            } else if (data === 109) {
              return 2;
            } else if (data === 739) {
              return 1;
            }
          };
          let convertedAuthorName = (data) => {
            if (data === 11) {
              return "مدیار";
            } else {
              return "ناشناس";
            }
          };
          let postData = {
            title: singleData.title.rendered,
            date: singleData.date,
            url: singleData.slug,
            excerpt: singleData.excerpt.rendered,
            description: formatContentspaces,
            author: convertedAuthorName(singleData.author),
            categories: convertCondition(convertedCategories),
            tags: tags,
            image: image,
          };
          collection.insert(postData, (err, result) => {
            if (err) {
              console.log(err);
              process.exit(0);
            }
            console.log(result);
          });
        }
      );
    });
  });
});
