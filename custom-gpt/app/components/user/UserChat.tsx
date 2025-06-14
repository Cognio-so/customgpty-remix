import React, { useState, useEffect, useRef } from 'react';
import { useLoaderData, useFetcher, useNavigate } from '@remix-run/react';
import UserMessageInput from './UserMessageInput';
import { IoPersonCircleOutline, IoSettingsOutline, IoPersonOutline, IoArrowBack, IoClose, IoAddCircleOutline } from 'react-icons/io5';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SiOpenai, SiGooglegemini } from 'react-icons/si';
import { FaRobot } from 'react-icons/fa6';
import { BiLogoMeta } from 'react-icons/bi';
import { RiOpenaiFill, RiSunFill, RiMoonFill } from 'react-icons/ri';
import { TbRouter } from 'react-icons/tb';
import { useTheme } from '~/contexts/ThemeContext';

// Define interfaces
interface User {
  _id?: string;
  name?: string;
  email: string;
  profilePic?: string;
  role?: string;
}

interface GptData {
  _id: string;
  name: string;
  description?: string;
  model?: string;
  instructions?: string;
  capabilities?: { webBrowsing?: boolean };
  knowledgeBase?: { fileName: string; fileUrl: string }[];
  imageUrl?: string;
  conversationStarter?: string;
}

interface Message {
  id: string | number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  files?: FileObject[];
  isStreaming?: boolean;
  isProgress?: boolean;
  isError?: boolean;
}

interface FileObject {
  name: string;
  size?: number;
  type?: string;
}

interface LoadingState {
  message: boolean;
}

const MarkdownStyles = () => (
  <style dangerouslySetInnerHTML={{
    __html: `
      .markdown-content {
          line-height: 1.6;
          width: 100%;
      }
      
      .markdown-content h1,
      .markdown-content h2,
      .markdown-content h3 {
          margin-top: 1.5em;
          margin-bottom: 0.5em;
      }
      
      .markdown-content h1:first-child,
      .markdown-content h2:first-child,
      .markdown-content h3:first-child {
          margin-top: 0;
      }
      
      .markdown-content code {
          font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      }
      
      .markdown-content pre {
          overflow-x: auto;
          border-radius: 0.375rem;
      }
      
      .markdown-content blockquote {
          font-style: italic;
          color: #6b7280;
      }
      
      .markdown-content a {
          text-decoration: none;
      }
      
      .markdown-content a:hover {
          text-decoration: underline;
      }
      
      .markdown-content table {
          border-collapse: collapse;
      }
      
      .markdown-content img {
          max-width: 100%;
          height: auto;
      }
      
      .markdown-content hr {
          border-top: 1px solid;
          margin: 1em 0;
      }
      
      .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
      }
      
      .hide-scrollbar::-webkit-scrollbar {
          display: none;
      }

      .typing-animation span {
          width: 5px;
          height: 5px;
          background-color: currentColor;
          border-radius: 50%;
          display: inline-block;
          margin: 0 1px;
          animation: typing 1.3s infinite ease-in-out;
      }

      .typing-animation span:nth-child(1) {
          animation-delay: 0s;
      }

      .typing-animation span:nth-child(2) {
          animation-delay: 0.2s;
      }

      .typing-animation span:nth-child(3) {
          animation-delay: 0.4s;
      }

      @keyframes typing {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
      }
  `}} />
);

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

const getDisplayModelName = (modelType: string): string => {
  if (modelType === 'openrouter/auto') return 'router-engine';
  return modelType;
};

const getFileIcon = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'pdf':
      return '📄';
    case 'doc':
    case 'docx':
      return '📝';
    case 'txt':
      return '📄';
    case 'md':
      return '📝';
    default:
      return '📎';
  }
};

