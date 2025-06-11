import { json, LoaderFunctionArgs, MetaFunction, redirect } from "@remix-run/cloudflare";
import { Link, useLoaderData, useNavigate, Form } from "@remix-run/react";
import { getUserFromSession } from "../lib/session.js";

export const meta: MetaFunction = () => {
  return [
    { title: "Dashboard - Custom GPT" },
    { name: "description", content: "Dashboard for Custom GPT" },
  ];
};

type LoaderData = {
  user: {
    id: string;
    name: string;
    role: string;
  } | null;
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const user = await getUserFromSession(request, context.env);
  
  // If no user is found, redirect to login
  if (!user) {
    return redirect("/login");
  }
  
  // Redirect based on user role
  if (user.role === 'admin') {
    return redirect("/admin");
  } else {
    return redirect("/user");
  }
}

const handleLogin = (navigate: any)=>{
  navigate("/login", {replace: true});
}

const handleLogout = (navigate: any)=>{
  navigate("/logout", {replace: true});
}

export default function Dashboard() {
  return null;
}   