import React from 'react';
import { FiX, FiUser, FiMail, FiCalendar, FiUserCheck, FiActivity, FiBox } from 'react-icons/fi';

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

interface TeamMemberDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    member: TeamMember;
}

const TeamMemberDetailsModal: React.FC<TeamMemberDetailsModalProps> = ({
    isOpen,
    onClose,
    member
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Member Details</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        <FiX size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Profile Section */}
                    <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                            <FiUser className="text-gray-600 dark:text-gray-300" size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{member.name}</h3>
                            <p className="text-gray-500 dark:text-gray-400">{member.email}</p>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                                member.status === 'Active'
                                    ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300'
                                    : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300'
                            }`}>
                                {member.status}
                            </span>
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center space-x-3">
                                <FiUserCheck className="text-gray-400 dark:text-gray-500" size={18} />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Role</span>
                            </div>
                            <span className="text-sm text-gray-900 dark:text-white">{member.role}</span>
                        </div>

                        <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center space-x-3">
                                <FiUser className="text-gray-400 dark:text-gray-500" size={18} />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Department</span>
                            </div>
                            <span className="text-sm text-gray-900 dark:text-white">{member.department}</span>
                        </div>

                        <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center space-x-3">
                                <FiBox className="text-gray-400 dark:text-gray-500" size={18} />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Assigned GPTs</span>
                            </div>
                            <span className="text-sm text-gray-900 dark:text-white">{member.assignedGPTs}</span>
                        </div>

                        <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center space-x-3">
                                <FiCalendar className="text-gray-400 dark:text-gray-500" size={18} />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Joined</span>
                            </div>
                            <span className="text-sm text-gray-900 dark:text-white">{member.joined}</span>
                        </div>

                        <div className="flex items-center justify-between py-3">
                            <div className="flex items-center space-x-3">
                                <FiActivity className="text-gray-400 dark:text-gray-500" size={18} />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Last Active</span>
                            </div>
                            <span className="text-sm text-gray-900 dark:text-white">{member.lastActive}</span>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
                    <div className="flex justify-end space-x-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors"
                        >
                            Close
                        </button>
                        <button
                            onClick={() => {
                                if (typeof window !== 'undefined') {
                                    window.location.href = `mailto:${member.email}`;
                                }
                            }}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center space-x-2"
                        >
                            <FiMail size={16} />
                            <span>Send Email</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeamMemberDetailsModal; 