import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useFetcher, useActionData, useNavigation } from '@remix-run/react';
import {
    FiSearch,
    FiFilter,
    FiMoreVertical,
    FiUser,
    FiUsers,
    FiBell,
    FiBox,
    FiCalendar,
    FiMail,
    FiEdit,
    FiTrash2,
    FiChevronRight,
    FiChevronDown,
    FiCheck,
    FiSun,
    FiMoon
} from 'react-icons/fi';
import AssignGptsModal from './AssignGptsModal';
import InviteTeamMemberModal from './InviteTeamMember';
import TeamMemberDetailsModal from './TeamMemberDetailsModal';
import { useTheme } from '~/contexts/ThemeContext';
import EditPermissionsModal from './EditPermissionsModal';

// Define types
interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: string;
    department: string;
    joined: string;
    lastActive: string;
    status: 'Active' | 'Inactive';
    assignedGPTs: number;
}

// Define the format that EditPermissionsModal expects
interface EditPermissionsModalMember {
    _id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
}

// Create a function to adapt TeamMember to EditPermissionsModalMember
const adaptMemberForPermissionsModal = (member: TeamMember): EditPermissionsModalMember => {
    return {
        _id: member.id,
        name: member.name,
        email: member.email,
        role: member.role,
        isActive: member.status === 'Active'
    };
};

interface TeamManagementPageProps {
    users: any[];
    theme: 'light' | 'dark';
}

// Simple debounce utility
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
    let timeout: NodeJS.Timeout;
    return ((...args: any[]) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(null, args), wait);
    }) as T;
}

// Notification utility
const showNotification = (type: 'success' | 'error', message: string) => {
    if (typeof document === 'undefined') return;
    
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 ${
        type === 'success' 
            ? 'bg-green-100 border-green-400 text-green-700' 
            : 'bg-red-100 border-red-400 text-red-700'
    } border px-4 py-3 rounded shadow-md z-50`;
    notification.style.animation = 'fadeOut 5s forwards';
    notification.innerHTML = `<p class="font-bold">${type === 'success' ? 'Success' : 'Error'}</p>
                             <p class="text-sm">${message}</p>`;
    
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes fadeOut {
            0% { opacity: 1; }
            70% { opacity: 1; }
            100% { opacity: 0; visibility: hidden; }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.remove();
        style.remove();
    }, 5000);
};

// List of departments for filter dropdown
const departments = [
    'All Departments',
    'Product',
    'Engineering',
    'Design',
    'Marketing',
    'Sales',
    'Customer Support'
];

// Memoized MobileTeamMemberCard
const MobileTeamMemberCard = React.memo(({ 
    member, 
    onViewDetails, 
    isCurrentUser,
    currentUserId 
}: { 
    member: TeamMember; 
    onViewDetails: (member: TeamMember) => void; 
    isCurrentUser: boolean;
    currentUserId?: string;
}) => (
    <div
        className={`bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700 mb-3 ${isCurrentUser ? 'opacity-80' : 'cursor-pointer'}`}
        onClick={() => !isCurrentUser && onViewDetails(member)}
    >
        <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center mr-3">
                    <FiUser className="text-gray-600 dark:text-gray-300" />
                </div>
                <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{member.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{member.email}</p>
                    {isCurrentUser && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full mt-1 inline-block">
                            You
                        </span>
                    )}
                </div>
            </div>
            {isCurrentUser ? (
                <span className="text-xs text-gray-400 italic">Current user</span>
            ) : (
                <FiChevronRight className="text-gray-400 dark:text-gray-500" />
            )}
        </div>
        <div className="text-sm space-y-1">
            <p><strong className="text-gray-600 dark:text-gray-300">Role:</strong> {member.role}</p>
            <p><strong className="text-gray-600 dark:text-gray-300">Department:</strong> {member.department}</p>
            <p><strong className="text-gray-600 dark:text-gray-300">Status:</strong>
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${member.status === 'Active'
                    ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                    : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'}`}>
                    {member.status}
                </span>
            </p>
            <p><strong className="text-gray-600 dark:text-gray-300">GPTs:</strong> {member.assignedGPTs}</p>
        </div>
    </div>
));

