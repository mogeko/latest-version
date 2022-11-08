require("./.pnp.cjs").setup(); // load pnp module

const core = require("@actions/core");
const cache = require("@actions/cache");
const io = require("@actions/io");
const path = require("path");
const fs = require("fs").promises;
const R = require("ramda");

const octokit = new require("@octokit/rest").Octokit();

async function main() {
  const [owner, repo] = R.split("/")(core.getInput("repo", { required: true }));

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
  const key = getCacheKey(versions);
  const restoreKeys = ["latest-version-"];
  const outDir = "./.latest-version/";
  const refer = await cachingReport(result, { outDir, key, restoreKeys });
  const enable = checkUpdate(refer, versions);

  core.setOutput("result", result);
  core.setOutput("docker_tags", genDockerMeta(versions, enable));
  core.setOutput("is_update", R.any(R.identity)(enable));
}

function handleData({ tags, branchs }) {
  const latest = R.head(R.prop("data", tags));
  const edge = R.find(
    R.pipe(R.prop("name"), R.includes(R.__, ["master", "main"]))
  )(R.prop("data", branchs));

  return R.map((n) => {
    if (R.isEmpty(n)) return null;
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

function getCacheKey(versions) {
  return R.pipe(
    // prettier-ignore
    R.paths([["edge", "sha"], ["latest", "sha"]]),
    R.reject(R.isEmpty),
    R.union(["latest", "version"]),
    R.join("-")
  )(versions);
}

async function cachingReport(data, { outDir, key, restoreKeys }) {
  const targetFile = path.resolve(outDir, "index.json");
  if (await cache.restoreCache([outDir], key, restoreKeys)) {
    return await fs.readFile(targetFile, { encoding: "utf8" });
  } else {
    const json = JSON.stringify(data, null, 2);
    await io.mkdirP(path.resolve(outDir));
    await fs.writeFile(targetFile, json, { encoding: "utf8" });
    core.info(await cache.saveCache([outDir], key));

    return data;
  }
}

main().catch((err) => core.setFailed(err.message));
