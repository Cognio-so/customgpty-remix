import { ActionFunctionArgs, LoaderFunctionArgs, json } from '@remix-run/cloudflare';
import { useLoaderData, useActionData} from '@remix-run/react';  
import UserSettingPage from '~/components/user/UserSetting';
import { getThemeFromCookie, createThemeCookie, Theme } from '~/lib/theme';
import { getUserFromSession } from '../lib/session.js';
import { updateUserProfile, updateUserPassword, uploadProfilePicture } from '../services/auth.js';

type LoaderData = {
  user: {
    id: string;
    name: string;
    email: string;
    profilePic: string;
    role: string;
    isVerified: boolean;
  };
  theme: Theme;
};

type ActionData = {
  success: boolean;
  message?: string;
  error?: string;
  user?: any;
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  try {
    const user = await getUserFromSession(request, context.env);
    if (!user) {
      throw new Response('Unauthorized', { status: 401 });
    }

    const theme = getThemeFromCookie(request) || 'light';
    
    return json({ 
      user: {
        id: user.id || user._id?.toString(),
        name: user.name,
        email: user.email,
        profilePic: user.profilePic || '',
        role: user.role,
        isVerified: user.isVerified
      },
      theme 
    } as LoaderData);
  } catch (error) {
    console.error('Loader error:', error);
    if (error instanceof Response) {
      throw error;
    }
    throw new Response('Internal Server Error', { status: 500 });
  }
}

export async function action({ request, context }: ActionFunctionArgs) {
  try {
    const user = await getUserFromSession(request, context.env);
    if (!user) {
      return json({ error: 'Not authenticated', success: false } as ActionData, { status: 401 });
    }

    const formData = await request.formData();
    const intent = formData.get('intent') as string;

    switch (intent) {
      case 'updateTheme': {
        const theme = formData.get('theme') as Theme;
        
        if (!theme || !['light', 'dark'].includes(theme)) {
          return json({ error: 'Invalid theme', success: false } as ActionData, { status: 400 });
        }

        const cookie = createThemeCookie(theme);
        
        return json(
          { success: true, message: 'Theme updated successfully' } as ActionData,
          { 
            headers: {
              'Set-Cookie': cookie
            }
          }
        );
      }

      case 'updateProfile': {
        const name = formData.get('name') as string;
        const email = formData.get('email') as string;

        if (!name || !email) {
          return json({ error: 'Name and email are required', success: false } as ActionData, { status: 400 });
        }

        try {
          const updatedUser = await updateUserProfile(context.env, user.id || user._id?.toString(), { name, email });
          return json({ 
            success: true, 
            message: 'Profile updated successfully',
            user: updatedUser
          } as ActionData);
        } catch (error) {
          return json({ 
            error: error instanceof Error ? error.message : 'Failed to update profile', 
            success: false 
          } as ActionData, { status: 400 });
        }
      }

      case 'updatePassword': {
        const currentPassword = formData.get('currentPassword') as string;
        const newPassword = formData.get('newPassword') as string;
        const confirmPassword = formData.get('confirmPassword') as string;

        if (!currentPassword || !newPassword || !confirmPassword) {
          return json({ error: 'All password fields are required', success: false } as ActionData, { status: 400 });
        }

        if (newPassword !== confirmPassword) {
          return json({ error: 'New passwords do not match', success: false } as ActionData, { status: 400 });
        }

        if (newPassword.length < 6) {
          return json({ error: 'New password must be at least 6 characters', success: false } as ActionData, { status: 400 });
        }

        try {
          await updateUserPassword(context.env, user.id || user._id?.toString(), currentPassword, newPassword);
          return json({ 
            success: true, 
            message: 'Password updated successfully'
          } as ActionData);
        } catch (error) {
          return json({ 
            error: error instanceof Error ? error.message : 'Failed to update password', 
            success: false 
          } as ActionData, { status: 400 });
        }
      }

      case 'uploadProfilePicture': {
        const profileImage = formData.get('profileImage') as File;

        if (!profileImage || profileImage.size === 0) {
          return json({ error: 'No image file provided', success: false } as ActionData, { status: 400 });
        }

        try {
          const updatedUser = await uploadProfilePicture(context.env, user.id || user._id?.toString(), profileImage);
          return json({ 
            success: true, 
            message: 'Profile picture updated successfully',
            user: updatedUser
          } as ActionData);
        } catch (error) {
          return json({ 
            error: error instanceof Error ? error.message : 'Failed to upload profile picture', 
            success: false 
          } as ActionData, { status: 400 });
        }
      }

      default:
        return json({ error: 'Invalid intent', success: false } as ActionData, { status: 400 });
    }
  } catch (error) {
    console.error('Action error:', error);
    return json({ 
      error: error instanceof Error ? error.message : 'Internal server error', 
      success: false 
    } as ActionData, { status: 500 });
  }
}

export default function UserSettingPageRoute() {
  const loaderData = useLoaderData<LoaderData>();
  const actionData = useActionData<ActionData>();
  
  return <UserSettingPage loaderData={loaderData} actionData={actionData} />;
} 