const Git = require("./git.js");

const git = new Git({localPath: "challenge-day9/local"});

git.checkout("test");

git.status();