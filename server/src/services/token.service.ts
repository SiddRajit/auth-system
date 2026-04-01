import jwt from "jsonwebtoken";
import crypto from "crypto";
import * as dotenv from "dotenv";

dotenv.config();

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const ACCESS_TOKEN_EXPIRY = (process.env.ACCESS_TOKEN_EXPIRY ||
  "15m") as string;
const REFRESH_TOKEN_EXPIRY = (process.env.REFRESH_TOKEN_EXPIRY ||
  "7d") as string;

if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
  throw new Error(
    "ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET must be set in environment variables",
  );
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
  name: string | null;
}

export interface RefreshTokenPayload {
  sub: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshTokenHash: string;
  refreshTokenExpiresAt: Date;
}

export const createTokenPair = (user: {
  id: string;
  email: string;
  name: string | null;
}): TokenPair => {
  const accessTokenPayload: AccessTokenPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
  };

  const accessToken = jwt.sign(accessTokenPayload, ACCESS_TOKEN_SECRET!, {
    expiresIn: ACCESS_TOKEN_EXPIRY as jwt.SignOptions["expiresIn"],
    algorithm: "HS256",
  });

  const refreshTokenPayload: RefreshTokenPayload = {
    sub: user.id,
  };

  const refreshToken = jwt.sign(refreshTokenPayload, REFRESH_TOKEN_SECRET!, {
    expiresIn: REFRESH_TOKEN_EXPIRY as jwt.SignOptions["expiresIn"],
    algorithm: "HS256",
  });

  const refreshTokenHash = hashToken(refreshToken);
  const decoded = jwt.decode(refreshToken) as { exp: number };
  const refreshTokenExpiresAt = new Date(decoded.exp * 1000);

  return {
    accessToken,
    refreshToken,
    refreshTokenExpiresAt,
    refreshTokenHash,
  };
};

// Token verification

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  try {
    const payload = jwt.verify(token, ACCESS_TOKEN_SECRET!, {
      algorithms: ["HS256"],
    }) as AccessTokenPayload;
    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("ACCESS_TOKEN_EXPIRED");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error("ACCESS_TOKEN_INVALID");
    }
    throw error;
  }
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  try {
    const payload = jwt.verify(token, REFRESH_TOKEN_SECRET!, {
      algorithms: ["HS256"],
    }) as RefreshTokenPayload;
    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("REFRESH_TOKEN_EXPIRED");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error("REFRESH_TOKEN_INVALID");
    }
    throw error;
  }
};

export const hashToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};
