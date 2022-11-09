require("./.pnp.cjs").setup(); // load pnp module

const core = require("@actions/core");
const cache = require("@actions/cache");
const io = require("@actions/io");
const path = require("path");
const fs = require("fs").promises;
const R = require("ramda");

const octokit = new (require("@octokit/rest").Octokit)();

async function main() {
  // inputs
  const [owner, repo] = R.split("/")(core.getInput("repo", { required: true }));

  // handle
  const tags = await octokit.repos.listTags({ owner, repo });
  const branchs = await octokit.rest.repos.listBranches({ owner, repo });
  const versions = handleData({ tags, branchs });
  const stable_version = getStableVersion(versions);
  const result = {
    repo: {
      name: `${owner}/${repo}`,
      url: `https://github.com/${owner}/${repo}`,
    },
    stable_version,
    versions,
    timestamp: new Date().toISOString(),
  };
  const key = getCacheKey(versions);
  const outDir = "./.latest-version/";
  const refer = await cachingReport(result, { outDir, key });
  const enable = checkUpdate(refer, versions);

  // outputs
  core.setOutput("result", result);
  core.setOutput("docker_tags", genDockerMeta(versions, enable));
  core.setOutput("is_update", R.any(R.identity)(enable));
  core.setOutput("stable_ver", stable_version);
}

function handleData({ tags, branchs }) {
  const latest = R.head(R.prop("data", tags));
  const edge = R.find(
    R.where({ name: R.includes(R.__, ["master", "main"]) }),
    R.prop("data", branchs)
  );

  return R.map((n) => {
    if (R.isEmpty(n)) return null;
    const [name, sha] = R.paths([["name"], ["commit", "sha"]])(n);
    return { name, sha, short_sha: R.slice(0, 7, sha) };
  })({ latest, edge });
}

function checkUpdate(refer, versions) {
  const checkWith = (n) => {
    const left = R.path(["versions", n, "sha"]);
    const right = R.path([n, "sha"]);
    return R.useWith(R.equals, [left, right]);
  };

  return R.juxt([checkWith("latest"), checkWith("edge")])(refer, versions);
}

function genDockerMeta(versions, [isLatestUpdate, isEdgeUpdate]) {
  const handleLatest = R.pipe(
    // prettier-ignore
    R.paths([["latest", "name"], ["latest", "short_sha"]]),
    R.append("latest"),
    R.map((v) => `type=raw,value=${v},enable=${isLatestUpdate}`)
  );
  const handleEdge = R.pipe(
    R.path(["edge", "short_sha"]),
    R.append(R.__, ["edge"]),
    R.map((v) => `type=raw,value=${v},enable=${isEdgeUpdate}`)
  );

  return R.join("\n")(
    R.converge(R.union, [handleLatest, handleEdge])(versions)
  );
}

function getCacheKey(versions) {
  // prettier-ignore
  const shas = R.paths([["edge", "sha"], ["latest", "sha"]])(versions);
  const strs = R.reject(R.isEmpty, R.union(["latest", "version"], shas));

  return R.join("-")(strs);
}

async function cachingReport(data, { outDir, key }) {
  const targetDir = path.resolve(outDir);
  const targetFile = path.resolve(targetDir, "index.json");
  const isCacheHit = R.equals(key)(
    // only true when hitting the cache with `key`.
    await cache.restoreCache([targetDir], key, ["latest-version-"])
  );

  if (R.not(isCacheHit)) {
    core.info("It seems that the cache is missing, creating a new one...");
    await io.mkdirP(targetDir);
    await fs.writeFile(targetFile, JSON.stringify(data, null, 2));
    await cache.saveCache([targetDir], key);
  }

  return fs.readFile(targetFile).then(JSON.parse).catch(R.always({}));
}

function getStableVersion(versions) {
  const sha = R.path(["edge", "short_sha"])(versions);

  return R.pathOr(sha, ["latest", "name"])(versions);
}

main().catch((err) => core.setFailed(err.message));
