import { Client } from "discord.js";
import { readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Logger } from "./logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function loadEvents(client: Client) {
  const eventsPath = join(__dirname, "..", "events");

  try {
    const eventFiles = readdirSync(eventsPath).filter(
      (file) => file.endsWith(".js") && !file.endsWith(".d.ts")
    );

    Logger.info(`Loading ${eventFiles.length} event handlers...`);

    for (const file of eventFiles) {
      const filePath = join(eventsPath, file);
      const event = await import(filePath);

      if (event.default?.name) {
        if (event.default.once) {
          client.once(event.default.name, (...args) =>
            event.default.execute(...args)
          );
        } else {
          client.on(event.default.name, (...args) =>
            event.default.execute(...args)
          );
        }
        Logger.success(`Loaded event: ${event.default.name}`);
      } else {
        Logger.warn(`Event file ${file} is missing name or execute function`);
      }
    }
  } catch (error) {
    Logger.error("Error loading events:", error);
  }
}
