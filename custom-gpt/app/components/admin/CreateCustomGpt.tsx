import { useState, useRef, useEffect } from 'react';
import { IoAddOutline, IoCloseOutline, IoPersonCircleOutline, IoInformationCircleOutline, IoSearchOutline, IoSparklesOutline, IoArrowBackOutline } from 'react-icons/io5';
import { FaBox, FaUpload, FaGlobe, FaChevronDown, FaTrash } from 'react-icons/fa';
import { LuBrain } from 'react-icons/lu';
import { SiOpenai, SiGooglegemini } from 'react-icons/si';
import { BiLogoMeta } from 'react-icons/bi';
import { FaRobot } from 'react-icons/fa6';
import { RiOpenaiFill } from 'react-icons/ri';
import { TbRouter } from 'react-icons/tb';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Form } from '@remix-run/react';
import type { ComponentType } from 'react';

interface CreateCustomGptProps {
  onGoBack: () => void;
  editGptId?: string | null;
  onGptCreated: () => void;
  onSubmit: (formData: FormData) => void;
  actionData?: any;
  isSubmitting?: boolean;
  initialData?: any;
}

// Fix the CodeProps interface to be compatible with react-markdown
interface CodeComponentProps {
  inline?: boolean;
  children?: React.ReactNode;
  className?: string;
  [key: string]: any;
}

