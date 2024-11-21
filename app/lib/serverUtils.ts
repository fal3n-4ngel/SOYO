import fs from "fs";
import path from "path";

interface Config {
  movieDir?: string;
}

const CONFIG_PATH: string = path.resolve("./config.json");

/**
 * Reads the configuration file.
 * @returns Config object containing the movie directory.
 */
export function readConfig(): Config {
  try {
   

    if (fs.existsSync(CONFIG_PATH)) {
      const rawData = fs.readFileSync(CONFIG_PATH, "utf8");
      return JSON.parse(rawData) as Config;
      
    }
    return { movieDir: "G:/" }; // Default value
  } catch (error) {
    console.error("Error reading config:", error);
    return { movieDir: "G:/" };
  }
}

/**
 * Writes the configuration file.
 * @param config - Config object to write.
 */
export function writeConfig(config: Config): void {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error("Error writing config:", error);
  }
}

/**
 * Recursively retrieves all movies from the given directory.
 * @param dir - Directory to search for movies.
 * @returns List of movie objects with name and thumbnail.
 */
export function getMoviesRecursively(
  dir: string
): { name: string; thumbnail: string }[] {
  let results: { name: string; thumbnail: string }[] = [];

  const list = fs.readdirSync(dir);

  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat && stat.isDirectory()) {
      results = results.concat(getMoviesRecursively(filePath));
    } else {
      if (
        file.endsWith(".mp4") ||
        file.endsWith(".avi") ||
        file.endsWith(".ogg")||
        file.endsWith(".webm")||
        file.endsWith(".mkv")
      ) {
        if (file[0] !== "$") {
          results.push({
            name: file,
            thumbnail: `/api/thumbnail/${encodeURIComponent(file)}`,
          });
        }
      }
    }
  });

  return results;
}

export const handlePathSelection = (selectedPath: string) => () => {
  try {
    const configPath = path.resolve("./config.json");

    // Read existing config with type annotation
    let config: Config = {};

    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    }

    // Update movie directory
    config.movieDir = selectedPath;

    // Write updated config
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    console.log("Path set to:", selectedPath);
  } catch (error) {
    console.error("Error selecting directory:", error);
    alert("An error occurred while selecting directory");
  }
};
