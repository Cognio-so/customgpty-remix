import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
    IoArrowBack,
    IoTimeOutline,
    IoSearchOutline,
    IoFilterOutline,
    IoChevronDown,
    IoEllipse,
    IoChatbubbleEllipsesOutline,
    IoCheckmark
} from 'react-icons/io5';
import { FiUser, FiUsers, FiBox, FiCalendar, FiActivity } from 'react-icons/fi';


// Interface definitions
interface User {
    _id: string;
    name: string;
    email: string;
    profilePicture?: string;
    role: string;
    createdAt: string;
    lastActive: string;
    totalConversations?: number;
    totalMessages?: number;
    uniqueGpts?: number;
    favoriteGpt?: string;
}

interface Conversation {
    _id: string;
    userId: string;
    userName?: string;
    userEmail?: string;
    userRole?: string;
    userProfilePic?: string;
    gptName?: string;
    gptId?: string;
    createdAt: string;
    updatedAt: string;
    messages?: Array<{ content: string }>;
    lastMessage?: string;
    messageCount?: number;
    previewContent?: string;
    lastActivity?: string;
}

interface FilterOptions {
    dateRange: 'all' | 'today' | 'week' | 'month';
}

const UserHistoryPage: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const location = useLocation();


    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [user, setUser] = useState<User | null>(null);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [filterOpen, setFilterOpen] = useState<boolean>(false);
    const [filterOptions, setFilterOptions] = useState<FilterOptions>({
        dateRange: 'all',
    });

    const filterDropdownRef = useRef<HTMLDivElement>(null);
    const queryParams = new URLSearchParams(location.search);
    const previousView = queryParams.get('view') || 'team';

    // Fetch user data and conversations
  
    // Filter conversations based on search and date range
    useEffect(() => {
        let filtered = [...conversations];

        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            filtered = filtered.filter(convo =>
                (convo.gptName && convo.gptName.toLowerCase().includes(lowerQuery)) ||
                (convo.lastMessage && convo.lastMessage.toLowerCase().includes(lowerQuery))
            );
        }

        if (filterOptions.dateRange !== 'all') {
            const now = new Date();
            let cutoffDate: Date;

            if (filterOptions.dateRange === 'today') {
                cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            } else if (filterOptions.dateRange === 'week') {
                cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
            } else {
                cutoffDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            }

            filtered = filtered.filter(convo => new Date(convo.updatedAt || convo.createdAt) >= cutoffDate);
        }

        setFilteredConversations(filtered);
    }, [searchQuery, filterOptions, conversations]);

    // Format timestamp
    const formatTimestamp = (timestamp: string | undefined): string => {
        if (!timestamp) return 'N/A';
        const date = new Date(timestamp);
        const now = new Date();

        const isToday = date.toDateString() === now.toDateString();
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const isYesterday = date.toDateString() === yesterday.toDateString();

        const timeString = date.toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }).toLowerCase();

        if (isToday) {
            return `Today, ${timeString}`;
        } else if (isYesterday) {
            return `Yesterday, ${timeString}`;
        } else {
            return date.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
            }) + `, ${timeString}`;
        }
    };

    // Format date only
    const formatDateOnly = (dateString: string | undefined): string => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Format relative time for Last Active
    const formatRelativeTime = (dateString: string | undefined): string => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = now.getTime() - date.getTime();
        const diffSeconds = Math.floor(diffTime / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 30) return formatDateOnly(dateString);
        if (diffDays >= 1) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        if (diffHours >= 1) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffMinutes >= 1) return `${diffMinutes} min${diffMinutes > 1 ? 's' : ''} ago`;
        return 'Just now';
    };

    // Set date range filter
    const setDateRangeFilter = (range: FilterOptions['dateRange']) => {
        setFilterOptions(prev => ({ ...prev, dateRange: range }));
        setFilterOpen(false);
    };

    // Handle chat history item click to navigate to conversation
    const handleConversationClick = (conversation: Conversation) => {
        if (conversation?.gptId && conversation._id) {
            navigate(`/admin/chat/${conversation.gptId}?conversationId=${conversation._id}`);
        } else {
            console.error("Navigation failed: Missing gptId or conversation ID", { gptId: conversation?.gptId, conversationId: conversation?._id });
        }
    };

    // Click outside handling for filter dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
                setFilterOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // CSS for hiding scrollbars
    const scrollbarHideStyles = `
      .hide-scrollbar::-webkit-scrollbar { display: none; }
      .hide-scrollbar { "“ms-overflow-style: none; scrollbar-width: none; }
    `;

    // Render loading state for user profile
    const renderProfileLoading = () => (
        <div className="animate-pulse">
            <div className="flex items-center mb-6">
                <div className="h-14 w-14 rounded-full bg-gray-200 dark:bg-gray-700 mr-4 flex-shrink-0"></div>
                <div className="flex-1">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
            </div>
            <div className="mb-6 space-y-3">
                <div className="flex gap-3">
                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-16"></div>
                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                </div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
            </div>
            <div className="space-y-3">
                <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            </div>
        </div>
    );

    // Render loading state for conversation list
    const renderConversationLoading = () => (
        <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center p-4 bg-white dark:bg-gray-800/60 rounded-lg shadow-sm animate pulse border border-gray-200 dark:border-gray-700/50">
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 mr-4 flex-shrink-0"></div>
                    <div className="flex-1 space-y-2">
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4 ml-4"></div>
                </div>
            ))}
        </div>
    );

    return (
        <div className={`flex flex-col h-full bg-white dark:bg-black text-black dark:text-white overflow-hidden`}>
            <style>{scrollbarHideStyles}</style>

            {/* Back button */}
            <div className="px-6 pt-6 pb-3 flex-shrink-0 border-b border-gray-200 dark:border-gray-800">
                <button
                    onClick={() => navigate(`/admin/history?view=${previousView}`)}
                    className="flex items-center text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm"
                >
                    <IoArrowBack size={16} className="mr-1" />
                    <span>Back to History</span>
                </button>
            </div>

            {/* Main content area */}
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                {/* Left side - User profile */}
                <div className="lg:w-[320px] xl:w-[360px] p-6 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-700 overflow-y-auto hide-scrollbar bg-gray-50 dark:bg-gray-900/40 flex-shrink-0">
                    {isLoading ? renderProfileLoading() : user ? (
                        <>
                            <div className="flex items-center mb-6">
                                {user.profilePicture ? (
                                    <img
                                        src={user.profilePicture}
                                        alt={`${user.name}'s profile`}
                                        className="h-14 w-14 rounded-full object-cover mr-4 flex-shrink-0 border-2 border-white dark:border-gray-800"
                                    />
                                ) : (
                                    <div className="h-14 w-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-medium mr-4 flex-shrink-0">
                                        {user.name?.charAt(0) || 'U'}
                                    </div>
                                )}
                                <div className="overflow-hidden">
                                    <h1 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white truncate" title={user.name}>{user.name}</h1>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate" title={user.email}>{user.email}</p>
                                </div>
                            </div>

                            <div className="mb-6">
                                <div className="flex items-center gap-2 mb-3 flex-wrap">
                                    <span className={`px-2.5 py-0.5 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${user.lastActive && (new Date().getTime() - new Date(user.lastActive).getTime() < 7 * 24 * 60 * 60 * 1000)
                                            ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300'
                                            : 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300'
                                        }`}>
                                        <IoEllipse className={`mr-1.5 ${user.lastActive && (new Date().getTime() - new Date(user.lastActive).getTime() < 7 * 24 * 60 * 60 * 1000)
                                                ? 'text-green-500'
                                                : 'text-yellow-500'
                                            }`} size={8} />
                                        {user.lastActive && (new Date().getTime() - new Date(user.lastActive).getTime() < 7 * 24 * 60 * 60 * 1000)
                                            ? 'Recently Active'
                                            : 'Inactive'
                                        }
                                    </span>
                                    <span className="text-gray-500 dark:text-gray-400 text-xs flex items-center bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                                        <FiUser className="mr-1" size={12} />
                                        {user.role || 'User'}
                                    </span>
                                </div>

                                <div className="space-y-2 text-sm">
                                    <div className="flex items-start">
                                        <FiBox className="mr-2 mt-0.5 text-gray-400 dark:text-gray-500 flex-shrink-0" size={14} />
                                        <span className="text-gray-600 dark:text-gray-400 mr-1">User ID:</span>
                                        <span className="font-medium text-gray-800 dark:text-gray-200 truncate" title={user._id}>
                                            {user._id ? `${user._id.substring(0, 6)}...${user._id.substring(user._id.length - 4)}` : 'Not available'}
                                        </span>
                                    </div>

                                    <div className="flex items-start">
                                        <FiUsers className="mr-2 mt-0.5 text-gray-400 dark:text-gray-500 flex-shrink-0" size={14} />
                                        <span className="text-gray-600 dark:text-gray-400 mr-1">Favorite GPT:</span>
                                        <span className="font-medium text-gray-800 dark:text-gray-200">
                                            {user.favoriteGpt || 'None'}
                                        </span>
                                    </div>

                                    <div className="flex items-start">
                                        <FiCalendar className="mr-2 mt-0.5 text-gray-400 dark:text-gray-500 flex-shrink-0" size={14} />
                                        <span className="text-gray-600 dark:text-gray-400 mr-1">First Chat:</span>
                                        <span className="font-medium text-gray-800 dark:text-gray-200">{formatDateOnly(user.createdAt)}</span>
                                    </div>

                                    <div className="flex items-start">
                                        <FiActivity className="mr-2 mt-0.5 text-gray-400 dark:text-gray-500 flex-shrink-0" size={14} />
                                        <span className="text-gray-600 dark:text-gray-400 mr-1">Last Active:</span>
                                        <span className="font-medium text-gray-800 dark:text-gray-200">{formatRelativeTime(user.lastActive)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Usage Statistics */}
                            <div className="space-y-3">
                                <div className="bg-white dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700/60">
                                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">Usage Overview</h3>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">Total Conversations:</span>
                                        <span className="font-medium text-gray-800 dark:text-gray-200">{user.totalConversations || conversations.length}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm mt-1">
                                        <span className="text-gray-500 dark:text-gray-400">Total Messages:</span>
                                        <span className="font-medium text-gray-800 dark:text-gray-200">{user.totalMessages || '—'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm mt-1">
                                        <span className="text-gray-500 dark:text-gray-400">Unique GPTs Used:</span>
                                        <span className="font-medium text-gray-800 dark:text-gray-200">{user.uniqueGpts || '—'}</span>
                                    </div>
                                </div>

                                {/* Last Conversation */}
                                {conversations.length > 0 && (
                                    <div className="bg-white dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700/60">
                                        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Latest Activity</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Last conversation with <span className="font-medium text-gray-700 dark:text-gray-300">{conversations[0].gptName}</span>
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            {formatTimestamp(conversations[0].updatedAt || conversations[0].createdAt)}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-10">User not found.</p>
                    )}
                </div>

                {/* Right side - Conversation history */}
                <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-black">
                    {/* Search and Filter */}
                    <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 flex-shrink-0">
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-200 flex-shrink-0">
                            Conversation History ({filteredConversations.length})
                        </div>
                        <div className="flex-grow flex items-center gap-3 w-full sm:w-auto justify-end">
                            <div className="relative flex-grow max-w-xs w-full">
                                <IoSearchOutline className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search conversations..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                                />
                            </div>
                            <div className="relative" ref={filterDropdownRef}>
                                <button
                                    onClick={() => setFilterOpen(!filterOpen)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex-shrink-0"
                                >
                                    <IoFilterOutline size={14} /> Date
                                    <IoChevronDown size={14} className={`transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {filterOpen && (
                                    <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-20 overflow-hidden">
                                        {[{ label: 'All Time', value: 'all' }, { label: 'Today', value: 'today' }, { label: 'Last 7 Days', value: 'week' }, { label: 'Last 30 Days', value: 'month' }].map(range => (
                                            <button
                                                key={range.value}
                                                onClick={() => setDateRangeFilter(range.value as FilterOptions['dateRange'])}
                                                className={`w-full text-left px-3 py-1.5 text-sm flex justify-between items-center transition-colors ${filterOptions.dateRange === range.value
                                                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                    }`}
                                            >
                                                {range.label}
                                                {filterOptions.dateRange === range.value && <IoCheckmark size={16} />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Conversation List */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 dark:bg-gray-900/50 custom-scrollbar-dark dark:custom-scrollbar">
                        {isLoading ? renderConversationLoading() : filteredConversations.length > 0 ? (
                            <ul className="space-y-3">
                                {filteredConversations.map((convo) => (
                                    <li
                                        key={convo._id}
                                        className="flex items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700/50 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/60 cursor-pointer group"
                                        onClick={() => handleConversationClick(convo)}
                                    >
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center mr-4 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 flex-shrink-0">
                                            <IoChatbubbleEllipsesOutline size={16} />
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" title={convo.gptName}>
                                                {convo.gptName || 'Unknown GPT'}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={convo.previewContent || convo.lastMessage}>
                                                {convo.previewContent || convo.lastMessage || (convo.messages?.length ? convo.messages[convo.messages.length - 1].content : 'No messages')}
                                            </p>
                                        </div>
                                        <div className="ml-4 text-right flex-shrink-0">
                                            <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                {formatTimestamp(convo.lastActivity || convo.updatedAt || convo.createdAt)}
                                            </p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500">{convo.messageCount || convo.messages?.length || 0} messages</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-center py-12 px-4">
                                <IoTimeOutline className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                                <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">No Conversations Found</h3>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                                    {searchQuery || filterOptions.dateRange !== 'all' ? 'Try adjusting your search or filters.' : `No conversation history available for ${user?.name || 'this user'}.`}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserHistoryPage;