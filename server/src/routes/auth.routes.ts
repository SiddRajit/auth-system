import { Router } from "express";
import { register } from "../controllers/auth.controller";

const router = Router();

// Public

router.post("/register", register);

export default router;
