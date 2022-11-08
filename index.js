require("./.pnp.cjs").setup(); // load pnp module

const core = require("@actions/core");
const io = require("@actions/io");
const { Octokit } = require("@octokit/rest");
const fetch = require("node-fetch");
const path = require("path");
const fs = require("fs").promises;
const R = require("ramda");

async function main() {
  const octokit = new Octokit();
  const [owner, repo] = core.getInput("repo", { required: true }).split("/");

  const tags = await octokit.repos.listTags({ owner, repo });
  const branch = await octokit.rest.repos.listBranches({ owner, repo });
  const cut = (n) => (n ? { name: n.name, sha: n.commit.sha } : null);
  const latest = R.head(R.prop("data", tags));
  const edge = R.find(
    R.pipe(R.prop("name"), R.includes(R.__, ["master", "main"]))
  )(R.prop("data", branch));
  const versions = R.map(cut)({ latest, edge });
  const result = {
    repo: {
      name: `${owner}/${repo}`,
      url: `https://github.com/${owner}/${repo}`,
    },
    versions,
    timestamp: new Date().toISOString(),
  };

  core.setOutput("result", result);

  const refer = await fetch(core.getInput("refer"))
    .then((response) => response.json())
    .catch((_) => null);
  if (refer) {
    const isLatestUpdate = !R.equals(
      R.path(["versions", "latest", "sha"], refer),
      R.path(["latest", "sha"], versions)
    );
    const isEdgeUpdate = !R.equals(
      R.path(["versions", "edge", "sha"], refer),
      R.path(["edge", "sha"], versions)
    );
    const latestData = R.pipe(
      R.map((v) => `type=raw,value=${v},enable=${isLatestUpdate}`),
      R.join("\n")
    )(["latest", versions.latest.name, versions.latest.sha.slice(0, 7)]);
    const edgeData = R.pipe(
      R.map((v) => `type=raw,value=${v},enable=${isEdgeUpdate}`),
      R.join("\n")
    )(["latest", versions.edge.sha.slice(0, 7)]);

    core.setOutput("edge", edgeData);
    core.setOutput("latest", latestData);
    core.setOutput("is_update", isEdgeUpdate || isLatestUpdate);
  } else {
    core.setOutput("is_update", false);
  }

  const outDir = core.getInput("out_dir", { required: false });
  if (core.getInput("out") && outDir) {
    await io.mkdirP(path.resolve(outDir));
    await fs.writeFile(
      path.resolve(outDir, "index.json"),
      JSON.stringify(result, null, 2)
    );
  }
}

main();
