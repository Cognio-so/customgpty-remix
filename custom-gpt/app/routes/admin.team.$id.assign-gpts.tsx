import { LoaderFunctionArgs, ActionFunctionArgs, json, redirect } from "@remix-run/cloudflare";
import { useLoaderData, useActionData, useFetcher, Form } from "@remix-run/react";
import { useState } from "react";
import { getUserFromSession } from "../lib/session.js";
import { getUserById } from "../services/auth.js";
import { getAllCustomGpts, assignGptsToUser, removeGptsFromUser, getAssignedGpts } from "../services/customgpt.js";
import { FiArrowLeft, FiSearch, FiCheck } from 'react-icons/fi';

export async function loader({ params, request, context }: LoaderFunctionArgs) {
  const user = await getUserFromSession(request, context.env);
  
  if (!user || user.role !== 'admin') {
    throw new Response("Unauthorized", { status: 401 });
  }

  if (!params.id) {
    throw new Response("Member ID is required", { status: 400 });
  }

  try {
    const memberResult = await getUserById(params.id);
    
    if (!memberResult) {
      return redirect('/admin/team');
    }

    // Get all GPTs created by admin
    const allGpts = await getAllCustomGpts(user.id);
    
    // Get GPTs already assigned to this user
    const assignedGpts = await getAssignedGpts(params.id);
    const assignedGptIds = assignedGpts.map((gpt: any) => gpt._id.toString());
    
    return json({ 
      member: memberResult,
      allGpts: allGpts || [],
      assignedGptIds
    });
  } catch (error) {
    console.error("Error loading GPT assignment data:", error);
    return redirect('/admin/team');
  }
}

export async function action({ params, request, context }: ActionFunctionArgs) {
  const user = await getUserFromSession(request, context.env);
  
  if (!user || user.role !== 'admin') {
    return json({ error: "Unauthorized", success: false }, { status: 401 });
  }

  if (!params.id) {
    return json({ error: "Member ID is required", success: false }, { status: 400 });
  }

  const formData = await request.formData();
  const intent = formData.get('intent') as string;
  
  try {
    if (intent === 'assignGpts') {
      const selectedGptIds = formData.getAll('selectedGpts') as string[];
      
      if (selectedGptIds.length === 0) {
        return json({ error: "Please select at least one GPT", success: false });
      }

      // First, get currently assigned GPTs
      const currentlyAssigned = await getAssignedGpts(params.id);
      const currentlyAssignedIds = currentlyAssigned.map((gpt: any) => gpt._id.toString());
      
      // Determine which GPTs to assign and which to remove
      const toAssign = selectedGptIds.filter(id => !currentlyAssignedIds.includes(id));
      const toRemove = currentlyAssignedIds.filter(id => !selectedGptIds.includes(id));
      
      // Assign new GPTs
      if (toAssign.length > 0) {
        await assignGptsToUser(params.id, toAssign, user.id);
      }
      
      // Remove unselected GPTs
      if (toRemove.length > 0) {
        await removeGptsFromUser(params.id, toRemove, user.id);
      }
      
      return json({ 
        success: true, 
        message: `Successfully updated GPT assignments. Assigned: ${toAssign.length}, Removed: ${toRemove.length}` 
      });
    }
    
    return json({ error: "Invalid intent", success: false });
  } catch (error) {
    console.error("Error updating GPT assignments:", error);
    return json({ 
      error: error instanceof Error ? error.message : "Failed to update assignments", 
      success: false 
    });
  }
}

export default function AssignGptsPage() {
  const { member, allGpts, assignedGptIds } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [selectedGpts, setSelectedGpts] = useState<string[]>(assignedGptIds);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredGpts = allGpts.filter((gpt: any) =>
    gpt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gpt.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleGptToggle = (gptId: string) => {
    setSelectedGpts(prev => 
      prev.includes(gptId) 
        ? prev.filter(id => id !== gptId)
        : [...prev, gptId]
    );
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-black text-black dark:text-white">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white"
          >
            <FiArrowLeft size={20} />
            <span>Back</span>
          </button>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Assign GPTs to {typeof member === "object" && member && "name" in member ? (member as any).name : ""}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Select which GPTs this user should have access to
        </p>
      </div>

      {/* Search */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search GPTs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white placeholder-gray-500"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <Form method="post" className="space-y-6">
          <input type="hidden" name="intent" value="assignGpts" />
          
          {filteredGpts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm ? 'No GPTs match your search.' : 'No GPTs available.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGpts.map((gpt: any) => (
                <div
                  key={gpt._id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedGpts.includes(gpt._id)
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
                  }`}
                  onClick={() => handleGptToggle(gpt._id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {gpt.name}
                      </h3>
                      {gpt.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {gpt.description}
                        </p>
                      )}
                    </div>
                    <div className={`flex-shrink-0 ml-3 ${
                      selectedGpts.includes(gpt._id) ? 'text-blue-500' : 'text-gray-400'
                    }`}>
                      <FiCheck size={20} />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      {gpt.model}
                    </span>
                    {gpt.capabilities?.webBrowsing && (
                      <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded">
                        Web Search
                      </span>
                    )}
                  </div>

                  <input
                    type="checkbox"
                    name="selectedGpts"
                    value={gpt._id}
                    checked={selectedGpts.includes(gpt._id)}
                    onChange={() => handleGptToggle(gpt._id)}
                    className="hidden"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-800">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {selectedGpts.length} GPT{selectedGpts.length !== 1 ? 's' : ''} selected
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
              >
                Update Assignments
              </button>
            </div>
          </div>
        </Form>

        {/* Success/Error Messages */}
        {actionData?.success && (
          <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg">
            <p className="text-green-700 dark:text-green-400 text-sm">{(actionData as any).message}</p>
          </div>
        )}

        {(actionData as any)?.error && (
          <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg">
            <p className="text-red-700 dark:text-red-400 text-sm">{(actionData as any).error}</p>
          </div>
        )}
      </div>
    </div>
  );
} 