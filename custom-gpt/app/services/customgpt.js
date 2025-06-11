import { CustomGpt } from "../models/Customgpt.js";
import connectDB from "../lib/db.js";

export const createCustomGpt = async (data, userId) => {
    await connectDB();
    
    try {
        const { name, description, instructions, conversationStarter, model, capabilities, imageUrl, knowledgeBase, folder } = data;

        // Validation
        if (!name || !description || !instructions) {
            throw new Error("Name, description, and instructions are required");
        }

        if (!userId) {
            throw new Error("User ID is required");
        }

        // Check if the custom gpt already exists for this user
        const existingCustomGpt = await CustomGpt.findOne({ name, createdBy: userId });
        if (existingCustomGpt) {
            throw new Error("Custom GPT with this name already exists");
        }

        // Create the custom gpt
        const newCustomGpt = await CustomGpt.create({
            name,
            description,
            instructions,
            conversationStarter: conversationStarter || "",
            model: model || "openrouter/auto",
            capabilities: capabilities || { webBrowsing: false },
            imageUrl: imageUrl || "",
            knowledgeBase: knowledgeBase || [],
            folder: folder || null,
            createdBy: userId,
            assignedUsers: [], // Initialize empty assigned users array
        });

        return newCustomGpt;
    } catch (error) {
        throw error;
    }
};

export const getAllCustomGpts = async (userId) => {
    await connectDB();
    
    try {
        if (!userId) {
            throw new Error("User ID is required");
        }

        const customGpts = await CustomGpt.find({ 
            createdBy: userId,
            isActive: true 
        }).sort({ createdAt: -1 });

        return customGpts;
    } catch (error) {
        throw error;
    }
};

// Get GPTs assigned to a specific user
export const getAssignedGpts = async (userId) => {
    await connectDB();
    
    try {
        if (!userId) {
            throw new Error("User ID is required");
        }

        // Add additional validation to prevent casting "undefined" string
        if (userId === 'undefined' || userId === 'null') {
            throw new Error("Invalid User ID provided");
        }

        const assignedGpts = await CustomGpt.find({ 
            assignedUsers: userId,
            isActive: true 
        }).sort({ createdAt: -1 });

        return assignedGpts;
    } catch (error) {
        throw error;
    }
};

export const getCustomGptById = async (id, userId) => {
    await connectDB();
    
    try {
        if (!id || !userId) {
            throw new Error("ID and User ID are required");
        }

        // Allow access if user created the GPT or if it's assigned to them
        const customGpt = await CustomGpt.findOne({ 
            _id: id, 
            $or: [
                { createdBy: userId },
                { assignedUsers: userId }
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

export const updateCustomGpt = async (id, data, userId) => {
    await connectDB();
    
    try {
        if (!id || !userId) {
            throw new Error("ID and User ID are required");
        }

        const customGpt = await CustomGpt.findOne({ _id: id, createdBy: userId });
        if (!customGpt) {
            throw new Error("Custom GPT not found");
        }

        const updatedCustomGpt = await CustomGpt.findByIdAndUpdate(
            id,
            { ...data, updatedAt: new Date() },
            { new: true }
        );

        return updatedCustomGpt;
    } catch (error) {
        throw error;
    }
};

export const deleteCustomGpt = async (id, userId) => {
    await connectDB();
    
    try {
        if (!id || !userId) {
            throw new Error("ID and User ID are required");
        }

        const customGpt = await CustomGpt.findOne({ _id: id, createdBy: userId });
        if (!customGpt) {
            throw new Error("Custom GPT not found");
        }

        await CustomGpt.findByIdAndDelete(id);

        return { message: "Custom GPT deleted successfully" };

    } catch (error) {
        throw error;
    }
};

// Assign GPTs to users
export const assignGptsToUser = async (userId, gptIds, adminId) => {
    await connectDB();
    
    try {
        if (!userId || !gptIds || !adminId) {
            throw new Error("User ID, GPT IDs, and Admin ID are required");
        }

        if (!Array.isArray(gptIds)) {
            throw new Error("GPT IDs must be an array");
        }

        // Verify all GPTs exist and are created by the admin
        const gpts = await CustomGpt.find({ 
            _id: { $in: gptIds }, 
            createdBy: adminId,
            isActive: true 
        });

        if (gpts.length !== gptIds.length) {
            throw new Error("Some GPTs not found or access denied");
        }

        // Add user to assignedUsers array for each GPT
        const updateResult = await CustomGpt.updateMany(
            { 
                _id: { $in: gptIds },
                createdBy: adminId,
                isActive: true
            },
            { 
                $addToSet: { assignedUsers: userId },
                updatedAt: new Date()
            }
        );

        return { 
            message: `Successfully assigned ${updateResult.modifiedCount} GPTs to user`,
            assignedCount: updateResult.modifiedCount
        };
    } catch (error) {
        throw error;
    }
};

// Remove GPT assignments from user
export const removeGptsFromUser = async (userId, gptIds, adminId) => {
    await connectDB();
    
    try {
        if (!userId || !gptIds || !adminId) {
            throw new Error("User ID, GPT IDs, and Admin ID are required");
        }

        if (!Array.isArray(gptIds)) {
            throw new Error("GPT IDs must be an array");
        }

        // Remove user from assignedUsers array for each GPT
        const updateResult = await CustomGpt.updateMany(
            { 
                _id: { $in: gptIds },
                createdBy: adminId,
                isActive: true
            },
            { 
                $pull: { assignedUsers: userId },
                updatedAt: new Date()
            }
        );

        return { 
            message: `Successfully removed ${updateResult.modifiedCount} GPT assignments from user`,
            removedCount: updateResult.modifiedCount
        };
    } catch (error) {
        throw error;
    }
};

// Get all GPTs with assignment info for a specific admin
export const getGptsWithAssignments = async (adminId) => {
    await connectDB();
    
    try {
        if (!adminId) {
            throw new Error("Admin ID is required");
        }

        const gpts = await CustomGpt.find({ 
            createdBy: adminId,
            isActive: true 
        })
        .populate('assignedUsers', 'name email')
        .sort({ createdAt: -1 });

        return gpts;
    } catch (error) {
        throw error;
    }
};

// Get GPTs assigned to a specific user with additional details
export const getUserAssignedGptsDetails = async (userId) => {
    await connectDB();
    
    try {
        if (!userId) {
            throw new Error("User ID is required");
        }

        const assignedGpts = await CustomGpt.find({ 
            assignedUsers: userId,
            isActive: true 
        })
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 });

        return assignedGpts;
    } catch (error) {
        throw error;
    }
}; 