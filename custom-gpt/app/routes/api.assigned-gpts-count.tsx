import { json, LoaderFunctionArgs } from '@remix-run/cloudflare';
import { getUserFromSession } from '../lib/session.js';
import { getAssignedGpts } from '../services/customgpt.js';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const user = await getUserFromSession(request, context.env);
  
  if (!user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== 'admin') {
    return json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      return json({ error: "User ID required" }, { status: 400 });
    }

    // Fix: Add context.env parameter
    const assignedGpts = await getAssignedGpts(context.env, userId);
    return json({ 
      count: assignedGpts?.length || 0,
      assignedGpts: assignedGpts || []
    });
  } catch (error) {
    console.error('Error fetching assigned GPTs:', error);
    return json({ error: "Failed to fetch assigned GPTs" }, { status: 500 });
  }
} 