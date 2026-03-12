import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import passport from "passport";
import { config, warnMissingConfig } from "./config.js";
import { configurePassport } from "./auth.js";
import { authRouter } from "./routes/auth.js";
import { reagentsRouter } from "./routes/reagents.js";
import { notesRouter } from "./routes/notes.js";
import { settingsRouter } from "./routes/settings.js";
import { notificationsRouter } from "./routes/notifications.js";
import { teamsRouter } from "./routes/teams.js";
import { pushRouter } from "./routes/push.js";
import { calendarRouter } from "./routes/calendar.js";
import { messagesRouter } from "./routes/messages.js";
import { initCron } from "./services/cron.js";

warnMissingConfig();
configurePassport();
initCron();

const app = express();

app.set("trust proxy", 1);

app.use(
  cors({
    origin: config.appBaseUrl,
    credentials: true,
  }),
);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan("dev"));
app.use(express.json({ limit: "1mb" }));

// Session store — prefer PostgreSQL if configured, fall back to MemoryStore
const sessionConfig: session.SessionOptions = {
  name: config.sessionName,
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: config.nodeEnv === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
};

let pgSessionStore:
  | InstanceType<ReturnType<typeof connectPgSimple>>
  | undefined;

if (config.sessionDbUrl) {
  const PgSession = connectPgSimple(session);
  pgSessionStore = new PgSession({
    conString: config.sessionDbUrl,
    tableName: "session",
  });
  sessionConfig.store = pgSessionStore;
  console.log("Session store: PostgreSQL");
} else {
  console.warn(
    "SESSION_DB_URL not set — using MemoryStore (sessions lost on restart)",
  );
}

app.use(session(sessionConfig));

app.use(passport.initialize());
app.use(passport.session());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/reagents", reagentsRouter);
app.use("/api/notes", notesRouter);
app.use("/api/notification-settings", settingsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/teams", teamsRouter);
app.use("/api/push", pushRouter);
app.use("/api/calendar", calendarRouter);
app.use("/api/messages", messagesRouter);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDist = path.resolve(__dirname, "../../web/dist");
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(webDist, "index.html"));
  });
}

// Basic error logger to surface OAuth failures and other 5xx causes.
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err);
    if (err?.oauthError) {
      console.error(
        "OAuthError",
        err.oauthError.statusCode ?? "",
        err.oauthError.data ?? err.oauthError,
      );
    }
    if (err?.data) {
      console.error("Error data", err.data);
    }
    res.status(500).json({ error: "Internal Server Error" });
  },
);

const server = app.listen(config.port, () => {
  console.log(`Expiry Alert API listening on ${config.port}`);
});

// Graceful shutdown
function shutdown(signal: string) {
  console.log(`${signal} received — shutting down gracefully`);
  server.close(() => {
    if (pgSessionStore) pgSessionStore.close();
    console.log("Server closed");
    process.exit(0);
  });
  // Force exit after 10s
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
