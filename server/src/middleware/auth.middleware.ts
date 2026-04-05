import type { NextFunction, Request, Response } from "express";
import {
  AccessTokenPayload,
  verifyAccessToken,
} from "../services/token.service";

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Extract token from header

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
      code: "NO_TOKEN",
    });
    return;
  }

  if (!authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      message: "Invalid authorization format. Use: Bearer <token>",
      code: "INVALID_TOKEN_FORMAT",
    });
    return;
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({
      success: false,
      message: "No token provided",
      code: "NO_TOKEN",
    });
    return;
  }

  // Verify token

  try {
    const payload = verifyAccessToken(token);

    // Attach payload(user data) to request object

    req.user = payload;
    next();
  } catch (error: any) {
    if (error.message === "ACCESS_TOKEN_EXPIRED") {
      res.status(401).json({
        success: false,
        message: "Access token has expired",
        code: "TOKEN_EXPIRED",
      });
      return;
    }

    res.status(401).json({
      success: false,
      message: "Invalid access token",
      code: "TOKEN_INVALID",
    });
  }
};
