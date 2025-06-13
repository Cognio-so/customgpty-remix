import { LoaderFunctionArgs, json } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { getUserFromSession } from "../lib/session.js";
import { getThemeFromCookie } from "../lib/theme.js";
import UserHistoryPage from '~/components/user/UserHistory';

// Define the type for conversation data
type ConversationData = {
  id: string;
  gptId: string;
  gptName: string;
  lastMessage: string;
  timestamp: string;
  messageCount: number;
  model: string;
  summary?: string;
  messages: any[];
};

type LoaderData = {
  user: any;
  conversations: ConversationData[];
  theme: 'light' | 'dark';
  error?: string;
};

export async function loader({ request, context }: LoaderFunctionArgs): Promise<Response> {
  const user = await getUserFromSession(request, context.env);
  
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const theme = getThemeFromCookie(request) || 'light';

  try {

    const conversations: ConversationData[] = [];

    return json({ 
      user,
      conversations,
      theme,
    } as LoaderData);
  } catch (error) {
    console.error("Error loading conversation history:", error);
    return json({ 
      user,
      conversations: [],
      theme,
      error: "Failed to load conversation history"
    } as LoaderData);
  }
}

export default function UserHistoryPageRoute() {
  const { user, conversations, theme, error } = useLoaderData<LoaderData>();
  
  return <UserHistoryPage initialData={{ user, conversations, theme, error }} />;
} 