import { LoaderFunctionArgs, json } from "@remix-run/cloudflare";
import { useLoaderData, useParams } from "@remix-run/react";
import { getUserFromSession } from "../lib/session.js";
import { getCustomGptById } from "../services/customgpt.js";
import AdminChat from "~/components/admin/AdminChat";

export async function loader({ request, context, params }: LoaderFunctionArgs) {
  const user = await getUserFromSession(request, context.env);
  
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }
  
  if (user.role !== 'admin') {
    throw new Response("Forbidden", { status: 403 });
  }

  const { id } = params;
  
  if (!id) {
    throw new Response("GPT ID is required", { status: 400 });
  }

  try {
    const gptData = await getCustomGptById(id, user.id);
    return json({ gptData, user });
  } catch (error) {
    console.error("Error loading GPT:", error);
    throw new Response("GPT not found", { status: 404 });
  }
}

export default function AdminChatPage() {
  return <AdminChat />;
} 