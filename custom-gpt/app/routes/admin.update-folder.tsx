import { ActionFunctionArgs, json } from "@remix-run/cloudflare";
import { getUserFromSession } from "../lib/session.js";
import { updateCustomGpt } from "../services/customgpt.js";

export async function action({ request, context }: ActionFunctionArgs) {
  const user = await getUserFromSession(request, context.env);
  
  if (!user || user.role !== 'admin') {
    throw new Response("Unauthorized", { status: 401 });
  }

  const formData = await request.formData();
  const id = formData.get('id') as string;
  const folder = formData.get('folder') as string;
  const intent = formData.get('intent') as string;

  if (intent === 'updateFolder' && id) {
    try {
      await updateCustomGpt(id, { folder: folder || null }, user.id);
      return json({ success: true, message: "Folder updated successfully" });
    } catch (error) {
      console.error("Error updating folder:", error);
      return json({ success: false, error: "Failed to update folder" }, { status: 400 });
    }
  }

  return json({ success: false, error: "Invalid action" }, { status: 400 });
} 