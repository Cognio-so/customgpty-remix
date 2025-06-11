import { Form, Link, useActionData, useNavigation } from "@remix-run/react";
import type { ActionFunctionArgs, MetaFunction, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { FcGoogle } from "react-icons/fc";
import { LoginUser } from "../services/auth.js";
import { createUserSession, getUserFromSession } from "../lib/session.js";
import { useState } from "react";

// Define the ActionData type
type ActionData = {
  error?: string;
  message?: string;
  success: boolean;
  email?: string;
};

export const meta: MetaFunction = () => {
  return [
    { title: "Login - Custom GPT" },
    { name: "description", content: "Login to your Custom GPT account" },
  ];
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const user = await getUserFromSession(request, context.env);
  if (user) {
    if (user.role === 'admin') {
      return redirect('/admin');
    } else {
      return redirect('/dashboard');
    }
  }
  return json({});
}

export async function action({ request, context }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  
  try {
    const result = await LoginUser(email, password);
    
    if (result.success) {
      // Determine redirect path based on user role
      const redirectTo = result.user.role === 'admin' ? '/admin' : '/dashboard';
      
      return createUserSession(
        result.user._id.toString(),
        result.user.role,
        redirectTo,
        context.env
      );
    }
    
    if (result.requireVerification) {
      return json({ 
        success: false, 
        message: result.message,
        requireVerification: true 
      });
    }
    
    return json({ success: false, error: "Login failed" });
  } catch (error) {
    return json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Login failed" 
    });
  }
}

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-800 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Sign in</h2>
          <p className="text-gray-500 mt-1">Welcome back! Please enter your details</p>
        </div>

        {actionData && !actionData.success && actionData.error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
            {actionData.error}
          </div>
        )}

        {actionData && !actionData.success && actionData.message && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-600">
            {actionData.message}
            <div className="mt-2">
              <Link 
                to={`/verify-email?email=${encodeURIComponent(actionData.email|| '')}`}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Go to verification page
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
              className="w-full bg-white text-black px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="password" className="block text-sm font-medium text-black">
                Password
              </label>
              <Link to="/forgot-password" className="text-sm text-blue-600 hover:text-blue-800">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                className="w-full bg-white text-black px-3 py-2 border border-neutral-300 rounded-lg pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="••••••••"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                    <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="remember"
              name="remember"
              type="checkbox"
              className="h-4 w-4 bg-white text-black focus:ring-black rounded"
            />
            <label htmlFor="remember" className="ml-2 text-sm text-black">
              Remember me
            </label>
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
                Signing in...
              </div>
            ) : (
              "Sign in"
            )}
          </button>
        </Form>
        
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">or continue with</span>
          </div>
        </div>
        
        <button 
          type="button"
          className="w-full flex items-center justify-center py-2 px-4 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          <FcGoogle className="w-5 h-5 mr-2" />
          <span className="font-medium text-gray-700">Google</span>
        </button>

        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-blue-600 font-medium hover:text-blue-800"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
