import { ActionFunctionArgs, LoaderFunctionArgs, json } from "@remix-run/cloudflare";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import { getUserFromSession } from "../lib/session.js";
import { sendInvitationEmail } from "../services/mail.js";
import { inviteTeamMember } from "../services/auth.js";
import { useState } from "react";

type ActionData = {
  error?: string;
  success?: boolean;
  message?: string;
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const user = await getUserFromSession(request, context.env);
  
  if (!user || user.role !== 'admin') {
    throw new Response("Unauthorized", { status: 401 });
  }

  return json({ user });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const user = await getUserFromSession(request, context.env);
  
  if (!user || user.role !== 'admin') {
    return json({ error: "Unauthorized", success: false }, { status: 401 });
  }

  const formData = await request.formData();
  const intent = formData.get('intent') as string;
  const email = formData.get('email') as string;
  const role = formData.get('role') as string || 'user';

  if (intent === 'invite') {
    try {
      // Create invitation record and send email
      const result = await inviteTeamMember(email, role, user.id);
      
      if (result.success) {
        return json({ 
          success: true, 
          message: `Invitation sent successfully to ${email}` 
        });
      } else {
        return json({ 
          error: result.message || "Failed to send invitation", 
          success: false 
        }, { status: 400 });
      }
    } catch (error) {
      console.error("Error sending invitation:", error);
      return json({ 
        error: error instanceof Error ? error.message : "Failed to send invitation", 
        success: false 
      }, { status: 400 });
    }
  }

  return json({ error: "Invalid action", success: false }, { status: 400 });
}

export default function InviteTeamMember() {
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invite Team Member</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Send an invitation to join your team</p>
          </div>

          {actionData?.error && (
            <div className="m-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
              {actionData.error}
            </div>
          )}

          {actionData?.success && (
            <div className="m-6 bg-green-50 border border-green-200 rounded-lg p-4 text-green-600">
              {actionData.message}
            </div>
          )}

          <Form method="post" className="p-6 space-y-6">
            <input type="hidden" name="intent" value="invite" />
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="colleague@company.com"
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Role
              </label>
              <select
                id="role"
                name="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="submit"
                disabled={isSubmitting || !email}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </>
                ) : (
                  'Send Invitation'
                )}
              </button>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
} 