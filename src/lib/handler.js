const R = require("ramda");

exports.handleData = ({ tags, branchs }) => {
  const selector = R.on(
    R.useWith((a, b) => ({ latest: a, edge: b }))([
      R.find(R.where({ name: R.complement(R.test)(/(alpha|beta|canary)/g) })),
      R.find(R.where({ name: R.includes(R.__, ["master", "main"]) })),
    ]),
  )(R.prop("data"));

  return R.map((n) => {
    if (R.isNil(n)) return null;
    const [name, sha] = R.paths([["name"], ["commit", "sha"]])(n);
    return { name, sha, short_sha: R.slice(0, 7, sha) };
  })(selector(tags, branchs));
};

exports.checkUpdate = (refer, versions) => {
  const checkWith = (n) => {
    const left = R.path(["versions", n, "sha"]);
    const right = R.path([n, "sha"]);
    return R.useWith(R.complement(R.equals), [left, right]);
  };

  return R.juxt([checkWith("latest"), checkWith("edge")])(refer, versions);
};

exports.genStableVersion = R.ifElse(
  R.pipe(R.prop("latest"), R.isNil),
  R.path(["edge", "short_sha"]),
  R.path(["latest", "name"]),
);
