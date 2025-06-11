import { ActionFunctionArgs, json } from '@remix-run/cloudflare';
import { createThemeCookie } from '~/lib/theme';

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const theme = formData.get('theme');

  if (theme !== 'light' && theme !== 'dark') {
    return json({ error: 'Invalid theme' }, { status: 400 });
  }

  return json(
    { success: true },
    {
      headers: {
        'Set-Cookie': createThemeCookie(theme),
      },
    }
  );
} 