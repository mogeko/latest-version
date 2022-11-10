require("../.pnp.cjs").setup(); // load pnp module

const handler = require("./lib/handler");
const cache = require("./lib/cache");
const docker = require("./lib/docker");
const core = require("@actions/core");
const { Octokit } = require("@octokit/rest");
const R = require("ramda");

const octokit = new Octokit();

async function main() {
  // inputs
  const [owner, repo] = R.split("/")(core.getInput("repo", { required: true }));

  // handle
  const tags = await octokit.repos.listTags({ owner, repo });
  const branchs = await octokit.rest.repos.listBranches({ owner, repo });
  const versions = handler.handleData({ tags, branchs });
  const stable_version = handler.genStableVersion(versions);
  const result = {
    repo: {
      name: `${owner}/${repo}`,
      url: `https://github.com/${owner}/${repo}`,
    },
    stable_version,
    versions,
    timestamp: new Date().toISOString(),
  };
  const key = cache.genKey(versions);
  const outDir = "./.latest-version/";
  const refer = await cache.use(result, { outDir, key });
  const enable = handler.checkUpdate(refer, versions);

  // outputs
  core.setOutput("result", result);
  core.setOutput("docker_tags", docker.genTagsMeta(versions, enable));
  core.setOutput("is_update", R.any(R.identity)(enable));
  core.setOutput("stable_ver", stable_version);
}

main().catch((err) => core.setFailed(err.message));
