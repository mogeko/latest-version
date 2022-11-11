const R = require("ramda");

exports.genTagsMeta = (versions, [isLatestUpdate, isEdgeUpdate]) => {
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
};
