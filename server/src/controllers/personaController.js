import PersonaProfile from "../models/PersonaProfile.js";
import { CHARACTER_IDS } from "../utils/characterConfig.js";
import {
  PERSONA_CATALOG,
  getDefaultPersonaSettings,
  sanitizePersonaSettings,
} from "../utils/personaSettings.js";
import { getMemoryOwnerKey } from "../utils/auth.js";

function getOwnerKey(req) {
  return getMemoryOwnerKey({
    userId: req.user?._id ?? null,
    deviceId: req.method === "GET" ? req.query.deviceId : req.body.deviceId,
    fallbackId: "persona-settings",
  });
}

export async function listPersonaProfiles(req, res, next) {
  try {
    if (!req.user && !req.query.deviceId) {
      return res.status(400).json({ error: "deviceId is required for guest persona settings" });
    }

    const ownerKey = getOwnerKey(req);
    const profiles = await PersonaProfile.find({ ownerKey }).lean();

    const byCharacter = Object.fromEntries(
      CHARACTER_IDS.map((character) => {
        const existing = profiles.find((item) => item.character === character);
        return [character, existing || getDefaultPersonaSettings(character)];
      })
    );

    res.json({
      profiles: byCharacter,
      catalog: PERSONA_CATALOG,
    });
  } catch (err) {
    next(err);
  }
}

export async function upsertPersonaProfile(req, res, next) {
  try {
    const { character } = req.params;
    if (!CHARACTER_IDS.includes(character)) {
      return res.status(400).json({ error: "Invalid character type" });
    }

    if (!req.user && !req.body.deviceId) {
      return res.status(400).json({ error: "deviceId is required for guest persona settings" });
    }

    const sanitized = sanitizePersonaSettings(character, req.body);
    if (sanitized.error) {
      return res.status(400).json({ error: sanitized.error });
    }

    const ownerKey = getOwnerKey(req);
    const profile = await PersonaProfile.findOneAndUpdate(
      { ownerKey, character },
      { $set: sanitized.value },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ profile });
  } catch (err) {
    next(err);
  }
}
