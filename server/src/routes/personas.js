import { Router } from "express";
import {
  listPersonaProfiles,
  upsertPersonaProfile,
} from "../controllers/personaController.js";

const router = Router();

router.get("/", listPersonaProfiles);
router.put("/:character", upsertPersonaProfile);

export default router;
