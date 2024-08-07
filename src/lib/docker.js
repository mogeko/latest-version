const R = require("ramda");

exports.genTagsMeta = ({ latest, edge }, [l, e]) => {
  const grammar = (_e) => R.map((v) => `type=raw,value=${v},enable=${_e}`);

  return R.useWith(R.pipe(R.union, R.join("\n")), [
    R.pipe(R.props(["name", "short_sha"]), R.prepend("latest"), grammar(l)),
    R.pipe(R.prop("short_sha"), R.append(R.__, ["edge"]), grammar(e)),
  ])(latest, edge);
};
