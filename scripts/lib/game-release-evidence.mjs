const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const nonEmpty = (value) => typeof value === "string" && value.trim().length > 0;

function validTechnicalGates(value) {
  return value
    && ISO_DATE.test(value.verifiedAt)
    && /^[0-9a-f]{7,40}$/.test(value.commit)
    && Array.isArray(value.commands)
    && value.commands.length >= 3
    && value.commands.every(nonEmpty)
    && value.result === "pass";
}

function validPlaytest(value) {
  return value
    && ISO_DATE.test(value.reviewedAt)
    && nonEmpty(value.reviewer)
    && Array.isArray(value.viewports)
    && value.viewports.length > 0
    && value.viewports.every(nonEmpty)
    && Array.isArray(value.scenarios)
    && value.scenarios.length >= 3
    && value.scenarios.every(nonEmpty)
    && Array.isArray(value.findings);
}

function validCraftReview(value) {
  return value
    && ISO_DATE.test(value.reviewedAt)
    && nonEmpty(value.reviewer)
    && ["narrative", "abstract"].includes(value.mode)
    && [value.intent, value.differentiation, value.depth].every((score) => Number.isInteger(score) && score >= 0 && score <= 4)
    && value.score === value.intent + value.differentiation + value.depth
    && value.score >= 6
    && nonEmpty(value.note)
    && value.note.trim().length >= 20;
}

function validReleaseApproval(value) {
  return value
    && ISO_DATE.test(value.approvedAt)
    && nonEmpty(value.approver)
    && value.decision === "approved";
}

export function validateReleaseEvidenceDocument(document, knownSlugs) {
  const errors = [];
  if (document?.schema !== "oiyo.game-release-evidence" || document?.schemaVersion !== 1
    || !document.games || Array.isArray(document.games) || typeof document.games !== "object") {
    return ["invalid release evidence document"];
  }
  for (const [slug, evidence] of Object.entries(document.games)) {
    if (!knownSlugs.has(slug)) errors.push(`${slug}: unknown game`);
    if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
      errors.push(`${slug}: evidence must be an object`);
      continue;
    }
    if (evidence.technicalGates && !validTechnicalGates(evidence.technicalGates)) errors.push(`${slug}: invalid technical gates`);
    if (evidence.playtest && (!evidence.technicalGates || !validPlaytest(evidence.playtest))) errors.push(`${slug}: invalid or out-of-order playtest`);
    if (evidence.craftReview && (!evidence.playtest || !validCraftReview(evidence.craftReview))) errors.push(`${slug}: invalid or out-of-order craft review`);
    if (evidence.releaseApproval && (!evidence.craftReview || !validReleaseApproval(evidence.releaseApproval))) errors.push(`${slug}: invalid or out-of-order release approval`);
  }
  return errors;
}

export function certificationStage(implementationComplete, evidence) {
  const technicalGatesPassed = Boolean(evidence?.technicalGates);
  const playtested = technicalGatesPassed && Boolean(evidence?.playtest);
  const craftReviewed = playtested && Boolean(evidence?.craftReview);
  const releaseCertified = craftReviewed && evidence?.releaseApproval?.decision === "approved";
  if (releaseCertified) return "release-certified";
  if (craftReviewed) return "craft-reviewed";
  if (playtested) return "playtested";
  if (technicalGatesPassed) return "technical-gates-passed";
  return implementationComplete ? "implementation-complete" : "static-assessed";
}
