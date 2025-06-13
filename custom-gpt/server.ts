import { createRequestHandler, type ServerBuild } from "@remix-run/cloudflare";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore This file won't exist if it hasn't yet been built
import * as build from "./build/server"; // eslint-disable-line import/no-unresolved
import { getLoadContext } from "./load-context";
import { getFile } from "./app/services/storage";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleRemixRequest = createRequestHandler(build as any as ServerBuild);

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const url = new URL(request.url);
      
      // Handle file serving from R2
      if (url.pathname.startsWith('/files/')) {
        const fileName = url.pathname.replace('/files/', '');
        const file = await getFile(env, fileName);
        
        if (!file) {
          return new Response('File not found', { status: 404 });
        }
        
        return new Response(file.body, {
          headers: {
            'Content-Type': file.httpMetadata?.contentType || 'application/octet-stream',
            'Cache-Control': file.httpMetadata?.cacheControl || 'public, max-age=3600',
            'ETag': file.etag || '',
          },
        });
      }
      
      // Handle API file serving with authentication
      if (url.pathname.startsWith('/api/files/')) {
        // Add authentication logic here if needed
        const fileName = url.pathname.replace('/api/files/', '');
        const file = await getFile(env, fileName);
        
        if (!file) {
          return new Response('File not found', { status: 404 });
        }
        
        return new Response(file.body, {
          headers: {
            'Content-Type': file.httpMetadata?.contentType || 'application/octet-stream',
            'Cache-Control': 'private, max-age=300',
          },
        });
      }

      const loadContext = getLoadContext({
        request,
        context: {
          cloudflare: {
            // This object matches the return value from Wrangler's
            // `getPlatformProxy` used during development via Remix's
            // `cloudflareDevProxyVitePlugin`:
            // https://developers.cloudflare.com/workers/wrangler/api/#getplatformproxy
            cf: request.cf,
            ctx: {
              waitUntil: ctx.waitUntil.bind(ctx),
              passThroughOnException: ctx.passThroughOnException.bind(ctx),
            },
            caches,
            env,
          },
        },
      });
      
      return await handleRemixRequest(request, loadContext);
    } catch (error) {
      console.error('Server error:', error);
      return new Response("An unexpected error occurred", { 
        status: 500,
        headers: {
          'Content-Type': 'text/plain',
        }
      });
    }
  },
} satisfies ExportedHandler<Env>;
