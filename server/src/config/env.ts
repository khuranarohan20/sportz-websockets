/**
 * Environment configuration loader.
 *
 * IMPORTANT: This must be imported FIRST in src/index.ts before any other config
 * to ensure environment variables are loaded from .env file.
 */
import { configDotenv } from "dotenv";

configDotenv();
