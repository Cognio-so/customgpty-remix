import React, { useState, useEffect } from 'react';
import { FiX, FiBox, FiCheck, FiLoader, FiSearch } from 'react-icons/fi';
import { useFetcher } from '@remix-run/react';

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

interface AssignGptsMember {
    _id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
}

interface AssignGptsModalProps {
    member: AssignGptsMember;
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (memberIds: string[], gptIds: string[]) => void;
}

const AssignGptsModal: React.FC<AssignGptsModalProps> = ({
    member,
    isOpen,
    onClose,
    onSubmit
}) => {
    const gptsFetcher = useFetcher();
    const assignedFetcher = useFetcher();
    const [availableGpts, setAvailableGpts] = useState<Gpt[]>([]);
    const [selectedGpts, setSelectedGpts] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (isOpen) {
            // Fetch available GPTs
            gptsFetcher.load('/api/admin/gpts');
            // Fetch currently assigned GPTs
            assignedFetcher.load(`/api/assigned-gpts-count?userId=${member._id}`);
        }
    }, [isOpen, member._id]);

    useEffect(() => {
        if (gptsFetcher.data && typeof gptsFetcher.data === 'object' && 'gpts' in gptsFetcher.data) {
            setAvailableGpts((gptsFetcher.data as { gpts: Gpt[] }).gpts);
        }
    }, [gptsFetcher.data]);

    useEffect(() => {
        if (assignedFetcher.data && typeof assignedFetcher.data === 'object' && 'assignedGpts' in assignedFetcher.data) {
            const assignedGptIds = (assignedFetcher.data as { assignedGpts: Gpt[] }).assignedGpts.map(gpt => gpt._id);
            setSelectedGpts(assignedGptIds);
        }
    }, [assignedFetcher.data]);

    useEffect(() => {
        if (gptsFetcher.data && (assignedFetcher.data || assignedFetcher.state === 'idle')) {
            setLoading(false);
        }
    }, [gptsFetcher.data, assignedFetcher.data, assignedFetcher.state]);

    const filteredGpts = availableGpts.filter(gpt =>
        gpt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (gpt.description && gpt.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleGptToggle = (gptId: string) => {
        setSelectedGpts(prev => 
            prev.includes(gptId) 
                ? prev.filter(id => id !== gptId)
                : [...prev, gptId]
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit([member._id], selectedGpts);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Assign GPTs to {member.name}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        <FiX size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    <div className="mb-4">
                        <div className="relative">
                            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search GPTs..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <FiLoader className="animate-spin" size={24} />
                            <span className="ml-2 text-gray-600 dark:text-gray-400">Loading GPTs...</span>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {filteredGpts.length > 0 ? (
                                filteredGpts.map((gpt) => (
                                    <div
                                        key={gpt._id}
                                        className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                                        onClick={() => handleGptToggle(gpt._id)}
                                    >
                                        <div className="flex items-center flex-1">
                                            <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center mr-3">
                                                {gpt.imageUrl ? (
                                                    <img 
                                                        src={gpt.imageUrl} 
                                                        alt={gpt.name}
                                                        className="w-full h-full object-cover rounded-lg"
                                                    />
                                                ) : (
                                                    <FiBox className="text-gray-600 dark:text-gray-300" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-medium text-gray-900 dark:text-white">{gpt.name}</h4>
                                                {gpt.description && (
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                                        {gpt.description}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                                                        {gpt.model || 'openrouter/auto'}
                                                    </span>
                                                    {gpt.capabilities?.webBrowsing && (
                                                        <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                                                            Web Search
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                                selectedGpts.includes(gpt._id)
                                                    ? 'bg-blue-600 border-blue-600'
                                                    : 'border-gray-300 dark:border-gray-600'
                                            }`}>
                                                {selectedGpts.includes(gpt._id) && (
                                                    <FiCheck className="text-white" size={12} />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                                    {searchTerm ? 'No GPTs match your search' : 'No GPTs available'}
                                </p>
                            )}
                        </div>
                    )}

                    <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            {selectedGpts.length} GPT{selectedGpts.length !== 1 ? 's' : ''} selected
                        </div>
                        <div className="flex space-x-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                            >
                                Update Assignment{selectedGpts.length !== 1 ? 's' : ''}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AssignGptsModal; 