import {readFile} from "fs/promises";
import path from "path";
import {fileURLToPath} from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const promptPath = path.resolve(
    __dirname,
    "../../../prompt.txt"
);

export const getSystemPrompt = async () => {
    const prompt = await readFile(promptPath, "utf-8");

    if (!prompt.trim()) {
        throw new Error("AI prompt file is empty.");
    }

    return prompt.trim();
};