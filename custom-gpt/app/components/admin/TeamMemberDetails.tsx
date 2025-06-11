import React, { useState, useCallback, useMemo, useEffect, lazy, Suspense, memo } from 'react';
import { useNavigate, useParams } from '@remix-run/react';
import { IoClose, IoPersonCircleOutline, IoAppsOutline } from 'react-icons/io5';
import { FiBox, FiPlus, FiTrash2 } from 'react-icons/fi';

const GptCard = memo(({ gpt, onRemove }: { gpt: any, onRemove: (gptId: string) => void }) => (
  <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50 border border-gray-600">
    <div className="flex items-center">
      <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center mr-3">
        {gpt.imageUrl ? (
          <img src={gpt.imageUrl} alt={gpt.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-lg text-white">{gpt.name.charAt(0)}</span>
        )}
      </div>
      <div>
        <h4 className="font-medium text-white">{gpt.name}</h4>
        <p className="text-xs text-gray-400">{gpt.description}</p>
      </div>
    </div>
    <div className="flex items-center">
      <div className="text-xs text-gray-400 mr-4">
        Assigned: {new Date(gpt.createdAt).toLocaleDateString()}
      </div>
      <button
        onClick={() => onRemove(gpt._id)}
        className="text-red-400 hover:text-red-300 p-1.5 hover:bg-gray-600 rounded-full transition-colors"
        title="Remove GPT"
      >
        <FiTrash2 size={18} />
      </button>
    </div>
  </div>
));

const TeamMemberDetails = ({ user, gpts, isCurrentUser }: { user: any, gpts: any, isCurrentUser: boolean }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [isModalOpen, setIsModalOpen] = useState(true);
  const navigate = useNavigate();
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => navigate('/admin/team'), 300);
  };
  
  const handleRemoveGpt = useCallback((gptId: string) => {
    console.log('Remove GPT with ID:', gptId);
    // Implement GPT removal logic
  }, []);

  const renderProfileTab = () => (
    <div className="space-y-6 py-6 px-1">
      <div className="flex items-center space-x-4">
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-medium flex-shrink-0">
          {user.name.charAt(0)}
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{user.name}</h2>
          <p className="text-gray-500 dark:text-gray-400">{user.email}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600/50">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">Personal Information</h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
              <p className="text-sm text-gray-800 dark:text-white truncate">
                {user.email}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Department</p>
              <p className="text-sm text-gray-800 dark:text-white">Not Assigned</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600/50">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">Account Status</h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Role</p>
              <p className="text-sm text-gray-800 dark:text-white">{user.role}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Status</p>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user.isActive 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                    : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                }`}
              >
                {user.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Joined Date</p>
              <p className="text-sm text-gray-800 dark:text-white">
                {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Last Active</p>
              <p className="text-sm text-gray-800 dark:text-white">
                {new Date(user.updatedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAssignedGptsTab = () => (
    <div className="py-4">
      <div className="flex justify-between items-center mb-4">
        <button
          className="bg-black dark:bg-white hover:dark:bg-black/70 dark:hover:bg-white/70 text-white dark:text-black text-sm rounded-md px-3 py-1.5 flex items-center"
          onClick={() => {/* Implement assign GPT */}}
        >
          <FiPlus className="mr-1.5" size={14} />
          Assign GPTs
        </button>
      </div>
      {gpts && gpts.length > 0 ? (
        <div className="space-y-3">
          {gpts.map((gpt: any) => (
            <GptCard key={gpt._id} gpt={gpt} onRemove={handleRemoveGpt} />
          ))}
        </div>
      ) : (
        <div className="text-center py-10 bg-gray-800 rounded-lg border border-gray-700">
          <FiBox className="mx-auto text-gray-500" size={24} />
          <p className="mt-2 text-gray-400">No GPTs assigned yet</p>
          <button
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md px-4 py-2"
            onClick={() => {/* Implement assign GPT */}}
          >
            Assign First GPT
          </button>
        </div>
      )}
    </div>
  );

  const tabs = [
    { id: 'profile', label: 'Profile', icon: IoPersonCircleOutline, render: renderProfileTab },
    { id: 'gpts', label: 'Assigned GPTs', icon: IoAppsOutline, render: renderAssignedGptsTab },
  ];

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
        isModalOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      } transition-opacity duration-300`}
    >
      <div className="absolute inset-0 bg-black/60 dark:bg-black/80" onClick={handleCloseModal}></div>
      <div
        className={`relative bg-white dark:bg-gray-800 w-full max-w-3xl max-h-[90vh] rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col transform ${
          isModalOpen ? 'scale-100' : 'scale-95'
        } transition-transform duration-300`}
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900 flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate pr-4">
            Member Details: {user.name}
          </h3>
          <button
            onClick={handleCloseModal}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-white transition-colors rounded-full p-1 hover:bg-gray-200 dark:hover:bg-gray-700 flex-shrink-0"
          >
            <IoClose size={22} />
          </button>
        </div>
        <div className="px-6 pt-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-800">
          <div className="flex gap-1 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 border-b-2 text-sm font-medium transition-colors duration-200 flex items-center gap-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <tab.icon size={16} /> {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-800/50 custom-scrollbar-dark dark:custom-scrollbar">
          {tabs.find(tab => tab.id === activeTab)?.render()}
        </div>
      </div>
    </div>
  );
};

export default TeamMemberDetails;