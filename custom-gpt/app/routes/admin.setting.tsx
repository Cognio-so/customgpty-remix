import { ActionFunctionArgs, LoaderFunctionArgs, json } from '@remix-run/cloudflare';
import { useLoaderData, useActionData } from '@remix-run/react';
import AdminSettingPage from '~/components/admin/AdminSettingPage';
import { getThemeFromCookie, createThemeCookie, Theme } from '~/lib/theme';
import { requiredAuth, getApiKeys, updateApiKeys } from '~/services/auth';

export async function loader({ request, context }: LoaderFunctionArgs) {
  try {
    // Check if user is authenticated and get user data
    const authResult = await requiredAuth(request, context.env);
    if (!authResult.success) {
      throw new Error('Not authenticated');
    }

    const user = authResult.user;
    if (user.role !== 'admin') {
      throw new Error('Not authorized');
    }

    const theme = getThemeFromCookie(request) || 'light';
    
    // Get API keys from database
    const apiKeysResult = await getApiKeys(context.env, user._id);
    
    const userSettings = {
      theme,
      apiKeys: apiKeysResult.success ? apiKeysResult.apiKeys : {
        openai: '',
        claude: '',
        gemini: '',
        llama: ''
      }
    };

    return json({ userSettings, user });
  } catch (error) {
    console.error('Loader error:', error);
    throw new Response('Unauthorized', { status: 401 });
  }
}

export async function action({ request, context }: ActionFunctionArgs) {
  try {
    // Check if user is authenticated
    const authResult = await requiredAuth(request, context.env);
    if (!authResult.success) {
      return json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = authResult.user;
    if (user.role !== 'admin') {
      return json({ error: 'Not authorized' }, { status: 403 });
    }

    const formData = await request.formData();
    const intent = formData.get('intent');

    switch (intent) {
      case 'updateTheme': {
        const theme = formData.get('theme') as Theme;
        if (theme !== 'light' && theme !== 'dark') {
          return json({ error: 'Invalid theme' }, { status: 400 });
        }


        return json(
          { success: true, message: 'Theme updated successfully' },
          {
            headers: {
              'Set-Cookie': createThemeCookie(theme),
            },
          }
        );
      }

      case 'updateApiKeys': {
        const apiKeys = {
          openai: formData.get('openai') as string || '',
          claude: formData.get('claude') as string || '',
          gemini: formData.get('gemini') as string || '',
          llama: formData.get('llama') as string || ''
        };

        // Filter out empty values
        const filteredApiKeys = Object.fromEntries(
          Object.entries(apiKeys).filter(([key, value]) => value.trim() !== '')
        );

        if (Object.keys(filteredApiKeys).length === 0) {
          return json({ error: 'At least one API key is required' }, { status: 400 });
        }

        const result = await updateApiKeys(context.env, user._id, apiKeys);
        
        if (result.success) {
          return json({ success: true, message: result.message });
        } else {
          return json({ error: 'Failed to update API keys' }, { status: 500 });
        }
      }

      case 'updatePassword': {
        const currentPassword = formData.get('currentPassword') as string;
        const newPassword = formData.get('newPassword') as string;
        const confirmPassword = formData.get('confirmPassword') as string;

        if (!currentPassword || !newPassword || !confirmPassword) {
          return json({ error: 'All password fields are required' }, { status: 400 });
        }

        if (newPassword !== confirmPassword) {
          return json({ error: 'New passwords do not match' }, { status: 400 });
        }

        if (newPassword.length < 8) {
          return json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
        }


        
        return json({ success: true, message: 'Password updated successfully' });
      }

      default:
        return json({ error: 'Invalid intent' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Settings update error:', error);
    return json({ error: error.message || 'Failed to update settings' }, { status: 500 });
  }
}

export default function AdminSettingPageRoute() {
  const { userSettings } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  
  return <AdminSettingPage userSettings={userSettings as any} actionData={actionData as any} />;  
} 