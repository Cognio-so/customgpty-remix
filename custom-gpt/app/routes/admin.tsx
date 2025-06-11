import { Outlet } from '@remix-run/react';
import { LoaderFunctionArgs, json, redirect } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { getUserFromSession } from "../lib/session.js";
import AdminSidebar from '~/components/admin/AdminSidebar';
  

export async function loader({ request, context }: LoaderFunctionArgs) {
  const user = await getUserFromSession(request, context.env);
  if (!user) {
    return redirect('/login');
  }
  if (user.role !== 'admin') {
    return redirect('/dashboard');
  }
  return json({ user });
}

export default function AdminLayout() {
  return (
    <div className="flex h-screen font-sans">
      <AdminSidebar />
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
} 