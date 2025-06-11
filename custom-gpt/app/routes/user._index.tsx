import { LoaderFunctionArgs, json } from "@remix-run/cloudflare";
import { getUserFromSession } from "../lib/session.js";
import { getAssignedGpts } from "../services/customgpt.js";
import UserDashboard from "~/components/user/UserDashboard";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const user = await getUserFromSession(request, context.env);
  
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  try {
    // Get GPTs assigned to this user
    const agents = await getAssignedGpts(user.id);
    return json({ agents, user });
  } catch (error) {
    console.error("Error loading assigned GPTs:", error);
    return json({ agents: [], user, error: "Failed to load GPTs" });
  }
}

export default function UserDashboardPage() {
  return <UserDashboard />;
} 