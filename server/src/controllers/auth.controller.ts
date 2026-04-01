import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { eq, and } from "drizzle-orm";
import { db } from "../db/index";
import { users, refreshTokens } from "../db/schema";
import {
  createTokenPair,
  verifyRefreshToken,
  hashToken,
} from "../services/token.service";
import {
  registerSchema,
  loginSchema,
  validate,
} from "../validators/auth.validators";

const BCRYPT_ROUNDS = 12;
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/api/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// Register

export const register = async (req: Request, res: Response): Promise<void> => {
  // Validate Input

  const { data, errors } = validate(registerSchema, req.body);
  if (errors) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
    return;
  }

  const { email, password, name } = data;

  try {
    // Check for existing user

    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
      return;
    }

    // Hash Password
  } catch (error) {}
};
