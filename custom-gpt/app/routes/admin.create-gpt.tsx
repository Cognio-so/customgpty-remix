import { LoaderFunctionArgs, ActionFunctionArgs, json, redirect } from "@remix-run/cloudflare";
import { useLoaderData, useActionData, useNavigation, useSearchParams, useNavigate } from "@remix-run/react";
import { getUserFromSession } from "../lib/session.js";
import { createCustomGpt, updateCustomGpt, getCustomGptById } from "../services/customgpt.js";
import CreateCustomGpt from "~/components/admin/CreateCustomGpt";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const user = await getUserFromSession(request, context.env);
  
  if (!user || user.role !== 'admin') {
    throw new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const mode = url.searchParams.get('mode');
  const gptId = url.searchParams.get('id');
  
  let editGptData = null;
  
  if (mode === 'edit' && gptId) {
    try {
      editGptData = await getCustomGptById(gptId, user.id);
    } catch (error) {
      console.error("Error loading GPT for edit:", error);
      throw new Response("GPT not found", { status: 404 });
    }
  }

  return json({ 
    user,
    editGptData,
    mode: mode || 'create'
  });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const user = await getUserFromSession(request, context.env);
  
  if (!user || user.role !== 'admin') {
    return json({ error: "Unauthorized", success: false }, { status: 401 });
  }

  const formData = await request.formData();
  const intent = formData.get('intent') as string;
  const gptId = formData.get('gptId') as string;

  try {
    if (intent === 'update' && gptId) {
      // Handle update
      const updateData = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        instructions: formData.get('instructions') as string,
        conversationStarter: formData.get('conversationStarter') as string,
        model: formData.get('model') as string,
        imageUrl: formData.get('imageUrl') as string,
        folder: formData.get('folder') as string || null,
        capabilities: {
          webBrowsing: formData.get('webBrowsing') === 'on'
        }
      };

      await updateCustomGpt(gptId, updateData, user.id);
      
      // Redirect to collection page after successful update
      return redirect('/admin/collection?updated=true');
      
    } else if (intent === 'create') {
      // Handle create
      const gptData = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        instructions: formData.get('instructions') as string,
        conversationStarter: formData.get('conversationStarter') as string,
        model: formData.get('model') as string,
        imageUrl: formData.get('imageUrl') as string,
        folder: formData.get('folder') as string || null,
        capabilities: {
          webBrowsing: formData.get('webBrowsing') === 'on'
        }
      };

      await createCustomGpt(gptData, user.id);
      
      // Redirect to collection page after successful creation
      return redirect('/admin/collection?created=true');
    }

    return json({ error: "Invalid action", success: false }, { status: 400 });
  } catch (error) {
    console.error("GPT operation error:", error);
    return json({ 
      error: error instanceof Error ? error.message : "Operation failed", 
      success: false 
    }, { status: 400 });
  }
}

export default function CreateGptPage() {
  const { editGptData, mode } = useLoaderData<typeof loader>();
  const actionData = useActionData();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const isSubmitting = navigation.state === "submitting";
  const editGptId = searchParams.get('id');

  const handleGoBack = () => {
    navigate('/admin/dashboard');
  };

  return (
    <CreateCustomGpt
      onGoBack={handleGoBack}
      editGptId={editGptId}
      onGptCreated={() => {}}
      onSubmit={() => {}}
      actionData={actionData}
      isSubmitting={isSubmitting}
      initialData={editGptData}
    />
  );
}