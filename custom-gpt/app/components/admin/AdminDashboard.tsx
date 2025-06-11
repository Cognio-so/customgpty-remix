import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { FiSearch, FiChevronDown, FiChevronUp, FiMenu, FiPlus, FiGlobe, FiUsers, FiMessageSquare, FiGrid, FiList, FiEdit, FiTrash2, FiFolderPlus } from 'react-icons/fi';
import { SiOpenai, SiGooglegemini } from 'react-icons/si';
import { FaRobot } from 'react-icons/fa6';
import { BiLogoMeta } from 'react-icons/bi';
import { RiOpenaiFill, RiMoonFill, RiSunFill } from 'react-icons/ri';
import { TbRouter } from 'react-icons/tb';
import { Link, useLoaderData, useFetcher } from '@remix-run/react';
import { useTheme } from '~/contexts/ThemeContext';

// Define interfaces
interface Agent {
  _id: string;
  name: string;
  imageUrl?: string;
  model: string;
  capabilities?: {
    webBrowsing: boolean;
  };
  createdAt: string;
  description?: string;
  folder?: string | null;
}

// Model icons mapping
const modelIcons: { [key: string]: JSX.Element } = {
  'openrouter/auto': <TbRouter className="text-yellow-500" size={18} />,
  'GPT-4o': <RiOpenaiFill className="text-green-500" size={18} />,
  'GPT-4o-mini': <SiOpenai className="text-green-400" size={16} />,
  'Gemini-flash-2.5': <SiGooglegemini className="text-blue-400" size={16} />,
  'Gemini-pro-2.5': <SiGooglegemini className="text-blue-600" size={16} />,
  'Claude 3.5 Haiku': <FaRobot className="text-purple-400" size={16} />,
  'llama3-8b-8192': <BiLogoMeta className="text-blue-500" size={18} />,
  'Llama 4 Scout': <BiLogoMeta className="text-blue-700" size={18} />
};

// Enhanced Agent Card component
interface EnhancedAgentCardProps {
  agent: Agent;
  onClick: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveToFolder: (agent: Agent) => void;
}

const EnhancedAgentCard: React.FC<EnhancedAgentCardProps> = ({ agent, onClick, onEdit, onDelete, onMoveToFolder }) => {
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-blue-400/50 dark:hover:border-gray-600 transition-all shadow-md hover:shadow-lg flex flex-col cursor-pointer group"
      onClick={onClick}
    >
      <div className="h-32 sm:h-36 bg-gradient-to-br from-gray-100 to-gray-300 dark:from-gray-700 dark:to-gray-900 relative flex-shrink-0 overflow-hidden">
        {agent.imageUrl ? (
          <img
            src={agent.imageUrl}
            alt={agent.name}
            className="w-full h-full object-cover object-center opacity-90 dark:opacity-80 group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50/50 to-purple-100/50 dark:from-blue-900/30 dark:to-purple-900/30">
            <span className="text-3xl sm:text-4xl text-gray-500/40 dark:text-white/30">{agent.name.charAt(0)}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); onMoveToFolder(agent); }}
            className="p-1.5 sm:p-2 bg-white/80 dark:bg-gray-900/70 text-gray-700 dark:text-gray-200 rounded-full hover:bg-green-500 hover:text-white dark:hover:bg-green-700/80 transition-colors shadow"
            title="Move to Folder"
          >
            <FiFolderPlus size={14} />
          </button>
          <button
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); onEdit(agent._id); }}
            className="p-1.5 sm:p-2 bg-white/80 dark:bg-gray-900/70 text-gray-700 dark:text-gray-200 rounded-full hover:bg-blue-500 hover:text-white dark:hover:bg-blue-700/80 transition-colors shadow"
            title="Edit GPT"
          >
            <FiEdit size={14} />
          </button>
          <button
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDelete(agent._id); }}
            className="p-1.5 sm:p-2 bg-white/80 dark:bg-gray-900/70 text-gray-700 dark:text-gray-200 rounded-full hover:bg-red-500 hover:text-white dark:hover:bg-red-700/80 transition-colors shadow"
            title="Delete GPT"
          >
            <FiTrash2 size={14} />
          </button>
        </div>
      </div>

      <div className="p-3 sm:p-4 flex flex-col flex-grow">
        <div className="flex items-start justify-between mb-1.5 sm:mb-2">
          <h3 className="font-semibold text-base sm:text-lg line-clamp-1 text-gray-900 dark:text-white">{agent.name}</h3>
          <div className="flex items-center flex-shrink-0 gap-1 bg-gray-100 dark:bg-gray-700 px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs text-gray-600 dark:text-gray-300">
            {modelIcons[agent.model] 
              ? React.cloneElement(
                  modelIcons[agent.model] as React.ReactElement, 
                  { size: 12 }
                ) 
              : <FaRobot className="text-gray-500" size={12} />
            }   
            <span className="hidden sm:inline">{agent.model}</span>
          </div>
        </div>

        {agent.capabilities?.webBrowsing && (
          <div className="flex items-center gap-1 text-xs text-blue-500 dark:text-blue-400 mb-1">
            <FiGlobe size={12} />
            <span>Web search</span>
          </div>
        )}
        
        {agent.description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">{agent.description}</p>
        )}
      </div>
    </div>
  );
};

