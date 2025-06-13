import { useState } from "react";
import { Form, useActionData, useSearchParams, Link, useNavigation } from "@remix-run/react";
import type { ActionFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { verifyEmail } from "../services/auth.js";
import { createUserSession } from "../lib/session.js"; 
import { redirect, json } from "@remix-run/cloudflare";

type ActionData = {
  error?: string;
  success: boolean;
};

export const meta: MetaFunction = () => {
  return [
    { title: "Verify Email - Custom GPT" },
    { name: "description", content: "Verify your email address" },
  ];
};

export async function action({ request, context }: ActionFunctionArgs) {
  const formData = await request.formData();
  
  try {
    const email = formData.get("email") as string;
    const token = [
      formData.get("digit1"),
      formData.get("digit2"),
      formData.get("digit3"),
      formData.get("digit4"),
      formData.get("digit5"),
      formData.get("digit6"),
    ].join("");
    
    const result = await verifyEmail(context.env, { email, token });
    
    return createUserSession(
      result.user._id,
      result.user.role,
      "/dashboard",
      context.env
    );
  } catch (error) {
    return json<ActionData>(
      { error: error instanceof Error ? error.message : "Verification failed", success: false },
      { status: 400 }
    );
  }
}

export default function VerifyEmail() {
  const actionData = useActionData<ActionData>();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";
  const message = searchParams.get("message") || "";
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  
  const handleChange = (index: number, value: string) => {
    // Only allow numbers
    if (!/^\d*$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    
    // Auto-focus to next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`digit${index + 2}`) as HTMLInputElement;
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace to move to previous input
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`digit${index}`) as HTMLInputElement;
      if (prevInput) prevInput.focus();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-800 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Verify Your Email</h2>
          <p className="text-gray-500 mt-1">Enter the 6-digit code sent to your email</p>
          {email && (
            <p className="text-gray-600 text-sm mt-2 truncate">{email}</p>
          )}
        </div>

        {message && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-600">
            {message}
          </div>
        )}

        {actionData && !actionData.success && actionData.error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
            {actionData.error}
          </div>
        )}

        <Form method="post" className="space-y-6">
          <input type="hidden" name="email" value={email} />
          
          <div className="flex justify-between space-x-2">
            {[1, 2, 3, 4, 5, 6].map((digit, index) => (
              <input
                key={digit}
                id={`digit${digit}`}
                name={`digit${digit}`}
                type="text"
                maxLength={1}
                value={otp[index]}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-14 text-center text-xl font-bold bg-white text-black border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                inputMode="numeric"
                pattern="[0-9]*"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-black text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Verifying...
              </div>
            ) : (
              "Verify Email"
            )}
          </button>
        </Form>

        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            Didn't receive the code?{" "}
            <Link
              to="/login"
              className="text-blue-600 font-medium hover:text-blue-800"
            >
              Try signing in again
            </Link>
          </p>
          <p className="text-gray-600 text-sm mt-2">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-blue-600 font-medium hover:text-blue-800"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 