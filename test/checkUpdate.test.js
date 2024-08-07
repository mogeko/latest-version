import { describe, it, expect } from "vitest";
const handler = require("../src/lib/handler");
const R = require("ramda");

describe("checkUpdate", () => {
  it("run with same version", () => {
    const result = handler.checkUpdate(
      { versions: { latest: { sha: "a" }, edge: { sha: "b" } } },
      { latest: { sha: "a" }, edge: { sha: "b" } },
    );

    expect(result).toEqual([false, false]);
  });

  it("run with different version", () => {
    const result = handler.checkUpdate(
      { versions: { latest: { sha: "a" }, edge: { sha: "b" } } },
      { latest: { sha: "c" }, edge: { sha: "d" } },
    );

    expect(result).toEqual([true, true]);
  });

  it("run with different latest version", () => {
    const result = handler.checkUpdate(
      { versions: { latest: { sha: "a" }, edge: { sha: "b" } } },
      { latest: { sha: "c" }, edge: { sha: "b" } },
    );

    expect(result).toEqual([true, false]);
  });

  it("run with different edge version", () => {
    const result = handler.checkUpdate(
      { versions: { latest: { sha: "a" }, edge: { sha: "b" } } },
      { latest: { sha: "a" }, edge: { sha: "d" } },
    );

    expect(result).toEqual([false, true]);
  });

  it("calculate whether is_update true", () => {
    const result = handler.checkUpdate(
      { versions: { latest: { sha: "a" }, edge: { sha: "b" } } },
      { latest: { sha: "c" }, edge: { sha: "d" } },
    );

    expect(R.any(R.identity)(result)).toEqual(true);
  });

  it("calculate whether is_update false", () => {
    const result = handler.checkUpdate(
      { versions: { latest: { sha: "a" }, edge: { sha: "b" } } },
      { latest: { sha: "a" }, edge: { sha: "b" } },
    );

    expect(R.all(R.identity)(result)).toEqual(false);
  });
});
