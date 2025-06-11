import { ActionFunctionArgs, json } from "@remix-run/cloudflare";
import { getUserFromSession } from "../lib/session.js";
import { deleteCustomGpt } from "../services/customgpt.js";

export async function action({ request, context }: ActionFunctionArgs) {
  const user = await getUserFromSession(request, context.env);
  
  if (!user || user.role !== 'admin') {
    throw new Response("Unauthorized", { status: 401 });
  }

  const formData = await request.formData();
  const id = formData.get('id') as string;
  const intent = formData.get('intent') as string;

  if (intent === 'delete' && id) {
    try {
      await deleteCustomGpt(id, user.id);
      return json({ success: true, message: "GPT deleted successfully" });
    } catch (error) {
      console.error("Error deleting GPT:", error);
      return json({ success: false, error: "Failed to delete GPT" }, { status: 400 });
    }
  }

  return json({ success: false, error: "Invalid action" }, { status: 400 });
} 