const TeamManagementPage: React.FC<TeamManagementPageProps> = ({ users, theme }) => {
    const { theme: currentTheme, setTheme } = useTheme();
    const fetcher = useFetcher();
    const actionData = useActionData() as {
        success: boolean;
        message: string;
        intent: string;
        memberId: string;
        error: string;
    };
    const navigation = useNavigation();
    
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null);
    const [showDepartmentsDropdown, setShowDepartmentsDropdown] = useState(false);
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [selectedDepartment, setSelectedDepartment] = useState('All Departments');
    const [selectedStatus, setSelectedStatus] = useState('All Status');
    const [isMobileView, setIsMobileView] = useState(false);
    const [showAssignGptsModal, setShowAssignGptsModal] = useState(false);
    const [selectedMemberForGpts, setSelectedMemberForGpts] = useState<TeamMember | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedMemberForDetails, setSelectedMemberForDetails] = useState<TeamMember | null>(null);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [pendingInvitesCount, setPendingInvitesCount] = useState(0);
    const [showEditPermissionsModal, setShowEditPermissionsModal] = useState(false);
    const [selectedMemberForPermissions, setSelectedMemberForPermissions] = useState<TeamMember | null>(null);
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
    
    const actionsMenuRef = useRef<HTMLDivElement>(null);
    const departmentFilterRef = useRef<HTMLDivElement>(null);
    const statusFilterRef = useRef<HTMLDivElement>(null);

    // Format date utility
    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    // Helper function to safely convert MongoDB document to plain object
    const toPlainObject = (doc: any): any => {
        if (!doc) return {};
        
        // If it's already a plain object, return it
        if (typeof doc.toObject !== 'function' && typeof doc.toJSON !== 'function') {
            return doc;
        }
        
        // Use MongoDB document's built-in methods to convert to plain object
        if (typeof doc.toObject === 'function') {
            return doc.toObject();
        }
        
        if (typeof doc.toJSON === 'function') {
            return doc.toJSON();
        }
        
        // Fallback
        return { ...doc };
    };

    // Initialize team members from props
    useEffect(() => {
        if (users && Array.isArray(users)) {
            const transformedMembers = users.map(user => {
                // Convert to plain object safely
                const plainUser = toPlainObject(user);
                
                // Now we can safely access properties
                const userId = plainUser._id || plainUser.id;
                
                if (!userId) {
                    console.error("User missing ID:", plainUser);
                    return null;
                }
                
                // Explicitly cast status to the correct type
                const status: 'Active' | 'Inactive' = plainUser.isActive ? 'Active' : 'Inactive';
                
                return {
                    id: userId.toString(),
                    name: plainUser.name || 'Unknown',
                    email: plainUser.email || 'No email',
                    role: plainUser.role || 'user',
                    department: plainUser.department || 'General',
                    joined: formatDate(plainUser.createdAt || new Date().toISOString()),
                    lastActive: formatDate(plainUser.lastActive || plainUser.updatedAt || new Date().toISOString()),
                    status,
                    assignedGPTs: plainUser.assignedGPTs || 0,
                };
            }).filter(Boolean) as TeamMember[];
            
            setTeamMembers(transformedMembers);
            setLoading(false);
        }
    }, [users]);

    // Handle responsive design
    useEffect(() => {
        const handleResize = () => {
            if (typeof window !== 'undefined') {
                setIsMobileView(window.innerWidth < 768);
            }
        };

        if (typeof window !== 'undefined') {
            setIsMobileView(window.innerWidth < 768);
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }
    }, []);

    // Handle action data responses
    useEffect(() => {
        if (actionData) {
            if (actionData.success) {
                showNotification('success', actionData.message || 'Operation completed successfully');
                
                // Handle specific actions
                if (actionData.intent === 'removeMember' && actionData.memberId) {
                    setTeamMembers(prev => prev.filter(member => member.id !== actionData.memberId));
                }
            } else if (actionData.error) {
                showNotification('error', actionData.error);
            }
        }
    }, [actionData]);

    // Handle fetcher data for invitations
    useEffect(() => {
        if (fetcher.data && typeof fetcher.data === 'object') {
            if ((fetcher.data as { success: boolean }).success) {
                showNotification('success', (fetcher.data as { message: string }).message || 'Operation completed successfully');
                
                if ((fetcher.data as { intent: string }).intent === 'invite') {
                    setPendingInvitesCount(prev => prev + 1);
                    setShowInviteModal(false);
                }
            } else if ((fetcher.data as { error: string }).error) {
                showNotification('error', (fetcher.data as { error: string }).error);
            }
        }
    }, [fetcher.data]);

    // Memoized filtered members
    const filteredMembers = useMemo(() => {
        return teamMembers.filter(member => {
            const matchesSearch =
                member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (member.department && member.department.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesDepartment =
                selectedDepartment === 'All Departments' ||
                member.department === selectedDepartment;

            const matchesStatus =
                selectedStatus === 'All Status' ||
                member.status === selectedStatus;

            return matchesSearch && matchesDepartment && matchesStatus;
        });
    }, [teamMembers, searchTerm, selectedDepartment, selectedStatus]);

    // Update the toggle function to use position:
    const toggleActionsMenu = (memberId: string, event?: React.MouseEvent) => {
        if (event) {
            event.stopPropagation();
        }
        
        if (!memberId) {
            console.error('No member ID provided to toggleActionsMenu');
            return;
        }
        
        console.log('Toggling menu for member:', memberId);
        
        // If showing for the current member, hide it
        if (showActionsMenu === memberId) {
        setShowActionsMenu(null);
            return;
        }
        
        // Otherwise, show for the new member and position the menu
        setShowActionsMenu(memberId);
        
        // Position the menu near the click if possible
        if (event) {
            // Get the button's position
            const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
            
            // Position the menu to the right of the button
            setMenuPosition({
                top: rect.bottom + scrollTop, 
                left: rect.right - 150 + scrollLeft // Offset to align right edge
            });
        }
    }

    // Event handlers
    const handleInviteMember = () => {
        setShowInviteModal(true);
    };

    const handleAssignGpts = (member: TeamMember) => {
        setSelectedMemberForGpts(member);
        setShowAssignGptsModal(true);
        setShowActionsMenu(null);
    };

    const handleViewMemberDetails = (member: TeamMember) => {
        setSelectedMemberForDetails(member);
        setShowDetailsModal(true);
    };

    const handleEmailTeamMember = (email: string) => {
        if (typeof window !== 'undefined') {
            window.location.href = `mailto:${email}`;
        }
        setShowActionsMenu(null);
    };

    const handleEditPermissions = (member: TeamMember) => {
        setSelectedMemberForPermissions(member);
        setShowEditPermissionsModal(true);
        setShowActionsMenu(null);
    };

    const handleRemoveTeamMember = (memberId: string) => {
        if (typeof window !== 'undefined' && window.confirm("Are you sure you want to remove this team member? All their data including chat histories and assignments will be permanently deleted.")) {
            fetcher.submit(
                { 
                    intent: 'removeMember',
                    memberId: memberId
                },
                { method: 'POST' }
            );
        }
        setShowActionsMenu(null);
    };

    const handlePermissionsUpdated = (updatedMember: TeamMember) => {
        setTeamMembers(prev =>
            prev.map(member =>
                member.id === updatedMember.id ? updatedMember : member
            )
        );
    };

    const handleGptAssignmentChange = (memberId: string) => {
        // Optimistically update the count - you may want to refetch the actual count
        setTeamMembers(prev =>
            prev.map(member =>
                member.id === memberId
                    ? { ...member, assignedGPTs: member.assignedGPTs + 1 }
                    : member
            )
        );
    };

    const handleInviteSubmit = (formData: FormData) => {
        fetcher.submit(formData, { method: 'POST', action: '/admin/team' });
    };

    // Click outside handlers
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            
            if (departmentFilterRef.current && !departmentFilterRef.current.contains(target)) {
                setShowDepartmentsDropdown(false);
            }
            if (statusFilterRef.current && !statusFilterRef.current.contains(target)) {
                setShowStatusDropdown(false);
            }
            if (actionsMenuRef.current && !actionsMenuRef.current.contains(target)) {
                setShowActionsMenu(null);
            }
        };

        if (typeof document !== 'undefined') {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, []);

    // CSS for hiding scrollbars
    const scrollbarHideStyles = `
        .hide-scrollbar::-webkit-scrollbar {
            display: none;
        }
        .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
    `;

    // Skeleton loading component
    const renderSkeleton = () => (
        <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700 animate-pulse">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 mr-3"></div>
                            <div>
                                <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-24 mb-2"></div>
                                <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-32"></div>
                            </div>
                        </div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-12"></div>
                    </div>
                    <div className="text-sm space-y-2">
                        <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-40"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-48"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-32"></div>
                    </div>
                </div>
            ))}
        </div>
    );

    if (error) {
        return (
            <div className="flex justify-center items-center h-screen bg-white dark:bg-black text-red-500 p-4">
                {error}
            </div>
        );
    }

    const isSubmitting = navigation.state === 'submitting';

    const currentActionMember = showActionsMenu ? filteredMembers.find(m => m.id === showActionsMenu) : null;

    {showActionsMenu && (
        <div
            ref={actionsMenuRef}
            className="fixed z-[9999] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 py-2"
            style={{
                minWidth: '192px',
                width: '192px',
                top: menuPosition ? `${menuPosition.top}px` : '50%',
                left: menuPosition ? `${menuPosition.left}px` : '50%',
                transform: menuPosition ? 'none' : 'translate(-50%, -50%)'
            }}
        >
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    const member = filteredMembers.find(m => m.id === showActionsMenu);
                    if (member) {
                        handleAssignGpts(member);
                    }
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
            >
                <FiBox size={16} className="text-blue-500" />
                Assign GPTs
            </button>
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    const member = filteredMembers.find(m => m.id === showActionsMenu);
                    if (member) {
                        handleEditPermissions(member);
                    }
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
            >
                <FiEdit size={16} className="text-green-500" />
                Edit Permissions
            </button>
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    const member = filteredMembers.find(m => m.id === showActionsMenu);
                    if (member) {
                        handleEmailTeamMember(member.email);
                    }
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
            >
                <FiMail size={16} className="text-purple-500" />
                Send Email
            </button>
            <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveTeamMember(showActionsMenu);
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors"
            >
                <FiTrash2 size={16} className="text-red-500" />
                Remove Member
            </button>
        </div>
    )}

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-black text-black dark:text-white p-4 sm:p-6 overflow-hidden">
            <style>{scrollbarHideStyles}</style>
            
            {/* Header */}
            <div className="mb-6 flex-shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="text-center sm:text-left">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Team Management</h1>
                    <p className="text-gray-600 dark:text-gray-400">Manage your team members, permissions, and GPT assignments.</p>
                </div>
                <button
                    onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}
                    className={`p-2 rounded-full transition-colors self-center sm:self-auto mt-3 sm:mt-0 ${
                        currentTheme === 'dark' 
                            ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    aria-label={currentTheme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    title={currentTheme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                    {currentTheme === 'dark' ? <FiSun size={20} /> : <FiMoon size={20} />}
                </button>
            </div>

            {/* Filters and Search */}
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 flex-shrink-0">
                <div className="relative flex-grow sm:flex-grow-0 sm:w-64 md:w-72">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search members..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    />
                </div>

                <div className="flex items-center gap-3">
                    {/* Department Filter */}
                    <div className="relative" ref={departmentFilterRef}>
                        <button
                            onClick={() => setShowDepartmentsDropdown(!showDepartmentsDropdown)}
                            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                            <FiFilter size={14} />
                            <span>{selectedDepartment === 'All Departments' ? 'Department' : selectedDepartment}</span>
                            <FiChevronDown size={16} className={`transition-transform ${showDepartmentsDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        {showDepartmentsDropdown && (
                            <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 dark:ring-gray-700 z-10 overflow-hidden">
                                {departments.map(dept => (
                                    <button
                                        key={dept}
                                        onClick={() => { setSelectedDepartment(dept); setShowDepartmentsDropdown(false); }}
                                        className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between ${selectedDepartment === dept ? 'font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                    >
                                        {dept}
                                        {selectedDepartment === dept && <FiCheck size={14} />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Status Filter */}
                    <div className="relative" ref={statusFilterRef}>
                        <button
                            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                            <FiUsers size={14} />
                            <span>{selectedStatus}</span>
                            <FiChevronDown size={16} className={`transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        {showStatusDropdown && (
                            <div className="absolute left-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 dark:ring-gray-700 z-10 overflow-hidden">
                                {['All Status', 'Active', 'Inactive'].map(status => (
                                    <button
                                        key={status}
                                        onClick={() => { setSelectedStatus(status); setShowStatusDropdown(false); }}
                                        className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between ${selectedStatus === status ? 'font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                    >
                                        {status}
                                        {selectedStatus === status && <FiCheck size={14} />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Invite Button */}
                    <button
                        onClick={handleInviteMember}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-4 py-2 bg-black/80 dark:bg-white hover:bg-black/80 dark:hover:bg-white/70 text-white dark:text-black rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                    >
                        {isSubmitting ? 'Loading...' : 'Invite Member'}
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto hide-scrollbar -mx-4 sm:-mx-6 px-4 sm:px-6">
                {loading || isSubmitting ? (
                    renderSkeleton()
                ) : isMobileView ? (
                    <div className="grid gap-4 grid-cols-1">
                        {filteredMembers.map((member) => (
                            member && member.id ? (
                                <div key={member.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                                    <MobileTeamMemberCard
                                        member={member}
                                        onViewDetails={handleViewMemberDetails}
                                        isCurrentUser={false}
                                        currentUserId={undefined}
                                    />
                                    <button
                                        onClick={(e) => { 
                                            e.stopPropagation();
                                            if (member && member.id) {
                                                console.log("Button clicked for member:", member.id);
                                                toggleActionsMenu(member.id, e);
                                            } else {
                                                console.error("Invalid member data:", member);
                                            }
                                        }}
                                        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                        type="button"
                                    >
                                        <FiMoreVertical size={18} />
                                    </button>
                                </div>
                            ) : null
                        ))}
                    </div>
                ) : (
                    <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 relative">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                    {['Member', 'Role', 'Department', 'GPTs Assigned', 'Status', 'Joined', 'Last Active', ''].map((header) => (
                                        <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredMembers.length > 0 ? filteredMembers.map((member) => (
                                    member && member.id ? (
                                        <tr
                                            key={member.id}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                            onClick={() => handleViewMemberDetails(member)}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap cursor-pointer">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                                                        <FiUser className="text-gray-600 dark:text-gray-300" />
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900 dark:text-white">{member.name}</div>
                                                        <div className="text-sm text-gray-500 dark:text-gray-400">{member.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{member.role}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{member.department}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-700 dark:text-gray-300">{member.assignedGPTs}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${member.status === 'Active'
                                                    ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300'
                                                    : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300'}`}>
                                                    {member.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{member.joined}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{member.lastActive}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="relative">
                                                    <button
                                                        onClick={(e) => { 
                                                            e.stopPropagation(); 
                                                            console.log("Button clicked for member:", member.id);
                                                            setShowActionsMenu(member.id);
                                                        }}
                                                        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                        type="button"
                                                    >
                                                        <FiMoreVertical size={18} />
                                                    </button>
                                                    
                                                    {showActionsMenu === member.id && (
                                                        <div 
                                                            className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-[9999]"
                                                        >
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleAssignGpts(member);
                                                                }}
                                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"
                                                            >
                                                                <FiBox size={16} className="text-blue-500" />
                                                                Assign GPTs
                                                            </button>
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleEditPermissions(member);
                                                                }}
                                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"
                                                            >
                                                                <FiEdit size={16} className="text-green-500" />
                                                                Edit Permissions
                                                            </button>
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleEmailTeamMember(member.email);
                                                                }}
                                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"
                                                            >
                                                                <FiMail size={16} className="text-purple-500" />
                                                                Send Email
                                                            </button>
                                                            <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleRemoveTeamMember(member.id);
                                                                }}
                                                                className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3"
                                                            >
                                                                <FiTrash2 size={16} className="text-red-500" />
                                                                Remove Member
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ) : null
                                )) : (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                                            No team members found matching your criteria.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modals */}
            {showAssignGptsModal && selectedMemberForGpts && (
                <AssignGptsModal
                    isOpen={showAssignGptsModal}
                    onClose={() => setShowAssignGptsModal(false)}
                    member={{
                        _id: selectedMemberForGpts.id,
                        name: selectedMemberForGpts.name,
                        email: selectedMemberForGpts.email,
                        role: selectedMemberForGpts.role,
                        isActive: selectedMemberForGpts.status === 'Active'
                    }}
                    onSubmit={(memberIds: string[], gptIds: string[]) => {
                        if (!memberIds || memberIds.length === 0 || memberIds.includes(null as any)) {
                            console.error('Invalid memberIds:', memberIds);
                            const notification = document.getElementById('notification');
                            if (notification) {
                                notification.textContent = 'Error: Invalid member ID';
                                notification.className = 'notification error';
                                setTimeout(() => notification.className = 'notification hidden', 3000);
                            }
                            return;
                        }
                        
                        fetcher.submit(
                            { 
                                intent: 'assignGpts',
                                memberIds: JSON.stringify(memberIds),
                                gptIds: JSON.stringify(gptIds)
                            },
                            { method: 'POST' }
                        );
                        setShowAssignGptsModal(false);
                    }}
                />
            )}

            {showDetailsModal && selectedMemberForDetails && (
                <TeamMemberDetailsModal
                    isOpen={showDetailsModal}
                    onClose={() => setShowDetailsModal(false)}
                    member={selectedMemberForDetails}
                />
            )}

            {showInviteModal && (
                <InviteTeamMemberModal
                    isOpen={showInviteModal}
                    onClose={() => setShowInviteModal(false)}
                    onSubmit={handleInviteSubmit}
                />
            )}

            {showEditPermissionsModal && selectedMemberForPermissions && (
                <EditPermissionsModal
                    isOpen={showEditPermissionsModal}
                    onClose={() => setShowEditPermissionsModal(false)}
                    member={adaptMemberForPermissionsModal(selectedMemberForPermissions)}
                    onPermissionsUpdated={(updatedModalMember: EditPermissionsModalMember) => {
                        // Convert back to TeamMember format
                        const updatedMember: TeamMember = {
                            id: updatedModalMember._id,
                            name: updatedModalMember.name,
                            email: updatedModalMember.email,
                            role: updatedModalMember.role,
                            department: selectedMemberForPermissions.department,
                            joined: selectedMemberForPermissions.joined,
                            lastActive: selectedMemberForPermissions.lastActive,
                            status: updatedModalMember.isActive ? 'Active' : 'Inactive',
                            assignedGPTs: selectedMemberForPermissions.assignedGPTs
                        };
                        handlePermissionsUpdated(updatedMember);
                    }}
                />
            )}
        </div>
    );
};

export default TeamManagementPage;