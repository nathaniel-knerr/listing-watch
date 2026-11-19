import Fastify from "fastify";
import cors from "@fastify/cors";
import { listingRoutes } from "./routes/listings";

// Builds the app without starting a server, so tests can call it with app.inject()
export function buildApp(opts: { logger?: boolean } = {}) {
	const app = Fastify({ logger: opts.logger ?? true });

	// Let the dashboard (a different address) call this API.
	// @fastify/cors only allows GET/HEAD/POST by default, so the browser would block
	// the dashboard's PATCH (flag) and DELETE requests without listing them here.
	app.register(cors, { origin: true, methods: ["GET", "HEAD", "POST", "PATCH", "DELETE"] });

	// Quick "is it alive?" check
	app.get("/health", async () => ({ ok: true }));

	app.register(listingRoutes);

	return app;
}
