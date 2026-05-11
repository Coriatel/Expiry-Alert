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
import { suppliersRouter } from "./routes/suppliers.js";
import { reagentCatalogRouter } from "./routes/reagentCatalog.js";
import { destructionLogRouter } from "./routes/destructionLog.js";
import { duplicationLogRouter } from "./routes/duplicationLog.js";
import { importRouter } from "./routes/import.js";
import { transferRequestsRouter } from "./routes/transferRequests.js";
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
app.use("/api/suppliers", suppliersRouter);
app.use("/api/reagent-catalog", reagentCatalogRouter);
app.use("/api/destruction-log", destructionLogRouter);
app.use("/api/duplication-log", duplicationLogRouter);
app.use("/api/import", importRouter);
app.use("/api/transfer-requests", transferRequestsRouter);

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

// Surface (and survive) unhandled async errors from fire-and-forget work.
// Without this, Node 22 terminates the process on any rejected promise that
// escapes a handler — taking the whole API down between requests.
process.on("unhandledRejection", (reason: unknown) => {
  const detail =
    reason instanceof Error
      ? { message: reason.message, stack: reason.stack }
      : (() => {
          try {
            return JSON.parse(JSON.stringify(reason));
          } catch {
            return String(reason);
          }
        })();
  console.error("[unhandledRejection]", detail);
});

process.on("uncaughtException", (err: Error) => {
  console.error("[uncaughtException]", err?.stack ?? err);
});
