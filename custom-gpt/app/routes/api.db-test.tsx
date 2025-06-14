import { json, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { checkDatabaseHealth } from "~/lib/db.js";

export async function loader({ context }: LoaderFunctionArgs) {
  try {
    const env = context.env;
    const healthCheck = await checkDatabaseHealth(env);
    
    return json({
      success: true,
      database: healthCheck,
      timestamp: new Date().toISOString(),
      environment: {
        hasMongoUri: !!env.MONGODB_URI,
        mongoUriPrefix: env.MONGODB_URI ? env.MONGODB_URI.substring(0, 20) + '...' : 'Not set'
      }
    });
  } catch (error: any) {
    console.error('Database test failed:', error);
    return json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 