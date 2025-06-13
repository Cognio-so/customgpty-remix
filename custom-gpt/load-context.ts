import { type PlatformProxy } from "wrangler";
import { connectToDatabase } from "./app/lib/db.js";
import { uploadFile, deleteFile, getFile } from "./app/services/storage.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "./app/services/mail.js";

type GetLoadContextArgs = {
  request: Request;
  context: {
    cloudflare: Omit<PlatformProxy<Env>, "dispose" | "caches" | "cf"> & {
      caches: PlatformProxy<Env>["caches"] | CacheStorage;
      cf: Request["cf"];
    };
  };
};

declare module "@remix-run/cloudflare" {
  interface AppLoadContext extends ReturnType<typeof getLoadContext> {
    // This will merge the result of `getLoadContext` into the `AppLoadContext`
  }
}

export function getLoadContext({ context }: GetLoadContextArgs) {
  // Create merged environment with fallbacks
  const mergedEnv = {
    ...context.cloudflare.env,
    // In development, add process.env fallbacks
    ...(typeof process !== 'undefined' && process.env ? process.env : {}),
  };

  // Ensure required environment variables have defaults for development
  if (!mergedEnv.SESSION_SECRET && mergedEnv.NODE_ENV === 'development') {
    console.warn('⚠️  Using development SESSION_SECRET fallback');
    mergedEnv.SESSION_SECRET = 'dev-secret-key-minimum-32-characters-long-for-development-only';
  }

  if (!mergedEnv.APP_URL) {
    mergedEnv.APP_URL = 'http://localhost:5173';
  }

  return {
    ...context,
    // Add merged environment
    env: mergedEnv,
    
    // Database utilities
    db: {
      async connectToDatabase() {
        return connectToDatabase(mergedEnv);
      },
      async getDatabase() {
        return connectToDatabase(mergedEnv);
      }
    },
    
    // Storage utilities
    storage: {
      async uploadFile(file: File, folder?: string) {
        return uploadFile(mergedEnv, file, folder);
      },
      async deleteFile(fileName: string) {
        return deleteFile(mergedEnv, fileName);
      },
      async getFile(fileName: string) {
        return getFile(mergedEnv, fileName);
      }
    },
    
    // Email utilities
    email: {
      async sendVerificationEmail(email: string, username: string, token: string) {
        return sendVerificationEmail(mergedEnv, email, username, token);
      },
      async sendPasswordResetEmail(email: string, username: string, token: string) {
        return sendPasswordResetEmail(mergedEnv, email, username, token);
      }
    }
  };
}
