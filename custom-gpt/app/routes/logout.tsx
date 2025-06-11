import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { redirect } from "@remix-run/cloudflare";
import { logout } from "../lib/session.js";

export function loader({ request, context }: LoaderFunctionArgs) {
  return redirect("/login");
}

export async function action({ request, context }: ActionFunctionArgs) {
  return logout(request, context.env);
}

export default function Logout() {
  return null;
}