interface AdminDashboardProps {
  userName?: string;
  onNavigate?: (page: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ userName = "Admin User", onNavigate }) => {
  const data = useLoaderData<{ agents: Agent[] }>();
  const fetcher = useFetcher();
  const { theme, setTheme } = useTheme();
  
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isSortOpen, setIsSortOpen] = useState<boolean>(false);
  const [sortOption, setSortOption] = useState<string>('Default');
  const sortOptions: string[] = ['Default', 'Latest', 'Older'];
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showSidebar, setShowSidebar] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [folders, setFolders] = useState<string[]>(['Uncategorized']);

  // Organize agents by folder
  const [organizedAgents, setOrganizedAgents] = useState<{
    featured: Agent[];
    productivity: Agent[];
    education: Agent[];
    entertainment: Agent[];
  }>({
    featured: [],
    productivity: [],
    education: [],
    entertainment: []
  });

  // Initialize folders and organize agents when data loads
  useEffect(() => {
    if (data?.agents) {
      // Extract unique folders
      const uniqueFolders = Array.from(
        new Set(data.agents.map(agent => agent.folder || 'Uncategorized'))
      );
      setFolders(['All', ...uniqueFolders]);
      
      // Organize agents - simple categorization based on folders or add your logic
      const organized = {
        featured: data.agents.slice(0, 4), // First 4 as featured
        productivity: data.agents.filter(a => a.folder === 'Productivity'),
        education: data.agents.filter(a => a.folder === 'Education'),
        entertainment: data.agents.filter(a => a.folder === 'Entertainment')
      };
      
      setOrganizedAgents(organized);
    }
  }, [data]);

  // Handle delete GPT
  const handleDeleteGpt = useCallback(async (id: string) => {
    if (window.confirm("Are you sure you want to delete this GPT?")) {
      fetcher.submit(
        { id, intent: 'delete' },
        { method: 'post', action: '/admin/delete-gpt' }
      );
    }
  }, [fetcher]);

  // Handle edit GPT
  const handleEditGpt = useCallback((id: string) => {
    window.location.href = `/admin/edit-gpt/${id}`;
  }, []);

  // Handle move to folder
  const handleMoveToFolder = useCallback((agent: Agent) => {
    const folderName = prompt("Enter folder name:", agent.folder || "");
    if (folderName !== null) {
      fetcher.submit(
        { id: agent._id, folder: folderName, intent: 'updateFolder' },
        { method: 'post', action: '/admin/update-folder' }
      );
    }
  }, [fetcher]);

  // Theme toggle function
  const toggleTheme = useCallback((): void => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const applySorting = (agents: Agent[], sortOpt: string): Agent[] => {
    if (sortOpt === 'Default') return agents;
    
    const sortedAgents = [...agents];
    if (sortOpt === 'Latest') {
      sortedAgents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortOpt === 'Older') {
      sortedAgents.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    
    return sortedAgents;
  };

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 640) {
        setShowSidebar(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filter and sort agents
  const filteredAgentsData = useMemo(() => {
    const searchTermLower = searchTerm.toLowerCase().trim();
    
    // Apply filters to each category
    const result = {} as typeof organizedAgents;
    
    Object.entries(organizedAgents).forEach(([category, agents]) => {
      let filtered = agents;
      
      // Filter by search term
      if (searchTermLower) {
        filtered = filtered.filter(agent =>
          agent.name.toLowerCase().includes(searchTermLower) ||
          (agent.description && agent.description.toLowerCase().includes(searchTermLower))
        );
      }
      
      // Apply sorting
      result[category as keyof typeof organizedAgents] = applySorting(filtered, sortOption);
    });
    
    return result;
  }, [searchTerm, organizedAgents, sortOption]);

  // Close sort dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  const handleSortChange = (option: string): void => {
    setSortOption(option);
    setIsSortOpen(false);
  };

  const handleNavigateToChat = (agentId: string): void => {
    window.location.href = `/admin/chat/${agentId}`;
  };

  const hasSearchResults: boolean = Object.values(filteredAgentsData).some(
    category => category.length > 0
  );

  // Loading state
  if (loading && !data?.agents) {
    return (
      <div className="flex h-screen bg-white dark:bg-black text-black dark:text-white items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Error state
  if (error && !data?.agents) {
    return (
      <div className="flex h-screen bg-white dark:bg-black text-black dark:text-white items-center justify-center">
        <div className="text-center p-4">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 text-white px-6 py-2 rounded-full font-medium hover:bg-blue-600 transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen font-sans ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50 dark:bg-gray-900 text-black dark:text-white">
        {/* Mobile Sidebar Overlay */}
        {showSidebar && (
          <div
            className="fixed inset-0 bg-black/80 z-40 sm:hidden"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* Header Section */}
        <header className="bg-white dark:bg-black px-4 sm:px-8 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 shadow-sm">
          {/* Desktop Header */}
          <div className="hidden sm:flex items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
              <div className="flex items-center ml-4 gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  title="Grid View"
                >
                  <FiGrid className="text-gray-700 dark:text-gray-300" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  title="List View"
                >
                  <FiList className="text-gray-700 dark:text-gray-300" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search GPTs..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="w-64 pl-10 pr-4 py-2 rounded-md bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {theme === 'dark' ? <RiSunFill size={20} className="text-yellow-400" /> : <RiMoonFill size={20} className="text-gray-700" />}
              </button>
              <Link to={'/admin/create-gpt'}>
              <button
                className="flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-md font-medium transition-colors"
              >
                <FiPlus size={18} />
                Create GPT
              </button>
              </Link>
            </div>
          </div>
          {/* Mobile Header */}
          <div className="block sm:hidden">
            <div className="flex items-center mb-4">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <FiMenu size={24} className="text-gray-700 dark:text-gray-300" />
              </button>
              <h1 className="flex-1 text-center text-xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                {theme === 'dark' ? <RiSunFill size={20} className="text-yellow-400" /> : <RiMoonFill size={20} className="text-gray-700" />}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search GPTs..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-md bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
              <Link to={'/admin/create-gpt'}>
              <button
                className="flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-md font-medium transition-colors"
              >
                <FiPlus size={24} />
                Create GPT
              </button>
              </Link>
            </div>
            <div className="flex justify-center mt-3 gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              >
                <FiGrid className="text-gray-700 dark:text-gray-300" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              >
                <FiList className="text-gray-700 dark:text-gray-300" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto bg-gray-50 dark:bg-black scrollbar-hide [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {searchTerm && !hasSearchResults ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No agents found for "{searchTerm}"
            </div>
          ) : data?.agents?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 py-8">
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">No custom GPTs found</p>
              <Link to="/admin/create-gpt">
                <button className="px-5 py-2 bg-black dark:bg-white text-white dark:text-black rounded-md font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">
                  Create Your First GPT
                </button>
              </Link>
            </div>
          ) : (
            <>
              {/* Featured Agents Section */}
              {filteredAgentsData.featured && filteredAgentsData.featured.length > 0 && (
                <div className="mb-8 flex-shrink-0">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Featured Agents</h2>
                    <div className="relative" ref={dropdownRef}>
                      <button
                        onClick={() => setIsSortOpen(!isSortOpen)}
                        className="flex items-center text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white py-1.5 px-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-sm"
                      >
                        Sort: {sortOption}
                        {isSortOpen ? <FiChevronUp className="ml-2" /> : <FiChevronDown className="ml-2" />}
                      </button>
                      {isSortOpen && (
                        <div className="absolute top-full right-0 mt-1 w-36 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700">
                          <ul>
                            {sortOptions.map((option) => (
                              <li key={option}>
                                <button
                                  onClick={() => handleSortChange(option)}
                                  className={`block w-full text-left px-4 py-2 text-sm ${sortOption === option ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'} transition-all`}
                                >
                                  {option}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={viewMode === 'grid' ?
                    "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" :
                    "space-y-3"
                  }>
                    {filteredAgentsData.featured.map((agent) => (
                      viewMode === 'grid' ? (
                        <EnhancedAgentCard
                          key={agent._id}
                          agent={agent}
                          onClick={() => handleNavigateToChat(agent._id)}
                          onEdit={handleEditGpt}
                          onDelete={handleDeleteGpt}
                          onMoveToFolder={handleMoveToFolder}
                        />
                      ) : (
                        <div
                          key={agent._id}
                          className="flex items-center bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400/50 dark:hover:border-gray-600 shadow-sm cursor-pointer group"
                          onClick={() => handleNavigateToChat(agent._id)}
                        >
                          <div className="h-14 w-14 bg-gradient-to-br from-gray-100 to-gray-300 dark:from-gray-700 dark:to-gray-900 rounded-md overflow-hidden mr-4 flex-shrink-0">
                            {agent.imageUrl ? (
                              <img src={agent.imageUrl} alt={agent.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-xl text-gray-500/40 dark:text-white/30">{agent.name.charAt(0)}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-grow min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate">{agent.name}</h3>
                              <div className="flex items-center ml-2 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-[10px] text-gray-600 dark:text-gray-300">
                                {React.cloneElement(modelIcons[agent.model] || <FaRobot className="text-gray-500" />, { size: 12 })}
                                <span className="ml-1">{agent.model}</span>
                              </div>
                            </div>
                            
                            {agent.description && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5">{agent.description}</p>
                            )}
                          </div>

                          {/* Action buttons for list view */}
                          <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleMoveToFolder(agent); }}
                              className="p-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-green-500 hover:text-white transition-colors"
                              title="Move to Folder"
                            >
                              <FiFolderPlus size={14} />
                            </button>
                            <button
                              onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleEditGpt(agent._id); }}
                              className="p-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-blue-500 hover:text-white transition-colors"
                              title="Edit GPT"
                            >
                              <FiEdit size={14} />
                            </button>
                            <button
                              onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleDeleteGpt(agent._id); }}
                              className="p-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-red-500 hover:text-white transition-colors"
                              title="Delete GPT"
                            >
                              <FiTrash2 size={14} />
                            </button>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}

              {/* Categories Header */}
              <h2 className="text-xl font-semibold mb-6 flex-shrink-0 text-gray-900 dark:text-white">Categories</h2>

              {/* Scrollable Categories */}
              <div className="space-y-8">
                {Object.entries(filteredAgentsData).map(([category, agents]) => {
                  if (category === 'featured' || agents.length === 0) return null;
                  const categoryTitle = category
                    .replace(/([A-Z])/g, ' $1')
                    .replace(/^./, (str) => str.toUpperCase());

                  return (
                    <div key={category} className="mb-8">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">{categoryTitle}</h3>
                        <span className="text-sm text-gray-500 dark:text-gray-400">{agents.length} {agents.length === 1 ? 'agent' : 'agents'}</span>
                      </div>

                      <div className={viewMode === 'grid' ?
                        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" :
                        "space-y-3"
                      }>
                        {agents.map((agent: Agent) => (
                          viewMode === 'grid' ? (
                            <EnhancedAgentCard
                              key={agent._id}
                              agent={agent}
                              onClick={() => handleNavigateToChat(agent._id)}
                              onEdit={handleEditGpt}
                              onDelete={handleDeleteGpt}
                              onMoveToFolder={handleMoveToFolder}
                            />
                          ) : (
                            <div
                              key={agent._id}
                              className="flex items-center bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400/50 dark:hover:border-gray-600 shadow-sm cursor-pointer group"
                              onClick={() => handleNavigateToChat(agent._id)}
                            >
                              <div className="h-14 w-14 bg-gradient-to-br from-gray-100 to-gray-300 dark:from-gray-700 dark:to-gray-900 rounded-md overflow-hidden mr-4 flex-shrink-0">
                                {agent.imageUrl ? (
                                  <img src={agent.imageUrl} alt={agent.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <span className="text-xl text-gray-500/40 dark:text-white/30">{agent.name.charAt(0)}</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex-grow min-w-0">
                                <div className="flex items-center justify-between">
                                  <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate">{agent.name}</h3>
                                  <div className="flex items-center ml-2 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-[10px] text-gray-600 dark:text-gray-300">
                                    {React.cloneElement(modelIcons[agent.model] || <FaRobot className="text-gray-500" />, { size: 12 })}
                                    <span className="ml-1">{agent.model}</span>
                                  </div>
                                </div>
                                
                                {agent.description && (
                                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5">{agent.description}</p>
                                )}
                              </div>

                              {/* Action buttons for list view */}
                              <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleMoveToFolder(agent); }}
                                  className="p-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-green-500 hover:text-white transition-colors"
                                  title="Move to Folder"
                                >
                                  <FiFolderPlus size={14} />
                                </button>
                                <button
                                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleEditGpt(agent._id); }}
                                  className="p-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-blue-500 hover:text-white transition-colors"
                                  title="Edit GPT"
                                >
                                  <FiEdit size={14} />
                                </button>
                                <button
                                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleDeleteGpt(agent._id); }}
                                  className="p-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-red-500 hover:text-white transition-colors"
                                  title="Delete GPT"
                                >
                                  <FiTrash2 size={14} />
                                </button>
                              </div>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;