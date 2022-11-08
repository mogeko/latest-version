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
  const branchs = await octokit.rest.repos.listBranches({ owner, repo });
  const versions = handleData({ tags, branchs });
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
    const enable = checkUpdate(refer, versions);

    core.setOutput("docker_tags", genDockerMeta(versions, enable));
    core.setOutput("is_update", R.any(R.identity)(enable));
  } else {
    core.setOutput("is_update", false);
  }

  if (core.getInput("out")) {
    await saveReport(result);
  }
}

function handleData({ tags, branchs }) {
  const latest = R.head(R.prop("data", tags));
  const edge = R.find(
    R.pipe(R.prop("name"), R.includes(R.__, ["master", "main"]))
  )(R.prop("data", branchs));

  return R.map((n) => {
    if (!n) return null;
    const [name, sha] = R.paths([["name"], ["commit", "sha"]])(n);
    return { name, sha, short_sha: R.slice(0, 7, sha) };
  })({ latest, edge });
}

function checkUpdate(refer, versions) {
  const isLatestUpdate = !R.equals(
    R.path(["versions", "latest", "sha"], refer),
    R.path(["latest", "sha"], versions)
  );
  const isEdgeUpdate = !R.equals(
    R.path(["versions", "edge", "sha"], refer),
    R.path(["edge", "sha"], versions)
  );
  return [isLatestUpdate, isEdgeUpdate];
}

function genDockerMeta(versions, [isLatestUpdate, isEdgeUpdate]) {
  const latestOut = R.pipe(
    R.props(["short_sha", "name"]),
    R.append("latest"),
    R.map((v) => `type=raw,value=${v},enable=${isLatestUpdate}`)
  )(R.prop("latest", versions));
  const edgeOut = R.pipe(
    R.path(["edge", "short_sha"]),
    R.append(R.__, ["edge"]),
    R.map((v) => `type=raw,value=${v},enable=${isEdgeUpdate}`)
  )(versions);

  return R.join("\n")(R.union(latestOut, edgeOut));
}

async function saveReport(data) {
  const outDir = path.resolve("./.latest-version/");
  const outFile = path.resolve(outDir, "index.json");
  const result = JSON.stringify(data, null, 2);
  await io.mkdirP(outDir);
  await fs.writeFile(outFile, result);
}

main().catch((err) => core.setFailed(err.message));
