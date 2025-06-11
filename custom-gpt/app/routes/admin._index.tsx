import { LoaderFunctionArgs, json } from "@remix-run/cloudflare";
import { getUserFromSession } from "../lib/session.js";
import { getAllCustomGpts } from "../services/customgpt.js";
import AdminDashboard from "~/components/admin/AdminDashboard";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const user = await getUserFromSession(request, context.env);
  
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }
  
  if (user.role !== 'admin') {
    throw new Response("Forbidden", { status: 403 });
  }

  try {
    const agents = await getAllCustomGpts(user.id);
    return json({ agents, user });
  } catch (error) {
    console.error("Error loading custom GPTs:", error);
    return json({ agents: [], user, error: "Failed to load GPTs" });
  }
}

export default function AdminDashboardPage() {
  return <AdminDashboard />;
}