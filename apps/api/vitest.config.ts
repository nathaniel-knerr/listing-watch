import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		// In-memory SQLite: every test run starts empty and never touches the real file
		env: { DB_PATH: ":memory:" }
	}
});
