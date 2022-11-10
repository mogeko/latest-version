const { Octokit } = require("@octokit/rest");

exports.getOctokit = (...args) => new Octokit(...args);