const UserChat: React.FC = () => {
  const { gptData, user } = useLoaderData<{ gptData: GptData; user: User }>();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingMessage, setStreamingMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState<LoadingState>({ message: false });
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<FileObject[]>([]);
  const [webSearchEnabled, setWebSearchEnabled] = useState(gptData?.capabilities?.webBrowsing || false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  // Monitor system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // This ensures the theme is properly applied when the component mounts
    const htmlElement = document.documentElement;
    if (theme === 'dark') {
      htmlElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
    }
    
  }, [theme]);

  const handleChatSubmit = async (message: string, files?: FileObject[]) => {
    if (!message.trim() && (!files || files.length === 0)) return;

    const newUserMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: message,
      timestamp: new Date(),
      files: files || uploadedFiles
    };

    setMessages(prev => [...prev, newUserMessage]);
    setUploadedFiles([]);
    setLoading({ message: true });

    try {
      const chatData = {
        message: message,
        gptId: gptData._id,
        files: files || uploadedFiles,
        webSearch: webSearchEnabled,
        model: gptData.model,
        instructions: gptData.instructions
      };

      fetcher.submit(
        { ...chatData, intent: 'chat' as any } as any,
        { method: 'post', action: '/user/chat-api' }
      );

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Sorry, there was an error processing your message. Please try again.',
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading({ message: false });
    }
  };

  const handleFileUpload = (files: FileObject[]) => {
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const handleRemoveUploadedFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleNewChat = () => {
    setMessages([]);
    setStreamingMessage(null);
    setUploadedFiles([]);
  };

  const handleGoBack = () => {
    navigate('/user');
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const showWebSearchToggle = gptData?.capabilities?.webBrowsing || false;

  return (
    <>
      <MarkdownStyles />
      <div className={`flex flex-col h-screen ${theme === 'dark' ? 'dark' : ''} bg-white dark:bg-black text-black dark:text-white overflow-hidden`}>
        <div className="flex-shrink-0 bg-white dark:bg-black px-4 py-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleGoBack}
              className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center w-10 h-10"
              aria-label="Go back"
            >
              <IoArrowBack size={20} />
            </button>
            
            <button
              className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center w-10 h-10"
              aria-label="New Chat"
              onClick={handleNewChat}
            >
              <IoAddCircleOutline size={24} /> 
            </button>

            {gptData && (
              <div className="ml-2 text-sm md:text-base font-medium flex items-center">
                <span className="mr-2">{gptData.name}</span>
                {gptData.model && (
                  <div className="flex items-center ml-2 text-xs md:text-sm px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full">
                    {modelIcons[gptData.model] || <FaRobot size={16} />}
                    <span className="ml-1">{getDisplayModelName(gptData.model)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === 'dark' ? 
                <RiSunFill size={20} className="text-yellow-400" /> : 
                <RiMoonFill size={20} className="text-gray-700" />
              }
            </button>
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-300 dark:border-white/20 hover:border-blue-500 dark:hover:border-white/40 transition-colors"
              >
                {user?.profilePic ? (
                  <img
                    src={user.profilePic}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <IoPersonCircleOutline size={24} className="text-gray-500 dark:text-white" />
                  </div>
                )}
              </button>

              {isProfileOpen && (
                <div className="absolute top-12 right-0 w-64 bg-white dark:bg-[#1e1e1e] rounded-xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden z-30">
                  <div className="p-4 border-b border-gray-200 dark:border-white/10">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {user?.name || 'User'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {user?.email}
                    </p>
                  </div>
                  <div className="py-1">
                    <button className="w-full px-4 py-2.5 text-left flex items-center space-x-3 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300">
                      <IoPersonOutline size={18} />
                      <span>Profile</span>
                    </button>
                    <button 
                      className="w-full px-4 py-2.5 text-left flex items-center space-x-3 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300" 
                      onClick={() => navigate('/user/setting')}
                    >
                      <IoSettingsOutline size={18} />
                      <span>Settings</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col bg-white dark:bg-black hide-scrollbar">
          <div className="w-full max-w-3xl mx-auto flex-1 flex flex-col space-y-4 pb-4">
            {messages.length === 0 && !streamingMessage ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
                {gptData ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center mb-4 overflow-hidden">
                      {gptData.imageUrl ? (
                        <img src={gptData.imageUrl} alt={gptData.name} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <span className="text-2xl text-white">{gptData.name?.charAt(0) || '?'}</span>
                      )}
                    </div>
                    <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">{gptData.name}</h2>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md">{gptData.description}</p>
                    
                    {gptData.conversationStarter && (
                      <div
                        onClick={() => handleChatSubmit(gptData.conversationStarter || '')}
                        className="mt-5 max-w-xs p-3 bg-gray-100 dark:bg-gray-800/70 border border-gray-300 dark:border-gray-700/70 rounded-lg text-left cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-600/70 transition-colors"
                      >
                        <p className="text-gray-800 dark:text-white text-sm">
                          {gptData.conversationStarter.length > 40
                            ? gptData.conversationStarter.substring(0, 40) + '...'
                            : gptData.conversationStarter
                          }
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <h1 className='text-2xl sm:text-3xl md:text-4xl font-bold mb-2 text-gray-900 dark:text-white'>Welcome to AI Assistant</h1>
                    <span className='text-base sm:text-lg md:text-xl font-medium text-gray-500 dark:text-gray-400 mb-8 block'>How can I assist you today?</span>
                  </>
                )}
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`${message.role === 'user'
                        ? 'bg-black/10 dark:bg-white/80 text-black font-[16px] dark:text-black rounded-br-none max-w-max '
                        : 'assistant-message text-black font-[16px] dark:text-white rounded-bl-none w-full max-w-3xl'
                      } rounded-2xl px-4 py-2`}
                    >
                      {message.role === 'user' ? (
                        <>
                          <p className="whitespace-pre-wrap">{message.content}</p>
                          
                          {message.files && message.files.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {message.files.map((file: any, index: any) => (
                                <div
                                  key={`${file.name}-${index}`}
                                  className="flex items-center py-1 px-2 bg-gray-50 dark:bg-gray-800/50 rounded-md border border-gray-200 dark:border-gray-700/50 max-w-fit"
                                >
                                  <div className="mr-1.5 text-gray-500 dark:text-gray-400">
                                    {getFileIcon(file.name)}
                                  </div>
                                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-[140px]">
                                    {file.name}
                                  </span>
                                  {file.size && (
                                    <div className="text-[10px] text-gray-500 ml-1 whitespace-nowrap">
                                      {Math.round(file.size / 1024)} KB
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="markdown-content">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              h1: ({ node, ...props }) => <h1 className="text-xl font-bold my-3" {...props} />,
                              h2: ({ node, ...props }) => <h2 className="text-lg font-bold my-2" {...props} />,
                              h3: ({ node, ...props }) => <h3 className="text-md font-bold my-2" {...props} />,
                              h4: ({ node, ...props }) => <h4 className="font-bold my-2" {...props} />,
                              p: ({ node, ...props }) => <p className="my-2" {...props} />,
                              ul: ({ node, ...props }) => <ul className="list-disc pl-5 my-2" {...props} />,
                              ol: ({ node, ...props }) => <ol className="list-decimal pl-5 my-2" {...props} />,
                              li: ({ node, ...props }) => <li className="my-1" {...props} />,
                              a: ({ node, ...props }) => <a className="text-blue-400 hover:underline" {...props} />,
                              blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-gray-500 dark:border-gray-400 pl-4 my-3 italic" {...props} />,
                              code: ({ node, children, ...props }) => {
                                return true ? (
                                  <code className="bg-gray-300 dark:bg-gray-600 px-1 py-0.5 rounded text-sm" {...props}>
                                    {children}
                                  </code>
                                ) : (
                                  <code className="block bg-gray-100 dark:bg-gray-800 p-2 rounded text-sm overflow-x-auto" {...props}>
                                    {children}
                                  </code>
                                );
                              },
                              table: ({ node, ...props }) => (
                                <div className="overflow-x-auto my-3">
                                  <table className="min-w-full border border-gray-400 dark:border-gray-500" {...props} />
                                </div>
                              ),
                              thead: ({ node, ...props }) => <thead className="bg-gray-300 dark:bg-gray-600" {...props} />,
                              tbody: ({ node, ...props }) => <tbody className="divide-y divide-gray-400 dark:divide-gray-500" {...props} />,
                              tr: ({ node, ...props }) => <tr className="hover:bg-gray-300 dark:hover:bg-gray-600" {...props} />,
                              th: ({ node, ...props }) => <th className="px-4 py-2 text-left font-medium" {...props} />,
                              td: ({ node, ...props }) => <td className="px-4 py-2" {...props} />,
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      )}
                      <div className={`text-xs mt-2 text-right ${message.role === 'user' ? 'text-blue-50/80' : 'text-gray-400/80'}`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}

                {streamingMessage && (
                  <div className="flex justify-start">
                    <div className={`w-full max-w-3xl rounded-2xl px-4 py-2 assistant-message text-black dark:text-white rounded-bl-none`}>
                      <div className="markdown-content">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {streamingMessage.content}
                        </ReactMarkdown>

                        {streamingMessage.isStreaming && (
                          <div className="typing-animation mt-2 inline-flex items-center text-gray-400">
                            <span></span>
                            <span></span>
                            <span></span>
                          </div>
                        )}
                      </div>
                      <div className="text-xs mt-2 text-right text-gray-400/80">
                        {streamingMessage.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                )}

                {loading.message && !streamingMessage && (
                  <div className="flex justify-start items-end space-x-2">
                    <div className="w-full max-w-3xl rounded-2xl px-4 py-2 assistant-message text-black dark:text-white rounded-bl-none">
                      <div className="typing-animation inline-flex items-center text-gray-400">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 w-[95%] max-w-3xl mx-auto">
          {uploadedFiles.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {uploadedFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center py-1 px-2 bg-gray-50 dark:bg-gray-800/50 rounded-md border border-gray-200 dark:border-gray-700/50 max-w-fit"
                >
                  <div className="mr-1.5 text-gray-500 dark:text-gray-400">
                    {getFileIcon(file.name)}
                  </div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-[140px]">
                    {file.name}
                  </span>
                  <button
                    onClick={() => handleRemoveUploadedFile(index)}
                    className="ml-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-colors"
                    aria-label="Remove file"
                  >
                    <IoClose size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <UserMessageInput
            onSubmit={handleChatSubmit}
            onFileUpload={handleFileUpload as any}
            isLoading={loading.message}
            currentGptName={gptData?.name}
            webSearchEnabled={webSearchEnabled}
            setWebSearchEnabled={setWebSearchEnabled}
            showWebSearchIcon={showWebSearchToggle}
          />
        </div>

        {isProfileOpen && (
          <div
            className="fixed inset-0 z-20"
            onClick={() => setIsProfileOpen(false)}
          />
        )}
      </div>
    </>
  );
};

export default UserChat; 