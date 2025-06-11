import { LoaderFunctionArgs, json } from "@remix-run/cloudflare";
import { getUserFromSession } from "../lib/session.js";
import { getAllCustomGpts } from "../services/customgpt.js";
import AdminCollectionPage from "~/components/admin/AdminCollectionPage";

interface CustomGpt {
  _id: string;
  name: string;
  description: string;
  imageUrl?: string;
  model: string;
  systemPrompt: string;
  instructions: string;
  conversationStarter: string;
  capabilities?: {
    webBrowsing?: boolean;
  };
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  try {
    const user = await getUserFromSession(request, context.env);
    if (!user) {
      throw new Response("Unauthorized", { status: 401 });
    }

    if (user.role !== 'admin') {
      throw new Response("Forbidden: Admin access required", { status: 403 });
    }

    const gptsResult = await getAllCustomGpts(user.id);
    if (!gptsResult) {
      throw new Response("Failed to fetch GPTs", { status: 500 });
    }

    return json({
      currentUser: user,
      customGpts: gptsResult as unknown as CustomGpt[],
      totalGpts: gptsResult.length
    });
  } catch (error) {
    console.error("Collection loader error:", error);
    if (error instanceof Response) {
      throw error;
    }
    throw new Response("Internal Server Error", { status: 500 });
  }
}

export default function AdminCollectionsPage() {
  return <AdminCollectionPage />;
}