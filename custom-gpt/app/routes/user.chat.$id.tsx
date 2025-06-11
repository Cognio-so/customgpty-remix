import { LoaderFunctionArgs, json } from "@remix-run/cloudflare";
import { useLoaderData, useParams } from "@remix-run/react";
import { getUserFromSession } from "../lib/session.js";
import { getCustomGptById } from "../services/customgpt.js";
import AdminChat from "~/components/admin/AdminChat"; // Reuse the same chat component

export async function loader({ request, context, params }: LoaderFunctionArgs) {
  const user = await getUserFromSession(request, context.env);
  
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const { id } = params;
  
  if (!id) {
    throw new Response("GPT ID is required", { status: 400 });
  }

  try {
    // This will check if user has access to the GPT (either created it or it's assigned to them)
    const gptData = await getCustomGptById(id, user.id);
    return json({ gptData, user });
  } catch (error) {
    console.error("Error loading GPT:", error);
    throw new Response("GPT not found or access denied", { status: 404 });
  }
}

export default function UserChatPage() {
  const { gptData, user } = useLoaderData<typeof loader>();
  
  return <AdminChat />;
} 