require("./.pnp.cjs").setup(); // load pnp module

const core = require("@actions/core");
const github = require("@actions/github");
const R = require("ramda");
