import Fastify from "fastify";
import cors from "@fastify/cors";
import { listingRoutes } from "./routes/listings";

// Builds the app without starting a server, so tests can call it with app.inject()
export function buildApp(opts: { logger?: boolean } = {}) {
	const app = Fastify({ logger: opts.logger ?? true });

	// Let the dashboard (a different address) call this API
	app.register(cors, { origin: true });

	// Quick "is it alive?" check
	app.get("/health", async () => ({ ok: true }));

	app.register(listingRoutes);

	return app;
}
