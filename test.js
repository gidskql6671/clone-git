const Git = require("./git.js");

const git = new Git({localPath: "challenge-day9/local", localVer: 2});

git.checkout("test");

git.status();