import { LoaderFunctionArgs, json, redirect } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { getUserFromSession } from "../lib/session.js";
import { getUserById } from "../services/auth.js";
import { getAllCustomGpts } from "../services/customgpt.js";
import TeamMemberDetails from "~/components/admin/TeamMemberDetails";

export async function loader({ params, request, context }: LoaderFunctionArgs) {
  const user = await getUserFromSession(request, context.env);
  
  if (!user || user.role !== 'admin') {
    throw new Response("Unauthorized", { status: 401 });
  }

  if (!params.id) {
    throw new Response("Member ID is required", { status: 400 });
  }

  try {
    const memberResult = await getUserById(params.id);
    
    // If user not found (deleted/inactive), redirect to team page
    if (!memberResult) {
      return redirect('/admin/team');
    }

    // Get GPTs created by this member
    const memberGpts = await getAllCustomGpts(params.id);
    
    return json({ 
      user: memberResult,
      gpts: memberGpts || [],
      isCurrentUser: user.id === params.id 
    });
  } catch (error) {
    console.error("Error loading member details:", error);
    // Redirect to team page if there's an error
    return redirect('/admin/team');
  }
}

export default function TeamMemberDetailsPage() {
  const { user, gpts, isCurrentUser } = useLoaderData<typeof loader>();
  
  return <TeamMemberDetails user={user} gpts={gpts} isCurrentUser={isCurrentUser} />;
} 