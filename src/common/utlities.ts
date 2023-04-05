import fs from "node:fs/promises";

export const wipeStorage = () => fs.rm("./storage", { recursive: true });
