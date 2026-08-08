import { describe, expect, it } from "vitest";
import { certificationStage, validateReleaseEvidenceDocument } from "./game-release-evidence.mjs";

const knownSlugs = new Set(["example-game"]);
const technicalGates = {
  verifiedAt: "2026-08-08T00:00:00Z",
  commit: "abcdef1",
  commands: ["npm run type-check", "npm run test -- --run", "npm run build"],
  result: "pass",
};
const playtest = {
  reviewedAt: "2026-08-08T01:00:00Z",
  reviewer: "Themis",
  viewports: ["390x844"],
  scenarios: ["first run", "failure and retry", "win and restart"],
  findings: [],
};
const craftReview = {
  reviewedAt: "2026-08-08T02:00:00Z",
  reviewer: "Iris",
  mode: "abstract",
  intent: 2,
  differentiation: 2,
  depth: 2,
  score: 6,
  note: "The intended experience is coherent and the game has sufficient authored depth.",
};

describe("game release evidence", () => {
  it("starts implementation-complete games without release certification", () => {
    expect(certificationStage(true, null)).toBe("implementation-complete");
  });

  it("rejects release approval that skips ordered evidence", () => {
    const document = {
      schema: "oiyo.game-release-evidence",
      schemaVersion: 1,
      games: { "example-game": { releaseApproval: { approvedAt: "2026-08-08T03:00:00Z", approver: "Themis", decision: "approved" } } },
    };
    expect(validateReleaseEvidenceDocument(document, knownSlugs)).toContain("example-game: invalid or out-of-order release approval");
  });

  it("rejects craft scores below the release floor", () => {
    const document = {
      schema: "oiyo.game-release-evidence",
      schemaVersion: 1,
      games: { "example-game": { technicalGates, playtest, craftReview: { ...craftReview, intent: 1, differentiation: 1, depth: 1, score: 3 } } },
    };
    expect(validateReleaseEvidenceDocument(document, knownSlugs)).toContain("example-game: invalid or out-of-order craft review");
  });

  it("certifies only a complete, valid evidence chain", () => {
    const evidence = {
      technicalGates,
      playtest,
      craftReview,
      releaseApproval: { approvedAt: "2026-08-08T03:00:00Z", approver: "Themis", decision: "approved" },
    };
    const document = { schema: "oiyo.game-release-evidence", schemaVersion: 1, games: { "example-game": evidence } };
    expect(validateReleaseEvidenceDocument(document, knownSlugs)).toEqual([]);
    expect(certificationStage(true, evidence)).toBe("release-certified");
  });
});
