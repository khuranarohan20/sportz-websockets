/// <reference types="node" />

interface ProcessEnv {
  NODE_ENV?: string;
  PORT?: string;
  HOST?: string;
  DATABASE_URL: string;
  ARCJET_KEY?: string;
  ARCJET_MODE?: 'LIVE' | 'DRY_RUN';
}

declare global {
  namespace NodeJS {
    interface ProcessEnv extends ProcessEnv {}
  }
}

export {};
