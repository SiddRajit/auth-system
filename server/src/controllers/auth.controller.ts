import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
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
import jwt from "jsonwebtoken";

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

  // Pull user data from validated request

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

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Create User

    const [newUser] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        name: name || null,
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
      });

    // Create tokens and store refresh token in db

    const tokenPair = createTokenPair(newUser);

    await db.insert(refreshTokens).values({
      userId: newUser.id,
      tokenHash: tokenPair.refreshTokenHash,
      expiresAt: tokenPair.refreshTokenExpiresAt,
      userAgent: req.headers["user-agent"] || null,
      ipAddress: req.ip || null,
    });

    // Set HTTP-only cookie and send to frontend

    res.cookie("refreshToken", tokenPair.refreshToken, COOKIE_OPTIONS);

    // Return response

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: {
        accessToken: tokenPair.accessToken,
        user: newUser,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred during registration",
    });
  }
};

// Login

export const login = async (req: Request, res: Response): Promise<void> => {
  // Validate input

  const { data, errors } = validate(loginSchema, req.body);
  if (errors) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
    return;
  }

  // Pull user data from validated request

  const { email, password } = data;

  try {
    // Find user

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        passwordHash: users.passwordHash,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    // Verify password

    const FAKE_HASH = "fakehashtopreventtimingattacks$32%31XX";
    const hashPassword = user?.passwordHash || FAKE_HASH;
    const isPasswordValid = await bcrypt.compare(password, hashPassword);

    if (!user || !isPasswordValid) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    // Create and store tokens

    const tokenPair = createTokenPair({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    await db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: tokenPair.refreshTokenHash,
      expiresAt: tokenPair.refreshTokenExpiresAt,
      userAgent: req.headers["user-agent"] || null,
      ipAddress: req.ip || null,
    });

    // Set HTTP-only cookie and send to frontend

    res.cookie("refreshToken", tokenPair.refreshToken, COOKIE_OPTIONS);

    // Return user data without passwordHash

    const { passwordHash: _, ...userWithoutPassword } = user;

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        accessToken: tokenPair.accessToken,
        user: userWithoutPassword,
      },
    });
  } catch (error) {}
};

// Refresh Token

export const refreshToken = async (
  req: Request,
  res: Response,
): Promise<void> => {
  // Pull out refresh token from cookies

  const token = req.cookies["refreshToken"];

  if (!token) {
    res.status(401).json({
      success: false,
      message: "No refresh token provided",
    });
    return;
  }

  try {
    // Verify JWT

    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch (error) {
      res.clearCookie("refreshToken", COOKIE_OPTIONS);
      res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token provided",
      });
      return;
    }

    // Verify token in db

    const tokenHash = hashToken(token);

    const [storedToken] = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          eq(refreshTokens.userId, payload.sub),
        ),
      )
      .limit(1);

    if (
      !storedToken ||
      storedToken.revoked ||
      storedToken.expiresAt < new Date()
    ) {
      res.clearCookie("refreshToken", COOKIE_OPTIONS);
      res.status(401).json({
        success: false,
        message: "Refresh token has been revoked or expired",
      });
    }

    // Get user and issue new access token

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
      })
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);

    if (!user) {
      res.status(401).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    const tokenPair = createTokenPair(user);

    // Return new access token
    res.status(200).json({
      success: true,
      data: {
        accessToken: tokenPair.accessToken,
      },
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred during token refresh",
    });
  }
};

// Logout

export const logout = async (req: Request, res: Response): Promise<void> => {
  // Get token from cookies

  const token = req.cookies["refreshToken"];

  if (token) {
    try {
      const tokenHash = hashToken(token);

      await db
        .update(refreshTokens)
        .set({ revoked: true })
        .where(eq(refreshTokens.tokenHash, tokenHash));
    } catch (error) {
      console.error("Error revoking refresh token during logout:", error);
    }
  }

  // Clear cookie

  res.clearCookie("refreshToken", {
    ...COOKIE_OPTIONS,
    maxAge: 0,
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

// Get me

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get userId from request and find user in db

    const userId = req.user!.sub;

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    // Handle if no user is found

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Return user back

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({ success: false, message: "An error occurred" });
  }
};
