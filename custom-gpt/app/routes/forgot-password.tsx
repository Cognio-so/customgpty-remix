import { useState } from "react";
import { Form, Link, useActionData, useNavigation } from "@remix-run/react";
import type { ActionFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { requestPasswordReset } from "../services/auth.js";

type ActionData = {
  error?: string;
  success: boolean;
  message?: string;
};

export const meta: MetaFunction = () => {
  return [
    { title: "Forgot Password - Custom GPT" },
    { name: "description", content: "Reset your password" },
  ];
};

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get("email") as string;

  try {
    const result = await requestPasswordReset(email);
    return json<ActionData>({ 
      success: true,
      message: result.message
    });
  } catch (error: any) {
    return json<ActionData>({ 
      error: error.message || "Failed to send reset email",
      success: false 
    }, { status: 400 });
  }
}

export default function ForgotPassword() {
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-800 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Forgot Password</h2>
          <p className="text-gray-500 mt-1">Enter your email to receive a reset code</p>
        </div>

        {actionData && !actionData.success && actionData.error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
            {actionData.error}
          </div>
        )}

        {actionData && actionData.success && actionData.message && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-600">
            {actionData.message}
            <div className="mt-2">
              <Link
                to="/reset-password"
                className="text-green-700 font-medium hover:text-green-800"
              >
                Click here to reset your password →
              </Link>
            </div>
          </div>
        )}

        <Form method="post" className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-black mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full bg-white text-black px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Enter your email"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-black text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Sending...
              </div>
            ) : (
              "Send Reset Code"
            )}
          </button>
        </Form>

        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            Remember your password?{" "}
            <Link
              to="/login"
              className="text-black font-medium hover:text-blue-800"
            >
              Sign in
            </Link>
          </p>
          <p className="text-gray-600 text-sm mt-2">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-black font-medium hover:text-blue-800"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 