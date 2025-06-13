import { LoaderFunctionArgs, ActionFunctionArgs, json } from '@remix-run/cloudflare';
import { getUserFromSession } from '../lib/session.js';
import { getUserConversationHistory, deleteConversation } from '../services/conversation.js';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const user = await getUserFromSession(request, context.env);
  
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');

  if (!userId || userId !== user.id) {
    return json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    const conversations = await getUserConversationHistory(context.env, userId);
    
    return json({ 
      success: true, 
      conversations 
    });
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    return json({ 
      success: false, 
      error: 'Failed to fetch conversation history' 
    });
  }
}

export async function action({ request, context }: ActionFunctionArgs) {
  const user = await getUserFromSession(request, context.env);
  
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const intent = formData.get('intent') as string;

  try {
    if (intent === 'deleteConversation') {
      const conversationId = formData.get('conversationId') as string;
      const userId = formData.get('userId') as string;

      if (!conversationId || !userId || userId !== user.id) {
        return json({ error: 'Invalid request' }, { status: 400 });
      }

      await deleteConversation(context.env, userId, conversationId);
      
      return json({ 
        success: true, 
        message: 'Conversation deleted successfully' 
      });
    }

    return json({ error: 'Invalid intent' }, { status: 400 });
  } catch (error) {
    console.error('Error handling conversation action:', error);
    return json({ 
      error: 'Failed to process request' 
    }, { status: 500 });
  }
} 