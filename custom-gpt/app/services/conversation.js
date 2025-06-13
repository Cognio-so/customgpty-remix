import { dbUtils } from "../lib/db.js";
import { ObjectId } from "mongodb";

export const getUserConversationHistory = async (env, userId) => {
    try {
        if (!userId) {
            throw new Error("User ID is required");
        }

        const conversations = await dbUtils.find(env, 'conversations',
            { 
                userId: new ObjectId(userId),
                isActive: true 
            },
            { sort: { updatedAt: -1 } }
        );

        // Populate GPT details for each conversation
        const conversationsWithGptDetails = await Promise.all(
            conversations.map(async (conversation) => {
                const gptDetails = await dbUtils.findOne(env, 'customgpts',
                    { _id: conversation.gptId },
                    { projection: { name: 1, model: 1, imageUrl: 1 } }
                );

                return {
                    ...conversation,
                    gptDetails
                };
            })
        );

        return conversationsWithGptDetails;
    } catch (error) {
        throw error;
    }
};

export const getConversationById = async (env, conversationId, userId) => {
    try {
        if (!conversationId || !userId) {
            throw new Error("Conversation ID and User ID are required");
        }

        const conversation = await dbUtils.findOne(env, 'conversations', {
            _id: new ObjectId(conversationId),
            userId: new ObjectId(userId),
            isActive: true
        });

        if (!conversation) {
            throw new Error("Conversation not found or access denied");
        }

        // Get GPT details
        const gptDetails = await dbUtils.findOne(env, 'customgpts',
            { _id: conversation.gptId },
            { projection: { name: 1, model: 1, imageUrl: 1, instructions: 1 } }
        );

        return {
            ...conversation,
            gptDetails
        };
    } catch (error) {
        throw error;
    }
};

export const createConversation = async (env, userId, gptId, initialMessage = null) => {
    try {
        if (!userId || !gptId) {
            throw new Error("User ID and GPT ID are required");
        }

        // Get GPT details
        const gptDetails = await dbUtils.findOne(env, 'customgpts', {
            _id: new ObjectId(gptId)
        });

        if (!gptDetails) {
            throw new Error("GPT not found");
        }

        const conversationData = {
            userId: new ObjectId(userId),
            gptId: new ObjectId(gptId),
            gptName: gptDetails.name,
            messages: initialMessage ? [initialMessage] : [],
            lastMessage: initialMessage ? initialMessage.content : "",
            model: gptDetails.model || "openrouter/auto",
            summary: "",
            isActive: true,
        };

        const result = await dbUtils.insertOne(env, 'conversations', conversationData);
        
        return {
            ...conversationData,
            _id: result.insertedId
        };
    } catch (error) {
        throw error;
    }
};

export const addMessageToConversation = async (env, conversationId, message) => {
    try {
        if (!conversationId || !message) {
            throw new Error("Conversation ID and message are required");
        }

        // Add timestamp to message if not present
        if (!message.timestamp) {
            message.timestamp = new Date();
        }

        const result = await dbUtils.updateOne(env, 'conversations',
            { _id: new ObjectId(conversationId) },
            {
                $push: { messages: message },
                $set: { 
                    lastMessage: message.content,
                    updatedAt: new Date()
                }
            }
        );

        if (result.matchedCount === 0) {
            throw new Error("Conversation not found");
        }

        // Return updated conversation
        const updatedConversation = await dbUtils.findOne(env, 'conversations', {
            _id: new ObjectId(conversationId)
        });

        return updatedConversation;
    } catch (error) {
        throw error;
    }
};

export const updateConversationSummary = async (env, conversationId, summary) => {
    try {
        if (!conversationId || !summary) {
            throw new Error("Conversation ID and summary are required");
        }

        const result = await dbUtils.updateOne(env, 'conversations',
            { _id: new ObjectId(conversationId) },
            { $set: { summary } }
        );

        if (result.matchedCount === 0) {
            throw new Error("Conversation not found");
        }

        return { success: true, message: "Summary updated successfully" };
    } catch (error) {
        throw error;
    }
};

export const deleteConversation = async (env, conversationId, userId) => {
    try {
        if (!conversationId || !userId) {
            throw new Error("Conversation ID and User ID are required");
        }

        // Soft delete - mark as inactive
        const result = await dbUtils.updateOne(env, 'conversations',
            { 
                _id: new ObjectId(conversationId),
                userId: new ObjectId(userId)
            },
            { 
                $set: { 
                    isActive: false,
                    deletedAt: new Date()
                }
            }
        );

        if (result.matchedCount === 0) {
            throw new Error("Conversation not found");
        }

        return { success: true, message: "Conversation deleted successfully" };
    } catch (error) {
        throw error;
    }
};

export const searchConversations = async (env, userId, searchTerm) => {
    try {
        if (!userId) {
            throw new Error("User ID is required");
        }

        const searchFilter = {
            userId: new ObjectId(userId),
            isActive: true
        };

        if (searchTerm) {
            searchFilter.$or = [
                { gptName: { $regex: searchTerm, $options: 'i' } },
                { summary: { $regex: searchTerm, $options: 'i' } },
                { lastMessage: { $regex: searchTerm, $options: 'i' } }
            ];
        }

        const conversations = await dbUtils.find(env, 'conversations',
            searchFilter,
            { sort: { updatedAt: -1 } }
        );

        return conversations;
    } catch (error) {
        throw error;
    }
};

export const getConversationsByGpt = async (env, userId, gptId) => {
    try {
        if (!userId || !gptId) {
            throw new Error("User ID and GPT ID are required");
        }

        const conversations = await dbUtils.find(env, 'conversations',
            {
                userId: new ObjectId(userId),
                gptId: new ObjectId(gptId),
                isActive: true
            },
            { sort: { updatedAt: -1 } }
        );

        return conversations;
    } catch (error) {
        throw error;
    }
};

// Get conversation statistics
export const getConversationStats = async (env, userId) => {
    try {
        if (!userId) {
            throw new Error("User ID is required");
        }

        const db = await dbUtils.getDatabase(env);
        
        const stats = await db.collection('conversations').aggregate([
            {
                $match: {
                    userId: new ObjectId(userId),
                    isActive: true
                }
            },
            {
                $group: {
                    _id: null,
                    totalConversations: { $sum: 1 },
                    totalMessages: { $sum: { $size: "$messages" } },
                    avgMessagesPerConversation: { $avg: { $size: "$messages" } }
                }
            }
        ]).toArray();

        return stats[0] || {
            totalConversations: 0,
            totalMessages: 0,
            avgMessagesPerConversation: 0
        };
    } catch (error) {
        throw error;
    }
}; 