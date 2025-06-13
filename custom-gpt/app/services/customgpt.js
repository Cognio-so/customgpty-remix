import { dbUtils } from "../lib/db.js";
import { ObjectId } from "mongodb";
import { uploadProfilePicture, uploadKnowledgeBaseFiles } from "./storage.js";

export const createCustomGpt = async (env, data, userId, files = {}) => {
    try {
        const { name, description, instructions, conversationStarter, model, capabilities, folder } = data;

        // Validation
        if (!name || !description || !instructions) {
            throw new Error("Name, description, and instructions are required");
        }

        if (!userId) {
            throw new Error("User ID is required");
        }

        // Check if the custom gpt already exists for this user
        const existingCustomGpt = await dbUtils.findOne(env, 'customgpts', { 
            name, 
            createdBy: new ObjectId(userId) 
        });
        
        if (existingCustomGpt) {
            throw new Error("Custom GPT with this name already exists");
        }

        // Generate temporary ID for file uploads
        const tempGptId = new ObjectId().toString();
        
        // Handle image upload
        let imageUrl = '';
        if (files.profileImage) {
            const imageUploadResult = await uploadProfilePicture(env, files.profileImage, tempGptId);
            if (imageUploadResult.success) {
                imageUrl = imageUploadResult.fileUrl;
            } else {
                throw new Error(`Image upload failed: ${imageUploadResult.error}`);
            }
        }

        // Handle knowledge base files upload
        let knowledgeBase = [];
        
        if (files.knowledgeFiles && files.knowledgeFiles.length > 0) {
            
            const knowledgeUploadResult = await uploadKnowledgeBaseFiles(env, files.knowledgeFiles, tempGptId);
            
            if (knowledgeUploadResult.success) {
                knowledgeBase = knowledgeUploadResult.files.map((file, index) => {
                    const processedFile = {
                        fileName: file.originalName || file.fileName,
                        fileUrl: file.fileUrl,
                        fileSize: file.size,
                        fileType: file.type,
                        uploadedAt: new Date()
                    };
                    return processedFile;
                });
            } else {
                throw new Error(`Knowledge base upload failed: ${knowledgeUploadResult.error}`);
            }
        } else {
        }

        // Create the custom gpt document
        const customGptDoc = {
            name,
            description,
            instructions,
            conversationStarter: conversationStarter || "",
            model: model || "openrouter/auto",
            capabilities: capabilities || { webBrowsing: false },
            imageUrl,
            knowledgeBase,
            folder: folder || null,
            createdBy: new ObjectId(userId),
            assignedUsers: [], // Initialize empty assigned users array
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await dbUtils.insertOne(env, 'customgpts', customGptDoc);
        
        return {
            ...customGptDoc,
            _id: result.insertedId
        };
    } catch (error) {   
        throw error;
    }
};

export const getAllCustomGpts = async (env, userId) => {
    try {
        if (!userId) {
            throw new Error("User ID is required");
        }

        const customGpts = await dbUtils.find(env, 'customgpts', 
            { 
                createdBy: new ObjectId(userId),
                isActive: true 
            },
            { sort: { createdAt: -1 } }
        );

        return customGpts;
    } catch (error) {
        throw error;
    }
};

// Get GPTs assigned to a specific user
export const getAssignedGpts = async (env, userId) => {
    try {
        if (!userId) {
            throw new Error("User ID is required");
        }

        // Add additional validation to prevent casting "undefined" string
        if (userId === 'undefined' || userId === 'null') {
            throw new Error("Invalid User ID provided");
        }

        const assignedGpts = await dbUtils.find(env, 'customgpts',
            { 
                assignedUsers: new ObjectId(userId),
                isActive: true 
            },
            { sort: { createdAt: -1 } }
        );

        return assignedGpts;
    } catch (error) {
        throw error;
    }
};

export const getCustomGptById = async (env, id, userId) => {
    try {
        if (!id || !userId) {
            throw new Error("ID and User ID are required");
        }

        const customGpt = await dbUtils.findOne(env, 'customgpts', {
            _id: new ObjectId(id),
            $or: [
                { createdBy: new ObjectId(userId) },
                { assignedUsers: new ObjectId(userId) }
            ],
            isActive: true
        });

        if (!customGpt) {
            throw new Error("Custom GPT not found or access denied");
        }

        return customGpt;
    } catch (error) {
        throw error;
    }
};

export const updateCustomGpt = async (env, id, data, userId, files = {}) => {
    try {
        if (!id || !userId) {
            throw new Error("ID and User ID are required");
        }

        // Check if user owns the GPT
        const customGpt = await dbUtils.findOne(env, 'customgpts', { 
            _id: new ObjectId(id), 
            createdBy: new ObjectId(userId) 
        });
        
        if (!customGpt) {
            throw new Error("Custom GPT not found");
        }

        // Prepare update data
        const updateData = { ...data };
        
        // Handle image upload if new image provided
        if (files.profileImage) {
            try {
                const imageUploadResult = await uploadProfilePicture(env, files.profileImage, id);
                if (imageUploadResult.success) {
                    updateData.imageUrl = imageUploadResult.fileUrl;
                } else {
                    throw new Error(`Image upload failed: ${imageUploadResult.error}`);
                }
            } catch (error) {
                throw new Error(`Image upload failed: ${error.message}`);
            }
        }

        // Handle knowledge base files upload if new files provided
        
        if (files.knowledgeFiles && files.knowledgeFiles.length > 0) {
            
            try {
                const knowledgeUploadResult = await uploadKnowledgeBaseFiles(env, files.knowledgeFiles, id);
                
                if (knowledgeUploadResult.success) {
                    const newKnowledgeFiles = knowledgeUploadResult.files.map((file, index) => {
                        const processedFile = {
                            fileName: file.originalName || file.fileName,
                            fileUrl: file.fileUrl,
                            fileSize: file.size,
                            fileType: file.type,
                            uploadedAt: new Date()
                        };
                        return processedFile;
                    });
                    
                    // Append to existing knowledge base
                    updateData.knowledgeBase = [
                        ...(customGpt.knowledgeBase || []),
                        ...newKnowledgeFiles
                    ];
                } else {
                    throw new Error(`Knowledge base upload failed: ${knowledgeUploadResult.error}`);
                }
            } catch (error) {
                throw new Error(`Knowledge base upload failed: ${error.message}`);
            }
        }

        // Add update timestamp
        updateData.updatedAt = new Date();

        const result = await dbUtils.updateOne(env, 'customgpts',
            { _id: new ObjectId(id) },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            throw new Error("Custom GPT not found");
        }

        // Return updated document
        const updatedCustomGpt = await dbUtils.findOne(env, 'customgpts', {
            _id: new ObjectId(id)
        });

        return updatedCustomGpt;
    } catch (error) {
        throw error;
    }
};

export const deleteCustomGpt = async (env, id, userId) => {
    try {
        if (!id || !userId) {
            throw new Error("ID and User ID are required");
        }

        // Soft delete - mark as inactive
        const result = await dbUtils.updateOne(env, 'customgpts',
            { 
                _id: new ObjectId(id), 
                createdBy: new ObjectId(userId) 
            },
            { $set: { isActive: false, updatedAt: new Date() } }
        );

        if (result.matchedCount === 0) {
            throw new Error("Custom GPT not found");
        }

        return { success: true, message: "Custom GPT deleted successfully" };
    } catch (error) {
        throw error;
    }
};

// Assign GPT to users
export const assignGptToUsers = async (env, gptId, userIds, adminId) => {
    try {
        if (!gptId || !userIds || !adminId) {
            throw new Error("GPT ID, user IDs, and admin ID are required");
        }

        // Verify the admin owns the GPT
        const gpt = await dbUtils.findOne(env, 'customgpts', {
            _id: new ObjectId(gptId),
            createdBy: new ObjectId(adminId)
        });

        if (!gpt) {
            throw new Error("GPT not found or access denied");
        }

        // Convert userIds to ObjectIds
        const objectIds = userIds.map(id => new ObjectId(id));

        const result = await dbUtils.updateOne(env, 'customgpts',
            { _id: new ObjectId(gptId) },
            { $addToSet: { assignedUsers: { $each: objectIds } } }
        );

        return { success: true, message: "GPT assigned successfully" };
    } catch (error) {
        throw error;
    }
};

// Remove GPT assignment from users
export const removeGptAssignment = async (env, gptId, userIds, adminId) => {
    try {
        if (!gptId || !userIds || !adminId) {
            throw new Error("GPT ID, user IDs, and admin ID are required");
        }

        // Verify the admin owns the GPT
        const gpt = await dbUtils.findOne(env, 'customgpts', {
            _id: new ObjectId(gptId),
            createdBy: new ObjectId(adminId)
        });

        if (!gpt) {
            throw new Error("GPT not found or access denied");
        }

        // Convert userIds to ObjectIds
        const objectIds = userIds.map(id => new ObjectId(id));

        const result = await dbUtils.updateOne(env, 'customgpts',
            { _id: new ObjectId(gptId) },
            { $pullAll: { assignedUsers: objectIds } }
        );

        return { success: true, message: "GPT assignment removed successfully" };
    } catch (error) {
        throw error;
    }
};

// Get all GPTs with assignment info for a specific admin
export const getGptsWithAssignments = async (env, adminId) => {
    try {
        if (!adminId) {
            throw new Error("Admin ID is required");
        }

        // Get GPTs created by admin
        const gpts = await dbUtils.find(env, 'customgpts', 
            { 
                createdBy: new ObjectId(adminId),
                isActive: true 
            },
            { sort: { createdAt: -1 } }
        );

        // For each GPT, get assigned user details
        const gptsWithAssignments = await Promise.all(
            gpts.map(async (gpt) => {
                const assignedUserDetails = [];
                
                if (gpt.assignedUsers && gpt.assignedUsers.length > 0) {
                    const users = await dbUtils.find(env, 'users',
                        { 
                            _id: { $in: gpt.assignedUsers },
                            isActive: true
                        },
                        { projection: { name: 1, email: 1 } }
                    );
                    assignedUserDetails.push(...users);
                }

                return {
                    ...gpt,
                    assignedUserDetails
                };
            })
        );

        return gptsWithAssignments;
    } catch (error) {
        throw error;
    }
};

// Get GPTs assigned to a specific user with additional details
export const getUserAssignedGptsDetails = async (env, userId) => {
    try {
        if (!userId) {
            throw new Error("User ID is required");
        }

        const assignedGpts = await dbUtils.find(env, 'customgpts',
            { 
                assignedUsers: new ObjectId(userId),
                isActive: true 
            },
            { sort: { createdAt: -1 } }
        );

        // For each GPT, get creator details
        const gptsWithCreatorDetails = await Promise.all(
            assignedGpts.map(async (gpt) => {
                const creator = await dbUtils.findOne(env, 'users',
                    { _id: gpt.createdBy },
                    { projection: { name: 1, email: 1 } }
                );

                return {
                    ...gpt,
                    createdByDetails: creator
                };
            })
        );

        return gptsWithCreatorDetails;
    } catch (error) {
        throw error;
    }
};

// Search GPTs
export const searchCustomGpts = async (env, userId, searchTerm, folder = null) => {
    try {
        if (!userId) {
            throw new Error("User ID is required");
        }

        const searchFilter = {
            $or: [
                { createdBy: new ObjectId(userId) },
                { assignedUsers: new ObjectId(userId) }
            ],
            isActive: true
        };

        // Add folder filter if provided
        if (folder && folder !== 'All Folders') {
            searchFilter.folder = folder;
        }

        // Add search term filter if provided
        if (searchTerm) {
            searchFilter.$and = [
                {
                    $or: [
                        { name: { $regex: searchTerm, $options: 'i' } },
                        { description: { $regex: searchTerm, $options: 'i' } }
                    ]
                }
            ];
        }

        const customGpts = await dbUtils.find(env, 'customgpts', 
            searchFilter,
            { sort: { createdAt: -1 } }
        );

        return customGpts;
    } catch (error) {
        throw error;
    }
};

export const assignGptsToUser = async (env, userId, gptIds, adminId) => {
    try {
        if (!userId || !gptIds || !adminId) {
            throw new Error("User ID, GPT IDs, and admin ID are required");
        }

        if (!Array.isArray(gptIds)) {
            throw new Error("GPT IDs must be an array");
        }

        // For each GPT, add the user to its assignedUsers array
        for (const gptId of gptIds) {
            // Verify the admin owns the GPT
            const gpt = await dbUtils.findOne(env, 'customgpts', {
                _id: new ObjectId(gptId),
                createdBy: new ObjectId(adminId)
            });

            if (!gpt) {
                throw new Error(`GPT ${gptId} not found or access denied`);
            }

            // Add user to assignedUsers array if not already present
            await dbUtils.updateOne(env, 'customgpts',
                { _id: new ObjectId(gptId) },
                { $addToSet: { assignedUsers: new ObjectId(userId) } }
            );
        }

        return {
            success: true,
            message: "GPTs assigned successfully"
        };
    } catch (error) {
        throw error;
    }
};

export const removeGptsFromUser = async (env, userId, gptIds, adminId) => {
    try {
        if (!userId || !gptIds || !adminId) {
            throw new Error("User ID, GPT IDs, and admin ID are required");
        }

        if (!Array.isArray(gptIds)) {
            throw new Error("GPT IDs must be an array");
        }

        // For each GPT, remove the user from its assignedUsers array
        for (const gptId of gptIds) {
            // Verify the admin owns the GPT
            const gpt = await dbUtils.findOne(env, 'customgpts', {
                _id: new ObjectId(gptId),
                createdBy: new ObjectId(adminId)
            });

            if (!gpt) {
                throw new Error(`GPT ${gptId} not found or access denied`);
            }

            // Remove user from assignedUsers array
            await dbUtils.updateOne(env, 'customgpts',
                { _id: new ObjectId(gptId) },
                { $pull: { assignedUsers: new ObjectId(userId) } }
            );
        }

        return {
            success: true,
            message: "GPT assignments removed successfully"
        };
    } catch (error) {
        throw error;
    }
}; 