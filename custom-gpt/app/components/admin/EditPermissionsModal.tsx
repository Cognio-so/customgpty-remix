import React, { useState } from 'react';
import { FiX, FiUserCheck, FiUserX, FiShield } from 'react-icons/fi';
import { useFetcher } from '@remix-run/react';

interface EditPermissionsModalMember {
    _id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
}

interface EditPermissionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    member: EditPermissionsModalMember;
    onPermissionsUpdated: (updatedMember: EditPermissionsModalMember) => void;
}

const EditPermissionsModal: React.FC<EditPermissionsModalProps> = ({
    isOpen,
    onClose,
    member,
    onPermissionsUpdated
}) => {
    const fetcher = useFetcher();
    const [role, setRole] = useState(member.role);
    const [isActive, setIsActive] = useState(member.isActive);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const formData = new FormData();
        formData.append('intent', 'updatePermissions');
        formData.append('memberId', member._id);
        formData.append('role', role);
        formData.append('isActive', String(isActive));

        fetcher.submit(formData, { method: 'POST', action: '/admin/team' });
        
        // Optimistically update UI
        onPermissionsUpdated({
            ...member,
            role,
            isActive
        });
        
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Permissions</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        <FiX size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div>
                        <div className="mb-2 flex items-center">
                            <FiUserCheck className="mr-2 text-gray-500 dark:text-gray-400" size={18} />
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                User Information
                            </label>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{member.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{member.email}</p>
                        </div>
                    </div>

                    <div>
                        <div className="mb-2 flex items-center">
                            <FiShield className="mr-2 text-gray-500 dark:text-gray-400" size={18} />
                            <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Role
                            </label>
                        </div>
                        <select
                            id="role"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            disabled={isSubmitting}
                        >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                            <option value="moderator">Moderator</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {role === 'admin' ? 'Full system access' : role === 'moderator' ? 'Can manage content but not users' : 'Regular user access'}
                        </p>
                    </div>

                    <div>
                        <div className="mb-2 flex items-center">
                            <FiUserX className="mr-2 text-gray-500 dark:text-gray-400" size={18} />
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Account Status
                            </label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <label className="inline-flex items-center">
                                <input
                                    type="radio"
                                    className="form-radio text-blue-600"
                                    name="status"
                                    checked={isActive}
                                    onChange={() => setIsActive(true)}
                                    disabled={isSubmitting}
                                />
                                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Active</span>
                            </label>
                            <label className="inline-flex items-center">
                                <input
                                    type="radio"
                                    className="form-radio text-red-600"
                                    name="status"
                                    checked={!isActive}
                                    onChange={() => setIsActive(false)}
                                    disabled={isSubmitting}
                                />
                                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Inactive</span>
                            </label>
                        </div>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {isActive ? 'User can access the system' : 'User will be unable to log in'}
                        </p>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Updating...' : 'Update Permissions'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditPermissionsModal; 