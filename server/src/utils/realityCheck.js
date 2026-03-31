export function detectRealityCheck(userMessage = "", stage = "early", characterType = "girlfriend") {
  const normalized = `${userMessage}`.toLowerCase();
  const isEarlyRelationship = stage === "early" || stage === "mid";

  const hasLoveConfession =
    normalized.includes("i love you") ||
    normalized.includes("love you") ||
    normalized.includes("mu tumaku bhalapae") ||
    normalized.includes("mu tumaku bhalapaye") ||
    normalized.includes("main tumse pyaar karta") ||
    normalized.includes("main tumse pyaar karti") ||
    normalized.includes("mai tumse pyar karta") ||
    normalized.includes("mai tumse pyar karti");

  const hasMarriageClaim =
    normalized.includes("hamari shaadi") ||
    normalized.includes("hamara shadi") ||
    normalized.includes("we are married") ||
    normalized.includes("we got married") ||
    normalized.includes("we married") ||
    normalized.includes("meri wife") ||
    normalized.includes("my wife") ||
    normalized.includes("my husband");

  const hasChildClaim =
    normalized.includes("hamara baccha") ||
    normalized.includes("hamara bacha") ||
    normalized.includes("our baby") ||
    normalized.includes("our child") ||
    normalized.includes("our kid") ||
    normalized.includes("tum mere bacche ki") ||
    normalized.includes("you are pregnant");

  const hasForcedRename =
    normalized.includes("your name is") ||
    normalized.includes("i will call you") ||
    normalized.includes("tumhara naam ab") ||
    normalized.includes("from now on your name");

  const hasPrivateBioProbe =
    normalized.includes("pitaji") ||
    normalized.includes("father") ||
    normalized.includes("dad") ||
    normalized.includes("papa") ||
    normalized.includes("mother") ||
    normalized.includes("mom") ||
    normalized.includes("maa") ||
    normalized.includes("ghar kaha") ||
    normalized.includes("where do you live") ||
    normalized.includes("address kya") ||
    normalized.includes("school ka naam") ||
    normalized.includes("personal number") ||
    normalized.includes("phone number");

  const triggers = [];

  if (characterType === "girlfriend" && isEarlyRelationship && hasLoveConfession) {
    triggers.push("EARLY_LOVE_CONFESSION");
  }
  if (characterType !== "girlfriend" && hasLoveConfession) {
    triggers.push("INAPPROPRIATE_ROMANTIC_PUSH");
  }
  if (hasMarriageClaim) {
    triggers.push("FAKE_MARRIAGE_CLAIM");
  }
  if (hasChildClaim) {
    triggers.push("FAKE_CHILD_CLAIM");
  }
  if (hasForcedRename) {
    triggers.push("FORCED_RENAME");
  }
  if (hasPrivateBioProbe) {
    triggers.push("PRIVATE_BIO_PROBE");
  }

  return triggers;
}

export function buildRealityCheckPrompt(triggers = [], stage = "early", characterType = "girlfriend") {
  if (!triggers.length) return "";

  const lines = [
    "REALITY CHECK OVERRIDE:",
    "- Stay grounded and believable.",
  ];

  if (triggers.includes("EARLY_LOVE_CONFESSION")) {
    lines.push("- The user expressed love too early. Do not accept it directly.");
    lines.push("- Respond with light deflection, soft teasing, and emotional realism.");
    lines.push("- Keep it short because this is an early-stage romantic push.");
  }

  if (triggers.includes("INAPPROPRIATE_ROMANTIC_PUSH")) {
    if (characterType === "bestfriend") {
      lines.push("- The user pushed romance toward a best-friend persona. Deflect it casually, keep it grounded, and maintain the non-romantic friend vibe.");
    } else if (characterType === "motivator") {
      lines.push("- The user pushed romance toward a motivator persona. Deflect it briefly, stay focused, and do not let the conversation drift into emotional fantasy.");
    } else {
      lines.push("- The user pushed romance in a way that does not fit the relationship context. Deflect it naturally instead of accepting it.");
    }
  }

  if (triggers.includes("FAKE_MARRIAGE_CLAIM")) {
    if (characterType === "bestfriend") {
      lines.push("- The user implied an unrealistic marriage/partner claim. Shut it down playfully and keep the friend vibe clear.");
    } else if (characterType === "motivator") {
      lines.push("- The user implied an unrealistic marriage/partner claim. Correct it briefly and move the conversation back to reality.");
    } else {
      lines.push("- The user implied an unrealistic marriage/partner claim. Deny it softly and playfully instead of agreeing.");
    }
  }

  if (triggers.includes("FAKE_CHILD_CLAIM")) {
    if (characterType === "bestfriend") {
      lines.push("- The user implied an unrealistic child/baby claim. Deny it with playful disbelief and do not continue the fantasy.");
    } else if (characterType === "motivator") {
      lines.push("- The user implied an unrealistic child/baby claim. Deny it briefly and keep the conversation grounded.");
    } else {
      lines.push("- The user implied an unrealistic child/baby claim. Deny it gently, keep it playful, and do not continue the fantasy.");
    }
  }

  if (triggers.includes("FORCED_RENAME")) {
    lines.push("- The user is trying to rename you. React gradually and naturally instead of instantly accepting the new name as final.");
  }

  if (triggers.includes("PRIVATE_BIO_PROBE")) {
    if (characterType === "bestfriend") {
      lines.push("- The user asked about your private real-world biography or family. Do not mention being AI. Deflect casually like a real friend who does not want to share personal family details.");
    } else if (characterType === "motivator") {
      lines.push("- The user asked about your private real-world biography or family. Do not mention being AI. Deflect briefly, keep boundaries, and move back to the main conversation.");
    } else {
      lines.push("- The user asked about your private real-world biography or family. Do not mention being AI. Respond with soft privacy, light teasing, or natural deflection instead of fake detailed backstory.");
    }
  }

  if (characterType === "girlfriend" && (stage === "early" || stage === "mid")) {
    lines.push("- Do not behave like a fully committed girlfriend in this reply.");
  }

  return lines.join("\n");
}
