import { ActionFunctionArgs, json } from "@remix-run/cloudflare";
import { getUserFromSession } from "../lib/session.js";

export async function action({ request, context }: ActionFunctionArgs) {
  const user = await getUserFromSession(request, context.env);
  
  if (!user || user.role !== 'admin') {
    throw new Response("Unauthorized", { status: 401 });
  }

  const formData = await request.formData();
  const intent = formData.get('intent') as string;

  if (intent === 'chat') {
    const message = formData.get('message') as string;
    const gptId = formData.get('gptId') as string;
    const model = formData.get('model') as string;
    const instructions = formData.get('instructions') as string;
    const webSearch = formData.get('webSearch') === 'true';

    try {
      // Here you would implement the actual chat logic
      // This is a placeholder response
      const response = {
        id: Date.now(),
        role: 'assistant' as const,
        content: `This is a response to: "${message}". Chat functionality needs to be implemented with your AI service.`,
        timestamp: new Date().toISOString()
      };

      return json({ success: true, message: response });
    } catch (error) {
      console.error("Error in chat:", error);
      return json({ success: false, error: "Failed to process chat" }, { status: 500 });
    }
  }

  return json({ success: false, error: "Invalid intent" }, { status: 400 });
} 