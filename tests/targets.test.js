import { getExplicitTargets, hasExplicitTargetSelection } from "../dist/utils/targets.js";

describe("targets utility", () => {
  test("returns no explicit targets when no flags are set", () => {
    expect(getExplicitTargets({})).toEqual([]);
    expect(hasExplicitTargetSelection({})).toBe(false);
  });

  test("returns Claude when only --claude is set", () => {
    expect(getExplicitTargets({ claude: true })).toEqual(["claude"]);
    expect(hasExplicitTargetSelection({ claude: true })).toBe(true);
  });

  test("returns both targets when both flags are set", () => {
    expect(getExplicitTargets({ claude: true, codex: true })).toEqual([
      "claude",
      "codex",
    ]);
  });

  test("returns OpenCode when only --opencode is set", () => {
    expect(getExplicitTargets({ opencode: true })).toEqual(["opencode"]);
    expect(hasExplicitTargetSelection({ opencode: true })).toBe(true);
  });

  test("returns all targets in stable order when all flags are set", () => {
    expect(getExplicitTargets({ claude: true, codex: true, opencode: true })).toEqual([
      "claude",
      "codex",
      "opencode",
    ]);
  });
});
