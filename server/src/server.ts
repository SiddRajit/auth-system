import * as dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { checkDatabaseConnection } from "./db";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  }),
);
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

// Routes

app.use("/api/auth", authRouter);

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// 404 Handler

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  });
});

//Error Handler

app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    console.error("Unhandled error:", err);
    const message =
      process.env.NODE_ENV === "production"
        ? "An internal server error occurred"
        : err.message;
    res.status(500).json({
      success: false,
      message,
    });
  },
);

async function startServer() {
  try {
    await checkDatabaseConnection();
    app.listen(PORT, () => {
      console.log(`Auth server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server", error);
    process.exit(1);
  }
}

startServer();

export default app;
