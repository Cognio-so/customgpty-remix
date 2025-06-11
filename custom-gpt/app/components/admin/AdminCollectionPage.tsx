import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { FiEdit, FiTrash2, FiSearch, FiChevronDown, FiChevronUp, FiPlus, FiInfo, FiFolder, FiFolderPlus, FiGlobe, FiSun, FiMoon } from 'react-icons/fi';
import { SiOpenai, SiGooglegemini } from 'react-icons/si';
import { FaRobot } from 'react-icons/fa6';
import { BiLogoMeta } from 'react-icons/bi';
import { RiOpenaiFill } from 'react-icons/ri';
import { TbRouter } from 'react-icons/tb';
import { useNavigate, useLoaderData, useFetcher, Link } from '@remix-run/react';
import { useTheme } from '~/contexts/ThemeContext';
import CreateCustomGpt from './CreateCustomGpt';
// import MoveToFolderModal from './MoveToFolderModal';

// Define interfaces
interface Gpt {
  _id: string;
  name: string;
  description?: string;
  model?: string;
  imageUrl?: string;
  createdAt?: string;
  capabilities?: { webBrowsing?: boolean };
  knowledgeBase?: { fileName: string; fileUrl: string }[];
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

// GptCard props interface
interface GptCardProps {
  gpt: Gpt;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  formatDate: (dateString: string) => string;
  onNavigate: (path: string) => void;
  onMoveToFolder: (gpt: Gpt) => void;
}

// Memoized GPT card component
const GptCard = memo(({ gpt, onDelete, onEdit, formatDate, onNavigate, onMoveToFolder }: GptCardProps) => {
  const { theme } = useTheme(); // Use the proper theme hook
  
  return (
    <div
      key={gpt._id}
      className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-blue-400/50 dark:hover:border-gray-600 transition-all shadow-md hover:shadow-lg flex flex-col cursor-pointer group"
      onClick={() => onNavigate(`/admin/chat/${gpt._id}`)}
    >
      <div className="h-32 sm:h-36 bg-gradient-to-br from-gray-100 to-gray-300 dark:from-gray-700 dark:to-gray-900 relative flex-shrink-0 overflow-hidden">
        {gpt.imageUrl ? (
          <img
            src={gpt.imageUrl}
            alt={gpt.name}
            className="w-full h-full object-cover object-center opacity-90 dark:opacity-80 group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
              e.currentTarget.onerror = null;
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50/50 to-purple-100/50 dark:from-blue-900/30 dark:to-purple-900/30">
            <span className={`text-3xl sm:text-4xl ${theme === 'dark' ? 'text-white/30' : 'text-gray-500/40'}`}>{gpt.name.charAt(0)}</span>
          </div>
        )}

        <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); onMoveToFolder(gpt); }}
            className="p-1.5 sm:p-2 bg-white/80 dark:bg-gray-900/70 text-gray-700 dark:text-gray-200 rounded-full hover:bg-green-500 hover:text-white dark:hover:bg-green-700/80 transition-colors shadow"
            title="Move to Folder"
          >
            <FiFolderPlus size={14} />
          </button>
          <button
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); onEdit(gpt._id); }}
            className="p-1.5 sm:p-2 bg-white/80 dark:bg-gray-900/70 text-gray-700 dark:text-gray-200 rounded-full hover:bg-blue-500 hover:text-white dark:hover:bg-blue-700/80 transition-colors shadow"
            title="Edit GPT"
          >
            <FiEdit size={14} />
          </button>
          <button
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDelete(gpt._id); }}
            className="p-1.5 sm:p-2 bg-white/80 dark:bg-gray-900/70 text-gray-700 dark:text-gray-200 rounded-full hover:bg-red-500 hover:text-white dark:hover:bg-red-700/80 transition-colors shadow"
            title="Delete GPT"
          >
            <FiTrash2 size={14} />
          </button>
        </div>
      </div>

      <div className="p-3 sm:p-4 flex flex-col flex-grow">
        <div className="flex items-start justify-between mb-1.5 sm:mb-2">
          <h3 className="font-semibold text-base sm:text-lg line-clamp-1 text-gray-900 dark:text-white">{gpt.name}</h3>
          {gpt.model && (
            <div className="flex items-center flex-shrink-0 gap-1 bg-gray-100 dark:bg-gray-700 px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs text-gray-600 dark:text-gray-300">
              {React.cloneElement(modelIcons[gpt.model] || <FaRobot className="text-gray-500" />, { size: 12 })}
              <span className="hidden sm:inline">{gpt.model}</span>
            </div>
          )}
        </div>

        <p className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm h-10 sm:h-12 line-clamp-2 sm:line-clamp-3 mb-3">{gpt.description}</p>
        
        {gpt.capabilities?.webBrowsing && (
          <div className="flex items-center gap-1 text-xs text-blue-500 dark:text-blue-400 mb-1">
            <FiGlobe size={12} />
            <span>Web search</span>
          </div>
        )}
        
        <div className="mt-auto pt-2 border-t border-gray-100 dark:border-gray-700 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 flex justify-between items-center">
          <span>Created: {formatDate(gpt.createdAt || '')}</span>
          {gpt.knowledgeBase && gpt.knowledgeBase.length > 0 && (
            <span className="whitespace-nowrap">{gpt.knowledgeBase.length} {gpt.knowledgeBase.length === 1 ? 'file' : 'files'}</span>
          )}
        </div>
        {gpt.folder && (
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1.5">
            <FiFolder size={12} />
            <span>{gpt.folder}</span>
          </div>
        )}
      </div>
    </div>
  );
});

