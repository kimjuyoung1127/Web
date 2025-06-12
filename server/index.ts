import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes"; // This function should define routes on the 'app'
import { log } from "./vite"; // Assuming log is still needed

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Logging middleware (can remain if useful for API logs)
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    // Only log for paths that are likely API calls, not static assets
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });
  next();
});

// Initialize API routes by calling registerRoutes.
// IMPORTANT: registerRoutes from server/routes.ts needs to be modified
// to actually add routes to the 'app' instance (e.g., app.get('/api/users', ...)).
// Currently, it only creates an http.Server and returns it, without adding routes to app.
// For Vercel, we export the 'app' instance.
registerRoutes(app); // This call is kept, assuming it WILL be modified to define app routes.
                     // The http.Server it returns is ignored.

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  console.error("Error caught by server/index.ts middleware:", err); // Add some server-side logging
  res.status(status).json({ message });
});

// Export the app for Vercel
export default app;
