import { Outlet } from '@remix-run/react';
import { LoaderFunctionArgs, json, redirect } from "@remix-run/cloudflare";
import { getUserFromSession } from "../lib/session.js";
import UserSidebar from '~/components/user/UserSidebar';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const user = await getUserFromSession(request, context.env);
  if (!user) {
    return redirect('/login');
  }
  // Users can access their own dashboard
  return json({ user });
}

export default function UserLayout() {
  return (
    <div className="flex h-screen font-sans">
      <UserSidebar />
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}