const AdminCollectionPage: React.FC = () => {
  const navigate = useNavigate();
  const data = useLoaderData<{ customGpts: Gpt[] }>();
  const fetcher = useFetcher();
  const { theme, setTheme } = useTheme(); // Use the proper theme hook
  
  const [folders, setFolders] = useState<string[]>(['All', 'Uncategorized']);
  const [selectedFolder, setSelectedFolder] = useState<string>('All');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortOption, setSortOption] = useState<string>('newest');
  const [showSortOptions, setShowSortOptions] = useState<boolean>(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Theme toggle function
  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  // Initialize folders when data loads
  useEffect(() => {
    if (data?.customGpts) {
      const uniqueFolders = Array.from(
        new Set(data.customGpts.map(gpt => gpt.folder || 'Uncategorized'))
      );
      setFolders(['All', ...uniqueFolders]);
    }
  }, [data]);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const toggleSortOptions = useCallback(() => {
    setShowSortOptions(prev => !prev);
  }, []);

  const handleSortOptionSelect = useCallback((option: string) => {
    setSortOption(option);
    setShowSortOptions(false);
  }, []);

  const handleMoveToFolder = useCallback((gpt: Gpt) => {
    const folderName = prompt("Enter folder name:", gpt.folder || "");
    if (folderName !== null) {
      fetcher.submit(
        { id: gpt._id, folder: folderName, intent: 'updateFolder' },
        { method: 'post', action: '/admin/update-folder' }
      );
    }
  }, [fetcher]);

  const handleDelete = useCallback((id: string) => {
    if (window.confirm('Are you sure you want to delete this GPT?')) {
      fetcher.submit(
        { id, intent: 'delete' },
        { method: 'post', action: '/admin/delete-gpt' }
      );
    }
  }, [fetcher]);

  // Add useEffect to handle deletion response and refresh UI
  useEffect(() => {
    if (fetcher.data) {
      if ((fetcher.data as any).success) {
        // Refresh the data by reloading or revalidating
        window.location.reload(); // Simple solution
        // Or you could trigger a revalidation: 
        // navigate('.', { replace: true });
      } else if ((fetcher.data as any).error) {
        alert(`Error: ${(fetcher.data as any).error}`);
      }
    }
  }, [fetcher.data]);

  const handleEdit = useCallback((id: string) => {
    // Simply navigate to the edit route which will redirect to create-gpt with edit mode
    navigate(`/admin/edit-gpt/${id}`);
  }, [navigate]);

  const handleNavigate = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  const filteredAndSortedGpts = useMemo(() => {
    let filtered = data?.customGpts || [];

    if (selectedFolder !== 'All') {
      if (selectedFolder === 'Uncategorized') {
        filtered = filtered.filter(gpt => !gpt.folder);
      } else {
        filtered = filtered.filter(gpt => gpt.folder === selectedFolder);
      }
    }

    if (searchTerm) {
      filtered = filtered.filter(gpt => 
        gpt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        gpt.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      switch (sortOption) {
        case 'newest':
          return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
        case 'oldest':
          return new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime();
        case 'alphabetical':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return sorted;
  }, [data?.customGpts, selectedFolder, searchTerm, sortOption]);

  // Close sort dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setShowSortOptions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [sortDropdownRef]);

  if (loading && !data?.customGpts) {
    return (
      <div className="flex items-center justify-center h-full bg-white dark:bg-black text-gray-600 dark:text-gray-400">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error && !data?.customGpts) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white dark:bg-black text-gray-600 dark:text-gray-400 p-6">
        <FiInfo size={40} className="mb-4 text-red-500" />
        <h2 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-200">Loading Failed</h2>
        <p className="text-center mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}  
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${theme === 'dark' ? 'dark' : ''} bg-gray-50 dark:bg-black text-black dark:text-white p-4 sm:p-6 overflow-hidden`}>
      <div className="mb-4 md:mb-6 flex-shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="text-center sm:text-left">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Collections</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your custom GPTs</p>
        </div>
        <button
          onClick={toggleTheme}
          className={`p-2 rounded-full transition-colors self-center sm:self-auto mt-3 sm:mt-0 ${
            theme === 'dark' 
              ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          aria-label={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
          title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === 'dark' ? <FiSun size={20} /> : <FiMoon size={20} />}
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 md:mb-6 gap-3 md:gap-4 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
          <div className="relative">
            <select
              value={selectedFolder}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedFolder(e.target.value)}
              className="w-full sm:w-36 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 appearance-none cursor-pointer"
              aria-label="Select Folder"
            >
              {folders.map(folder => (
                <option key={folder} value={folder}>
                  {folder}
                </option>
              ))}
            </select>
            <FiFolder className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
          </div>

          <div className="relative flex-grow sm:flex-grow-0">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search GPTs..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full sm:w-52 md:w-64 pl-10 pr-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              aria-label="Search GPTs"
            />
          </div>

          <div className="relative" ref={sortDropdownRef}>
            <button
              onClick={toggleSortOptions}
              className="flex items-center justify-between w-full sm:w-36 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
              aria-haspopup="true"
              aria-expanded={showSortOptions}
            >
              <span className="truncate">Sort: {sortOption.charAt(0).toUpperCase() + sortOption.slice(1)}</span>
              {showSortOptions ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
            </button>
            {showSortOptions && (
              <div className="absolute left-0 mt-2 w-36 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 dark:ring-gray-700 z-10 overflow-hidden">
                {['newest', 'oldest', 'alphabetical'].map((option) => (
                  <button
                    key={option}
                    onClick={() => handleSortOptionSelect(option)}
                    className={`w-full text-left px-4 py-2 text-sm ${sortOption === option ? 'font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => navigate('/admin/create-gpt')}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white dark:bg-white dark:text-black rounded-lg font-medium text-sm transition-colors flex-shrink-0 whitespace-nowrap"
        >
          <FiPlus size={18} /> Create New GPT
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredAndSortedGpts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            <FiInfo size={48} className="mb-4" />
            <h3 className="text-lg font-medium mb-2">No GPTs found</h3>
            <p className="text-sm text-center">
              {searchTerm ? 'Try adjusting your search terms' : 'Create your first custom GPT to get started'}
            </p>
            {!searchTerm && (
              <Link to="/admin/create-gpt" className="mt-4">
                <button className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">
                  Create Your First GPT
                </button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {filteredAndSortedGpts.map((gpt) => (
              <GptCard
                key={gpt._id}
                gpt={gpt}
                onDelete={handleDelete}
                onEdit={handleEdit}
                formatDate={formatDate}
                onNavigate={handleNavigate}
                onMoveToFolder={handleMoveToFolder}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCollectionPage;