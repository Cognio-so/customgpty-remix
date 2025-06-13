import { json, LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/cloudflare';
import { useLoaderData } from '@remix-run/react';
import TeamManagementPage from '../components/admin/TeamManagementPage';
import { getAllUsers, updateUserPermissions, removeTeamMember, inviteTeamMember } from '../services/auth.js';
import { getUserFromSession } from '../lib/session.js';
import { getThemeFromCookie } from '../lib/theme.js';
import { getAssignedGpts, assignGptsToUser, removeGptsFromUser } from '../services/customgpt.js';

// Define proper types
type LoaderData = {
  users: any[];
  theme: 'light' | 'dark';
  error?: string;
};

export async function loader({ request, context }: LoaderFunctionArgs): Promise<Response> {
  const user = await getUserFromSession(request, context.env);
  
  if (!user) {
    throw new Response(null, { 
      status: 302, 
      headers: { Location: '/login' } 
    });
  }
  
  if (user.role !== 'admin') {
    throw new Response('Unauthorized', { status: 403 });
  }

  const theme = getThemeFromCookie(request) || 'light';
  
  try {
    const users = await getAllUsers(context.env );
    
    // Transform MongoDB documents to plain objects
    const plainUsers = users.map((user: any) => {
      // Use type-safe conversion by checking for toObject or toJSON methods
      let userData;
      if (typeof user.toObject === 'function') {
        userData = user.toObject();
      } else if (typeof user.toJSON === 'function') {
        userData = user.toJSON();
      } else {
        // Fallback to treating it as a plain object
        userData = user;
      }
      
      // Create a plain object with all properties
      return {
        _id: userData._id?.toString(), // Ensure it's a string
        name: userData.name,
        email: userData.email,
        role: userData.role,
        isActive: userData.isActive,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt,
      };
    });
    
    return json({
      users: plainUsers, // Use the transformed plain objects
      theme: theme
    });
  } catch (error) {
    console.error("Error loading users:", error);
    return json({
      users: [],
      theme: theme,
      error: "Failed to load team members"
    });
  }
}

export async function action({ request, context }: ActionFunctionArgs) {
  const user = await getUserFromSession(request, context.env);
  
  if (!user) {
    return json({ error: "Session expired", success: false }, { status: 401 });
  }
  
  if (user.role !== 'admin') {
    return json({ error: "Unauthorized", success: false }, { status: 403 });
  }

  const formData = await request.formData();
  const intent = formData.get('intent') as string;


  try {
    switch (intent) {
      case 'updatePermissions': {
        const memberId = formData.get('memberId') as string;
        const role = formData.get('role') as string;
        const isActive = formData.get('isActive') === 'true';



        if (!memberId) {
          return json({ error: "Member ID is required", success: false }, { status: 400 });
        }

        await updateUserPermissions(context.env, memberId, { role, isActive });
        
        return json({ 
          success: true, 
          message: "Permissions updated successfully",
          intent,
          memberId 
        });
      }

      case 'removeMember': {
        const memberId = formData.get('memberId') as string;
        


        if (!memberId) {
          return json({ error: "Member ID is required", success: false }, { status: 400 });
        }
        
        if (memberId === user.id) {
          return json({ 
            error: "You cannot remove yourself", 
            success: false 
          }, { status: 400 });
        }
        
        await removeTeamMember(context.env, memberId);
        
        return json({ 
          success: true, 
          message: "Member removed successfully",
          intent,
          memberId 
        });
      }

      case 'assignGpts': {
        const memberIds = formData.get('memberIds') as string;
        const gptIds = formData.get('gptIds') as string;
        

        
        if (!memberIds || !gptIds) {
          return json({ error: "Member IDs and GPT IDs are required", success: false }, { status: 400 });
        }

        let parsedMemberIds: string[];
        let parsedGptIds: string[];

        try {
          parsedMemberIds = JSON.parse(memberIds);
          parsedGptIds = JSON.parse(gptIds);
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          return json({ error: "Invalid data format", success: false }, { status: 400 });
        }


        
        if (!Array.isArray(parsedMemberIds) || !Array.isArray(parsedGptIds)) {
          return json({ error: "Invalid member IDs or GPT IDs format", success: false }, { status: 400 });
        }

        if (parsedMemberIds.length === 0) {
          return json({ error: "At least one member ID is required", success: false }, { status: 400 });
        }

        // For each member, assign the selected GPTs
        for (const memberId of parsedMemberIds) {

          
          if (!memberId || memberId === 'null' || memberId === 'undefined') {
            console.error('Invalid member ID:', memberId);
            return json({ 
              error: `Invalid member ID: ${memberId}`, 
              success: false 
            }, { status: 400 });
          }

          try {
            // Fix: Add context.env parameter
            const currentAssignments = await getAssignedGpts(context.env, memberId);
            const currentGptIds = currentAssignments.map((gpt: any) => gpt._id?.toString() || gpt.id?.toString());
            

            
            // Remove existing assignments that are not in the new selection
            const toRemove = currentGptIds.filter((id: any) => !parsedGptIds.includes(id));
            if (toRemove.length > 0) {

              await removeGptsFromUser(context.env, memberId, toRemove, user.id);
            }
            
            // Add new assignments
            const toAdd = parsedGptIds.filter(id => !currentGptIds.includes(id));
            if (toAdd.length > 0) {

              await assignGptsToUser(context.env, memberId, toAdd, user.id);
            }
          } catch (error) {
            console.error(`Error assigning GPTs to user ${memberId}:`, error);
            return json({ 
              error: `Failed to assign GPTs to user ${memberId}: ${error instanceof Error ? error.message : 'Unknown error'}`, 
              success: false 
            }, { status: 400 });
          }
        }

        return json({ 
          success: true, 
          message: `Successfully updated GPT assignments for ${parsedMemberIds.length} member(s)`,
          intent
        });
      }

      case 'inviteMember': {
        const email = formData.get('email') as string;
        const name = formData.get('name') as string;
        const role = formData.get('role') as string || 'user';

        if (!email || !name) {
          return json({ error: "Email and name are required", success: false }, { status: 400 });
        }

        try {
          const result = await inviteTeamMember(context.env,  email, role, user.id);
          
          if (result.success) {
            return json({ 
              success: true, 
              message: `Invitation sent successfully to ${email}`,
              intent
            });
          } else {
            return json({ 
              error: result.message || "Failed to send invitation", 
              success: false 
            }, { status: 400 });
          }
        } catch (error) {
          console.error("Error sending invitation:", error);
          return json({ 
            error: error instanceof Error ? error.message : "Failed to send invitation", 
            success: false 
          }, { status: 400 });
        }
      }

      default:
        return json({ error: "Invalid action", success: false }, { status: 400 });
    }
  } catch (error) {
    console.error("Team management error:", error);
    return json({ 
      error: error instanceof Error ? error.message : "Operation failed", 
      success: false 
    }, { status: 400 });
  }
}

export default function TeamManagementPageRoute() {
  const data = useLoaderData<LoaderData>();
  
  // Handle error case
  if (data.error) {
    return (
      <div className="flex justify-center items-center h-screen bg-white dark:bg-black text-red-500 p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Error Loading Team</h2>
          <p>{data.error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  return <TeamManagementPage users={data.users} theme={data.theme} />;
} 