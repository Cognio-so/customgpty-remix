import { LoaderFunctionArgs, redirect } from "@remix-run/cloudflare";
import { getUserFromSession } from "../lib/session.js";
import { getCustomGptById } from "../services/customgpt.js";

export async function loader({ params, request, context }: LoaderFunctionArgs) {
  const user = await getUserFromSession(request, context.env);
  
  if (!user || user.role !== 'admin') {
    throw new Response("Unauthorized", { status: 401 });
  }

  if (!params.id) {
    throw new Response("GPT ID is required", { status: 400 });
  }

  try {
    const gpt = await getCustomGptById(context.env, params.id, user.id);
    // Redirect to the create-gpt route with edit mode and GPT data
    const searchParams = new URLSearchParams({
      mode: 'edit',
      id: params.id,
      data: JSON.stringify(gpt)
    });
    
    return redirect(`/admin/create-gpt?${searchParams.toString()}`);
  } catch (error) {
    console.error("Error loading GPT for edit:", error);
    throw new Response("GPT not found", { status: 404 });
  }
}

// No default export needed since this is just a redirect route 