const CreateCustomGpt = ({
  onGoBack,
  editGptId = null,
  onGptCreated,
  onSubmit,
  actionData,
  isSubmitting = false,
  initialData
}: CreateCustomGptProps) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    instructions: initialData?.instructions || '',
    conversationStarter: initialData?.conversationStarter || '',
    model: initialData?.model || 'openrouter/auto',
    webBrowsing: initialData?.capabilities?.webBrowsing || false,
    imageUrl: initialData?.imageUrl || '',
    folder: initialData?.folder || '',
  });

  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(initialData?.imageUrl || '');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false);
  
  const modelIcons = {
    'openrouter/auto': <TbRouter className="text-yellow-500 mr-2" size={18} />,
    'GPT-4o': <RiOpenaiFill className="text-green-500 mr-2" size={18} />,
    'GPT-4o-mini': <SiOpenai className="text-green-400 mr-2" size={16} />,
    'Gemini-flash-2.5': <SiGooglegemini className="text-blue-400 mr-2" size={16} />,
    'Gemini-pro-2.5': <SiGooglegemini className="text-blue-600 mr-2" size={16} />,
    'Claude 3.5 Haiku': <FaRobot className="text-purple-400 mr-2" size={16} />,
    'llama3-8b-8192': <BiLogoMeta className="text-blue-500 mr-2" size={18} />,
    'Llama 4 Scout': <BiLogoMeta className="text-blue-700 mr-2" size={18} />,
  };

  const promptTemplates = [
    {
      name: "Coding Expert",
      description: "Expert programmer template",
      content: "You are an expert programmer and software engineer. Help users with coding problems, debug issues, and provide best practices for various programming languages and frameworks."
    },
    {
      name: "Creative Writer",
      description: "Creative writing assistant template",
      content: "You are a creative writing assistant. Help users craft compelling stories, develop characters, improve their writing style, and provide feedback on their creative work."
    },
    {
      name: "Marketing Assistant",
      description: "Marketing assistant template",
      content: "You are a marketing expert. Help users create marketing strategies, write compelling copy, analyze market trends, and develop effective campaigns for their business."
    },
  ];

  // Handle profile image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);

      // Create a preview URL for the image
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);

      // Update the formData
      handleInputChange('imageUrl', previewUrl);
    }
  };

  // Handle files selection for knowledge base
  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...filesArray]);
    }
  };

  // Remove a file from the selected files
  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTemplateSelect = (template: typeof promptTemplates[0]) => {
    handleInputChange('instructions', template.content);
    setShowTemplates(false);
  };

  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      if (imagePreview && !initialData?.imageUrl) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview, initialData]);

  const renderSystemPromptSection = () => (
    <div className="border border-gray-400 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="p-3 md:p-4 border-b border-gray-400 dark:border-gray-700">
            <div className="flex items-center mb-1 md:mb-2">
                <LuBrain className="text-purple-500 dark:text-purple-400 mr-2" size={16} />
                <h3 className="text-sm md:text-base font-medium text-gray-800 dark:text-gray-100">Model Instructions</h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
                Set instructions for how your GPT should behave and respond.
                <span className="ml-1 italic">Supports Markdown formatting.</span>
            </p>
        </div>

        <div className="p-3 md:p-4">
            <div className="flex justify-between items-center mb-2 md:mb-3">
                <label className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-300">System Prompt</label>
                <div className="flex space-x-2">
                    <button
              type="button"
                        onClick={() => handleTemplateSelect(promptTemplates[0])}
                        className="flex items-center text-xs text-white px-2 py-1 rounded-md bg-purple-600 hover:bg-purple-700"
                    >
                        <IoSparklesOutline className="mr-1" size={14} />
                        Generate
                    </button>
                    <button
              type="button"
              onClick={() => setShowTemplates(!showTemplates)}
                        className="flex items-center text-xs text-gray-700 dark:text-gray-300 px-2 py-1 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                        <IoSearchOutline className="mr-1" size={14} />
                        Templates
                    </button>
                </div>
            </div>

        {/* Template Dropdown */}
        {showTemplates && (
                <div className="relative mb-2 md:mb-3">
                    <div className="absolute z-10 mt-1 w-full bg-white dark:bg-[#262626] border border-gray-400 dark:border-gray-700 rounded-md shadow-lg max-h-48 overflow-y-auto no-scrollbar">
                        <ul>
                {promptTemplates.map((template) => (
                  <li key={template.name}>
                                    <button
                      type="button"
                      onClick={() => handleTemplateSelect(template)}
                                        className="w-full text-left px-3 py-2 text-xs md:text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                      <div className="font-medium">{template.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{template.description}</div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* Edit/Preview Toggle */}
            <div className="flex rounded-t-md overflow-hidden mb-0 bg-gray-300 dark:bg-gray-800">
                <button
            type="button"
            onClick={() => setIsPreviewMode(false)}
            className={`flex-1 py-1.5 text-xs md:text-sm font-medium ${
              !isPreviewMode 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-400 dark:bg-gray-600 text-gray-900 dark:text-white'
            }`}
                >
                    Edit
                </button>
                <button
            type="button"
            onClick={() => setIsPreviewMode(true)}
            className={`flex-1 py-1.5 text-xs md:text-sm font-medium ${
              isPreviewMode 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-400 dark:bg-gray-600 text-gray-900 dark:text-white'
            }`}
                >
                    Preview
                </button>
            </div>

        {/* Instructions Input/Preview */}
                <div className="w-full bg-white dark:bg-[#262626] border border-gray-400 dark:border-gray-700 border-t-0 rounded-b-md px-3 py-2 text-xs md:text-sm text-gray-900 dark:text-white min-h-[120px] md:min-h-[200px] overflow-y-auto no-scrollbar">
          {isPreviewMode ? (
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                p: (props) => <p className="mb-3 text-gray-900 dark:text-white" {...props} />,
                h1: (props) => <h1 className="text-xl font-bold mb-2 mt-3 text-gray-900 dark:text-white" {...props} />,
                h2: (props) => <h2 className="text-lg font-semibold mb-2 mt-3 text-gray-900 dark:text-white" {...props} />,
                h3: (props) => <h3 className="text-base font-medium mb-2 mt-2 text-gray-900 dark:text-white" {...props} />,
                ul: (props) => <ul className="list-disc pl-5 mb-3 text-gray-900 dark:text-white" {...props} />,
                ol: (props) => <ol className="list-decimal pl-5 mb-3 text-gray-900 dark:text-white" {...props} />,
                li: (props) => <li className="mb-1 text-gray-900 dark:text-white" {...props} />,
                code: ({ inline, children, ...props }: CodeComponentProps) =>
                  inline ? (
                    <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-gray-900 dark:text-white font-mono text-sm" {...props}>
                      {children}
                    </code>
                  ) : (
                    <code className="block bg-gray-100 dark:bg-gray-800 p-2 rounded text-gray-900 dark:text-white font-mono text-sm overflow-x-auto" {...props}>
                      {children}
                    </code>
                  ),
                pre: (props) => <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md mb-3 overflow-x-auto" {...props} />,
                blockquote: (props) => <blockquote className="border-l-4 border-gray-300 dark:border-gray-700 pl-3 italic my-2" {...props} />,
                a: (props) => <a className="text-blue-600 dark:text-blue-400 hover:underline" {...props} />,
              }}
            >
              {formData.instructions || "Enter instructions to see preview..."}
                    </ReactMarkdown>
          ) : (
            <textarea
              name="instructions"
              value={formData.instructions}
              onChange={(e) => handleInputChange('instructions', e.target.value)}
              className="w-full h-full bg-transparent border-none outline-none resize-none font-mono"
              placeholder="Enter detailed instructions for your AI agent..."
              style={{ minHeight: '200px' }}
              required
            />
                )}
              </div>

        {/* Markdown Helper Buttons */}
        {!isPreviewMode && (
          <div className="mt-2 flex flex-wrap gap-1">
            <button 
              type="button" 
              onClick={() => {
                const textarea = document.querySelector('textarea[name="instructions"]') as HTMLTextAreaElement;
                if (textarea) {
                  const start = textarea.selectionStart;
                  const end = textarea.selectionEnd;
                  const selection = textarea.value.substring(start, end);
                  const newText = textarea.value.substring(0, start) + `**${selection || 'bold text'}**` + textarea.value.substring(end);
                  handleInputChange('instructions', newText);
                  setTimeout(() => {
                    textarea.focus();
                    textarea.selectionStart = start + 2;
                    textarea.selectionEnd = start + (selection ? selection.length + 2 : 9);
                  }, 0);
                }
              }}
              className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600" 
              title="Bold"
            >
              <strong>B</strong>
            </button>
            <button 
              type="button"
              onClick={() => {
                const textarea = document.querySelector('textarea[name="instructions"]') as HTMLTextAreaElement;
                if (textarea) {
                  const start = textarea.selectionStart;
                  const end = textarea.selectionEnd;
                  const selection = textarea.value.substring(start, end);
                  const newText = textarea.value.substring(0, start) + `*${selection || 'italic text'}*` + textarea.value.substring(end);
                  handleInputChange('instructions', newText);
                  setTimeout(() => {
                    textarea.focus();
                    textarea.selectionStart = start + 1;
                    textarea.selectionEnd = start + (selection ? selection.length + 1 : 11);
                  }, 0);
                }
              }}
              className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600" 
              title="Italic"
            >
              <em>I</em>
            </button>
            <button 
              type="button"
              onClick={() => {
                const textarea = document.querySelector('textarea[name="instructions"]') as HTMLTextAreaElement;
                if (textarea) {
                  const start = textarea.selectionStart;
                  const end = textarea.selectionEnd;
                  const selection = textarea.value.substring(start, end);
                  const newText = textarea.value.substring(0, start) + `\n## ${selection || 'Heading'}\n` + textarea.value.substring(end);
                  handleInputChange('instructions', newText);
                  setTimeout(() => {
                    textarea.focus();
                    textarea.selectionStart = start + 4;
                    textarea.selectionEnd = start + (selection ? selection.length + 4 : 11);
                  }, 0);
                }
              }}
              className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600" 
              title="Heading"
            >
              H
            </button>
            <button 
              type="button"
              onClick={() => {
                const textarea = document.querySelector('textarea[name="instructions"]') as HTMLTextAreaElement;
                if (textarea) {
                  const start = textarea.selectionStart;
                  const end = textarea.selectionEnd;
                  const selection = textarea.value.substring(start, end);
                  const newText = textarea.value.substring(0, start) + `\n- ${selection || 'List item'}\n` + textarea.value.substring(end);
                  handleInputChange('instructions', newText);
                  setTimeout(() => {
                    textarea.focus();
                    textarea.selectionStart = start + 3;
                    textarea.selectionEnd = start + (selection ? selection.length + 3 : 12);
                  }, 0);
                }
              }}
              className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600" 
              title="List"
            >
              • List
            </button>
            <button 
              type="button"
              onClick={() => {
                const textarea = document.querySelector('textarea[name="instructions"]') as HTMLTextAreaElement;
                if (textarea) {
                  const start = textarea.selectionStart;
                  const end = textarea.selectionEnd;
                  const selection = textarea.value.substring(start, end);
                  const newText = textarea.value.substring(0, start) + `\n\`\`\`\n${selection || 'code block'}\n\`\`\`\n` + textarea.value.substring(end);
                  handleInputChange('instructions', newText);
                  setTimeout(() => {
                    textarea.focus();
                    textarea.selectionStart = start + 4;
                    textarea.selectionEnd = start + (selection ? selection.length + 4 : 14);
                  }, 0);
                }
              }}
              className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600" 
              title="Code Block"
            >
              {'</>'}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col bg-gray-100 dark:bg-[#1A1A1A] text-gray-900 dark:text-white">
      <Form ref={formRef} method="post" encType="multipart/form-data" className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Right Side - Preview */}
        <div className="w-full md:w-1/2 h-1/2 md:h-full bg-gray-200 dark:bg-[#2A2A2A] flex flex-col">
          <div className="p-4 md:p-6 flex flex-col flex-1">
            <div className="mb-3 md:mb-4 flex justify-between items-center">
              <h2 className="text-base md:text-xl font-bold text-gray-900 dark:text-white">Preview</h2>
              <button type="button" className="flex items-center text-xs md:text-sm text-gray-600 dark:text-gray-300 px-2 md:px-3 py-1 rounded-md bg-gray-300 dark:bg-gray-800 hover:bg-gray-400 dark:hover:bg-gray-700">
                <IoInformationCircleOutline className="mr-1" size={14} />
                View Details
              </button>
            </div>

            {/* UserDashboard Preview */}
            <div className="flex-1 flex flex-col bg-white dark:bg-black rounded-lg overflow-hidden relative">
              {/* Mock Header with Profile Icon */}
              <div className="absolute top-2 md:top-4 right-2 md:right-4">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden border-2 border-white/20 dark:border-white/20">
                  <div className="w-full h-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
                    <IoPersonCircleOutline size={20} className="text-gray-800 dark:text-white" />
                  </div>
                </div>
              </div>

              {/* Preview Content */}
              <div className="flex-1 flex flex-col p-4 md:p-6 items-center justify-center">
                <div className="text-center mb-2 md:mb-4">
                  <div className="flex justify-center mb-2 md:mb-4">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                      {imagePreview ? (
                        <img src={imagePreview} alt="GPT" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <FaBox size={20} className="text-gray-500 dark:text-gray-600" />
                      )}
                    </div>
                  </div>
                  <h1 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
                    {formData.name || "Welcome to AI Agent"}
                  </h1>
                  <span className="text-sm md:text-base font-medium mt-1 md:mt-2 block text-gray-600 dark:text-gray-300">
                    {formData.description || "How can I assist you today?"}
                  </span>
                </div>

                {/* Conversation Starter */}
                {formData.conversationStarter && (
                  <div className="w-full max-w-xs md:max-w-md mx-auto mt-2 md:mt-4">
                    <div className="bg-white/80 dark:bg-white/[0.05] backdrop-blur-xl border border-gray-300 dark:border-white/20 shadow-[0_0_15px_rgba(204,43,94,0.2)] rounded-xl p-2 md:p-3 text-left">
                      <p className="text-xs md:text-sm text-gray-700 dark:text-gray-300">{formData.conversationStarter}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-3 md:p-4 border-t border-gray-300 dark:border-gray-800">
                <div className="relative">
                  <input
                    type="text"
                    className="w-full bg-gray-100 dark:bg-[#1A1A1A] border border-gray-400 dark:border-gray-700 rounded-lg px-3 md:px-4 py-2 md:py-3 pr-8 md:pr-10 text-gray-900 dark:text-white focus:outline-none text-sm placeholder-gray-500 dark:placeholder-gray-500"
                    placeholder="Ask anything"
                    disabled
                  />
                  <button type="button" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-500">
                    <IoAddOutline size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Left Side - Configuration Panel */}
        <div className="w-full md:w-1/2 h-1/2 md:h-full border-r border-gray-300 dark:border-gray-800 overflow-y-auto p-4 md:p-6 no-scrollbar">
          <div className="mb-4 md:mb-6 flex items-center">
            <button
              type="button"
              onClick={onGoBack}
              className="mr-3 md:mr-4 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Back to Dashboard"
            >
              <IoArrowBackOutline size={20} className="text-gray-700 dark:text-gray-300" />
            </button>
            <div>
              <h1 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
                {editGptId ? 'Edit Custom GPT' : 'Custom GPT Builder'}
              </h1>
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Configure your GPT on the left, test it on the right</p>
            </div>
          </div>

          {/* Error/Success Messages */}
          {actionData?.error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-600 dark:text-red-400">{actionData.error}</p>
            </div>
          )}

          {/* Hidden form fields */}
          <input type="hidden" name="intent" value={editGptId ? 'update' : 'create'} />
          {editGptId && <input type="hidden" name="gptId" value={editGptId} />}

          {/* Image Upload */}
          <div className="flex justify-center mb-5 md:mb-8">
            <label
              className="relative cursor-pointer"
              onClick={() => imageInputRef.current?.click()}
            >
              <div className={`w-16 h-16 md:w-24 md:h-24 rounded-full border-2 border-dashed ${imagePreview ? 'border-transparent' : 'border-gray-400 dark:border-gray-600'} flex items-center justify-center hover:opacity-90 relative overflow-hidden`}>
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Profile" className="w-full h-full object-cover rounded-full" />
                    <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200">
                      <IoAddOutline size={24} className="text-white" />
                    </div>
                  </>
                ) : (
                  <IoAddOutline size={24} className="text-gray-500 dark:text-gray-500" />
                )}
              </div>
              <input
                ref={imageInputRef}
                type="file"
                name="profileImage"
                className="hidden"
                accept="image/*"
                onChange={handleImageSelect}
              />
            </label>
          </div>

          {/* Basic Configuration Section */}
          <div className="space-y-4">
            {/* Name Field */}
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full bg-white dark:bg-[#262626] border border-gray-400 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="My Custom GPT"
                required
              />
            </div>

            {/* Description Field */}
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Description *</label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full bg-white dark:bg-[#262626] border border-gray-400 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="A helpful assistant that can answer questions about various topics."
                required
              />
            </div>

            {/* Model Selection */}
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Model</label>
              <div className="relative">
                <select
                  name="model"
                  value={formData.model}
                  onChange={(e) => handleInputChange('model', e.target.value)}
                  className="w-full bg-white dark:bg-[#262626] border border-gray-400 dark:border-gray-700 rounded-md pl-10 pr-4 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
                >
                  <option value="openrouter/auto">Open-Engine ⭐preferred</option>
                  <option value="GPT-4o">GPT-4o</option>
                  <option value="GPT-4o-mini">GPT-4o-mini</option>
                  <option value="Gemini-flash-2.5">Gemini-flash-2.5</option>
                  <option value="Gemini-pro-2.5">Gemini-pro-2.5</option>
                  <option value="Claude 3.5 Haiku">Claude 3.5 Haiku</option>
                  <option value="llama3-8b-8192">llama3-8b-8192</option>
                  <option value="Llama 4 Scout">Llama 4 Scout</option>
                </select>
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  {modelIcons[formData.model as keyof typeof modelIcons]}
                </div>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <FaChevronDown className="text-gray-400 dark:text-gray-400" size={12} />
                </div>
              </div>
            </div>

            {/* System Prompt Section */}
            {renderSystemPromptSection()}

            {/* Web Browsing Capability */}
            <div className="flex items-center justify-between pt-2">
              <div>
                <div className="flex items-center">
                  <FaGlobe className="text-gray-500 dark:text-gray-400 mr-2" size={14} />
                  <label className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-300 cursor-pointer">Web Browsing</label>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Allow your GPT to search and browse the web</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="webBrowsing"
                  className="sr-only peer"
                  checked={formData.webBrowsing}
                  onChange={(e) => handleInputChange('webBrowsing', e.target.checked)}
                />
                <div className="w-9 h-5 md:w-11 md:h-6 bg-gray-300 dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-purple-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-4 after:w-4 md:after:h-5 md:after:w-5 after:transition-all"></div>
              </label>
            </div>

            {/* Conversation Starter */}
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Conversation Starter</label>
              <input
                type="text"
                name="conversationStarter"
                value={formData.conversationStarter}
                onChange={(e) => handleInputChange('conversationStarter', e.target.value)}
                className="w-full bg-white dark:bg-[#262626] border border-gray-400 dark:border-gray-700 rounded-md px-3 py-2 text-xs md:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="Add a conversation starter..."
              />
            </div>

            {/* Knowledge Section */}
            <div className="space-y-2 md:space-y-3">
              <label className="block text-xs md:text-sm font-medium text-gray-600 dark:text-gray-300">Knowledge</label>
              <div
                className="border-2 border-dashed border-gray-400 dark:border-gray-700 rounded-lg p-3 md:p-4 text-center cursor-pointer hover:border-blue-500"
                onClick={() => fileInputRef.current?.click()}
              >
                <FaUpload className="h-4 w-4 md:h-6 md:w-6 mx-auto mb-1 md:mb-2 text-gray-500 dark:text-gray-500" />
                <h3 className="font-medium text-xs md:text-sm text-gray-800 dark:text-white mb-1">Upload Files</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 md:mb-3">Upload PDFs, docs, or text files to give your GPT specific knowledge</p>
                <button type="button" className="px-3 md:px-4 py-1 md:py-1.5 text-xs md:text-sm bg-gray-200 dark:bg-[#262626] text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors">
                  Select Files
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.md"
                  onChange={handleFilesSelect}
                />
              </div>

              {/* Display selected files */}
              {selectedFiles.length > 0 && (
                <div className="mt-2 bg-white dark:bg-[#262626] border border-gray-400 dark:border-gray-700 rounded-md p-2">
                  <h4 className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">Selected Files ({selectedFiles.length})</h4>
                  <div className="max-h-32 overflow-y-auto">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between py-1 border-b border-gray-200 dark:border-gray-700 last:border-0">
                        <span className="text-xs text-gray-700 dark:text-gray-300 truncate max-w-[80%]">{file.name}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFile(index);
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <FaTrash size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-4 md:mt-6 pt-3 md:pt-4 border-t border-gray-400 dark:border-gray-700">
            <button
              type="submit"
              disabled={isSubmitting || !formData.name || !formData.description || !formData.instructions}
              className={`w-full px-4 py-2 md:py-3 rounded-md text-white text-sm md:text-base font-medium transition-colors shadow-lg ${isSubmitting || !formData.name || !formData.description || !formData.instructions
                  ? 'bg-gray-400 dark:bg-gray-500 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2'
                }`}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {editGptId ? 'Updating...' : 'Creating...'}
                </div>
              ) : (
                editGptId ? 'Update GPT' : 'Create GPT'
              )}
            </button>
          </div>
        </div>
      </Form>
    </div>
  );
};

export default CreateCustomGpt;