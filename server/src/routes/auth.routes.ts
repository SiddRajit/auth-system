import { Router } from "express";

const router = Router();

// Public

router.post("/register");
router.post("/login");
router.post("/logout");
router.post("/refresh");

// Private

router.get("/me");

export default router;
