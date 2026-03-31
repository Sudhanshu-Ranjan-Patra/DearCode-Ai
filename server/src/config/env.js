import dotenv from "dotenv";
import { validateAuthConfiguration } from "../utils/auth.js";

dotenv.config();

const issues = validateAuthConfiguration();
if (issues.length > 0) {
  if (process.env.NODE_ENV === "production") {
    throw new Error(`Invalid production auth configuration:\n- ${issues.join("\n- ")}`);
  }

  issues.forEach((issue) => {
    console.warn(`[env] ${issue}`);
  });
}
