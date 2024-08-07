const core = require("@actions/core");
const cache = require("@actions/cache");
const io = require("@actions/io");
const path = require("path");
const fs = require("fs").promises;
const R = require("ramda");

exports.genKey = (versions) => {
  return R.pipe(
    R.pipe(R.reject(R.isNil), R.uniq),
    R.prepend("latest-version"),
    R.join("-"),
  )(R.map(R.prop("sha"))(R.values(versions)));
};

exports.use = async (data, { outDir, key }) => {
  const targetDir = path.resolve(outDir);
  const targetFile = path.resolve(targetDir, "index.json");
  const isCacheHit = R.equals(key)(
    // only true when hitting the cache with `key`.
    await cache.restoreCache([targetDir], key, ["latest-version-"]),
  );
  const refer = await R.otherwise(R.always("{}"))(fs.readFile(targetFile));

  if (R.not(isCacheHit)) {
    core.info("It seems that the cache is missing, creating a new one...");
    await io.mkdirP(targetDir);
    await fs.writeFile(targetFile, JSON.stringify(data, null, 2));
    await cache.saveCache([targetDir], key);
  }

  return JSON.parse(refer);
};
