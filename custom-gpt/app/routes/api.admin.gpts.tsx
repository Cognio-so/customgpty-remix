import { json, LoaderFunctionArgs } from '@remix-run/cloudflare';
import { getUserFromSession } from '../lib/session.js';
import { getAllCustomGpts } from '../services/customgpt.js';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const user = await getUserFromSession(request, context.env);
  
  if (!user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== 'admin') {
    return json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Get all GPTs created by this admin
    const gpts = await getAllCustomGpts(user.id);
    return json({ gpts: gpts || [] });
  } catch (error) {
    console.error('Error fetching admin GPTs:', error);
    return json({ error: "Failed to fetch GPTs" }, { status: 500 });
  }
} 