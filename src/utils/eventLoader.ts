import { Client } from "discord.js";
import { readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function loadEvents(client: Client) {
  const eventsPath = join(__dirname, "..", "events");

  try {
    const eventFiles = readdirSync(eventsPath).filter(
      (file) => file.endsWith(".js") && !file.endsWith(".d.ts")
    );

    console.log(`Loading ${eventFiles.length} event handlers...`);

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
        console.log(`✅ Loaded event: ${event.default.name}`);
      } else {
        console.warn(
          `⚠️  Event file ${file} is missing name or execute function`
        );
      }
    }
  } catch (error) {
    console.error("Error loading events:", error);
  }
}
