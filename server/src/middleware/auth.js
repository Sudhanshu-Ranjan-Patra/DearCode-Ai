import User from "../models/User.js";
import {
  getSessionCookieName,
  parseCookies,
  verifySessionToken,
} from "../utils/auth.js";

function getTokenFromRequest(req) {
  const authHeader = req.headers.authorization || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  const cookies = parseCookies(req.headers.cookie || "");
  return cookies[getSessionCookieName()] || null;
}

export async function attachCurrentUser(req, _res, next) {
  try {
    const token = getTokenFromRequest(req);
    const payload = verifySessionToken(token);

    if (!payload?.sub) {
      req.user = null;
      return next();
    }

    const user = await User.findById(payload.sub);
    req.user = user?.isActive ? user : null;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}
