import React, { useState, useEffect } from 'react';
import { useFetcher } from '@remix-run/react';
import { IoSave, IoMoon, IoSunny, IoPersonOutline, IoKey, IoEyeOutline, IoEyeOffOutline, IoCheckmarkCircle } from 'react-icons/io5';
import { useTheme } from '~/contexts/ThemeContext';

// Define types for API keys and password data
interface ApiKeys {
  openai: string;
  claude: string;
  gemini: string;
  llama: string;
}

interface ShowKeys {
  openai: boolean;
  claude: boolean;
  gemini: boolean;
  llama: boolean;
}

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface UserSettings {
  theme: 'light' | 'dark';
  apiKeys: ApiKeys;
}

interface AdminSettingPageProps {
  userSettings: UserSettings;
  actionData?: { success?: boolean; error?: string; message?: string };
}

const AdminSettingPage: React.FC<AdminSettingPageProps> = ({ userSettings, actionData }) => {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'general' | 'api-keys'>('general');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const apiKeysFetcher = useFetcher();
  const passwordFetcher = useFetcher();
  const themeFetcher = useFetcher();

  // State to manage visibility of API keys
  const [showKeys, setShowKeys] = useState<ShowKeys>({
    openai: false,
    claude: false,
    gemini: false,
    llama: false,
  });

  // API keys state - initialize with userSettings
  const [apiKeys, setApiKeys] = useState<ApiKeys>(userSettings.apiKeys);

  // Password change state
  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Update API keys when userSettings change
  useEffect(() => {
    setApiKeys(userSettings.apiKeys);
  }, [userSettings.apiKeys]);

  // Show success/error notifications
  useEffect(() => {
    if (actionData?.success) {
      showNotification('success', actionData.message || 'Settings updated successfully');
    } else if (actionData?.error) {
      showNotification('error', actionData.error);
    }
  }, [actionData]);

  // Handle API key fetcher state
  useEffect(() => {
    if ((apiKeysFetcher.data as any)?.success) {
      showNotification('success', (apiKeysFetcher.data as any).message || 'API keys updated successfully');
    } else if ((apiKeysFetcher.data as any)?.error) {
      showNotification('error', (apiKeysFetcher.data as any).error);
    }
  }, [apiKeysFetcher.data]);

  // Handle password fetcher state
  useEffect(() => {
    if ((passwordFetcher.data as any)?.success) {
      showNotification('success', (passwordFetcher.data as any).message || 'Password updated successfully');
      // Reset form on success
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } else if ((passwordFetcher.data as any)?.error) {
      showNotification('error', (passwordFetcher.data as any).error);
    }
  }, [passwordFetcher.data]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 ${
      type === 'success' 
        ? 'bg-green-100 border-green-400 text-green-700' 
        : 'bg-red-100 border-red-400 text-red-700'
    } border px-4 py-3 rounded shadow-md z-50`;
    notification.style.animation = 'fadeOut 5s forwards';
    notification.innerHTML = `<p class="font-bold">${type === 'success' ? 'Success' : 'Error'}</p>
                             <p class="text-sm">${message}</p>`;
    
    // Add fade out animation
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

  // Handle API key changes
  const handleApiKeyChange = (modelName: keyof ApiKeys, value: string) => {
    setApiKeys(prev => ({ ...prev, [modelName]: value }));
  };

  // Handle password changes
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  // Handle theme change
  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    
    const formData = new FormData();
    formData.append('intent', 'updateTheme');
    formData.append('theme', newTheme);
    
    themeFetcher.submit(formData, { method: 'POST' });
  };

  // Handle saving API keys
  const handleSaveApiKeys = () => {
    // Validate at least one key is provided
    const hasValidKey = Object.values(apiKeys).some(key => key && key.trim() !== '' && key !== '••••••••••••••••');
    
    if (!hasValidKey) {
      showNotification('error', 'Please provide at least one API key');
      return;
    }

    const formData = new FormData();
    formData.append('intent', 'updateApiKeys');
    formData.append('openai', apiKeys.openai || '');
    formData.append('claude', apiKeys.claude || '');
    formData.append('gemini', apiKeys.gemini || '');
    formData.append('llama', apiKeys.llama || '');
    
    apiKeysFetcher.submit(formData, { method: 'POST' });
  };

  // Handle password update
  const handleUpdatePassword = () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      showNotification('error', 'All password fields are required');
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showNotification('error', 'New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      showNotification('error', 'Password must be at least 8 characters long');
      return;
    }
    
    const formData = new FormData();
    formData.append('intent', 'updatePassword');
    formData.append('currentPassword', passwordData.currentPassword);
    formData.append('newPassword', passwordData.newPassword);
    formData.append('confirmPassword', passwordData.confirmPassword);
    
    passwordFetcher.submit(formData, { method: 'POST' });
  };

  const toggleKeyVisibility = (keyName: keyof ShowKeys) => {
    setShowKeys(prev => ({ ...prev, [keyName]: !prev[keyName] }));
  };

  // Helper function to render API key input field
  const renderApiKeyInput = (modelName: keyof ApiKeys, placeholder: string) => (
    <div key={modelName} className="relative transition-all duration-300 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 p-4 hover:border-blue-500/30">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium capitalize text-gray-800 dark:text-white">{modelName} API Key</label>
        {apiKeys[modelName] && apiKeys[modelName] !== '' && (
          <span className="text-xs text-green-500 dark:text-green-400">Configured</span>
        )}
      </div>
      <div className="relative">
        <input
          type={showKeys[modelName] ? 'text' : 'password'}
          name={modelName}
          value={apiKeys[modelName] || ''}
          onChange={(e) => handleApiKeyChange(modelName, e.target.value)}
          className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => toggleKeyVisibility(modelName)}
          className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white"
          aria-label={showKeys[modelName] ? `Hide ${modelName} key` : `Show ${modelName} key`}
        >
          {showKeys[modelName] ? <IoEyeOffOutline size={18} /> : <IoEyeOutline size={18} />}
        </button>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">Used for {modelName.charAt(0).toUpperCase() + modelName.slice(1)} models</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-black text-black dark:text-white">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Customize your experience and manage your account</p>
      </div>

      {/* Tab Navigation - Fixed */}
      <div className="flex-shrink-0 px-6 pt-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {[
            { id: 'general', label: 'General', icon: IoPersonOutline },
            { id: 'api-keys', label: 'API Keys', icon: IoKey },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'general' | 'api-keys')}
              className={`px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 whitespace-nowrap border-b-2 -mb-px
                ${activeTab === tab.id
                  ? 'text-blue-600 dark:text-blue-400 border-blue-500 dark:border-blue-500 bg-blue-50 dark:bg-gray-800/50'
                  : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/30'
                }`}
            >
              <tab.icon size={16} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content Area - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            {activeTab === 'general' && (
              <div className="space-y-6">
                {/* Account Details Card */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Account Details</h3>
                  {isLoading ? (
                    <div className="animate-pulse flex items-center space-x-4">
                      <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                      <div className="space-y-3 flex-1">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-6">
                      <div>
                        <p className="text-xl font-medium text-gray-900 dark:text-white">Admin</p>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">admin@admin.com</p>
                        <div className="flex items-center gap-1.5 mt-2 text-green-500 dark:text-green-400 text-sm">
                          <IoCheckmarkCircle size={16} />
                          <span>Verified account</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Appearance Card */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Appearance</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Choose your preferred theme</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button 
                      onClick={() => handleThemeChange('dark')}
                      disabled={themeFetcher.state !== 'idle'}
                      className={`p-4 rounded-lg transition-all duration-300 border-2 ${
                        theme === 'dark' 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                          : 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800'
                      } disabled:opacity-50`}
                    >
                      <div className="flex items-center justify-center mb-3">
                        <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-blue-100 dark:bg-blue-800/50' : 'bg-gray-200 dark:bg-gray-800'}`}>
                          <IoMoon size={20} className={theme === 'dark' ? 'text-blue-500 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'} />
                        </div>
                      </div>
                      <p className="font-medium text-gray-900 dark:text-white">Dark Mode</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Reduced light emission</p>
                      {theme === 'dark' && (
                        <div className="mt-2">
                          <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full">Active</span>
                        </div>
                      )}
                    </button>

                    <button 
                      onClick={() => handleThemeChange('light')}
                      disabled={themeFetcher.state !== 'idle'}
                      className={`p-4 rounded-lg transition-all duration-300 border-2 ${
                        theme === 'light' 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                          : 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800'
                      } disabled:opacity-50`}
                    >
                      <div className="flex items-center justify-center mb-3">
                        <div className={`p-2 rounded-lg ${theme === 'light' ? 'bg-amber-100 dark:bg-amber-800/50' : 'bg-gray-200 dark:bg-gray-800'}`}>
                          <IoSunny size={20} className={theme === 'light' ? 'text-amber-500 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'} />
                        </div>
                      </div>
                      <p className="font-medium text-gray-900 dark:text-white">Light Mode</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Enhanced visibility</p>
                      {theme === 'light' && (
                        <div className="mt-2">
                          <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full">Active</span>
                        </div>
                      )}
                    </button>
                  </div>
                </div>

                {/* Password Change Section */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Change Password</h3>
                  <div className="space-y-4">
                    <input
                      type="password"
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-black dark:text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 placeholder-gray-400 dark:placeholder-gray-500"
                      placeholder="Current password"
                      autoComplete="current-password"
                    />
                    <input
                      type="password"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-black dark:text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 placeholder-gray-400 dark:placeholder-gray-500"
                      placeholder="New password"
                      autoComplete="new-password"
                    />
                    <input
                      type="password"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-black dark:text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 placeholder-gray-400 dark:placeholder-gray-500"
                      placeholder="Confirm new password"
                      autoComplete="new-password"
                    />
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={handleUpdatePassword}
                        disabled={passwordFetcher.state !== 'idle'}
                        className="flex items-center gap-2 px-5 py-2.5 bg-black dark:bg-white hover:bg-black/80 dark:hover:bg-white/80 rounded-lg text-white dark:text-black font-medium transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {passwordFetcher.state !== 'idle' ? (
                          <div className="w-5 h-5 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <IoSave size={18} />
                        )}
                        <span>{passwordFetcher.state !== 'idle' ? 'Updating...' : 'Update Password'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'api-keys' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Model API Keys</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Connect your AI models with API keys</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {renderApiKeyInput('openai', 'sk-...')}
                    {renderApiKeyInput('claude', 'sk-ant-...')}
                    {renderApiKeyInput('gemini', 'AIza...')}
                    {renderApiKeyInput('llama', 'meta-llama-...')}
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-500/30 rounded-lg p-4 flex items-start gap-3 mt-6">
                    <IoCheckmarkCircle className="text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" size={20} />
                    <p className="text-sm text-blue-700 dark:text-blue-200/80">
                      Your API keys are securely stored and encrypted in the database. They are never shared with third parties.
                    </p>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={handleSaveApiKeys}
                      disabled={apiKeysFetcher.state !== 'idle'}
                      className="flex items-center gap-2 px-5 py-2.5 bg-black dark:bg-white hover:bg-black/80 dark:hover:bg-white/80 rounded-lg text-white dark:text-black font-medium transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {apiKeysFetcher.state !== 'idle' ? (
                        <div className="w-5 h-5 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <IoSave size={18} />
                      )}
                      <span>{apiKeysFetcher.state !== 'idle' ? 'Saving...' : 'Save API Keys'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettingPage;