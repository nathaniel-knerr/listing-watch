import { buildApp } from "./app";
import { sequelize } from "./db";

const PORT = Number(process.env.PORT ?? 3001);

// Create the table if it doesn't exist yet, then start listening
await sequelize.sync();
const app = buildApp();
await app.listen({ port: PORT, host: "127.0.0.1" });
