import connectDB from "../lib/db.js";
import { Conversation } from "../models/Conversation.js";

export const getUserConversationHistory = async (userId) => {
    await connectDB();
    
    try {
        if (!userId) {
            throw new Error("User ID is required");
        }

        const conversations = await Conversation.find({ 
            userId: userId,
            isActive: true 
        })
        .populate('gptId', 'name model imageUrl')
        .sort({ updatedAt: -1 });

        return conversations;
    } catch (error) {
        throw error;
    }
};

export const deleteUserConversation = async (userId, conversationId) => {
    await connectDB();
    
    try {
        if (!userId || !conversationId) {
            throw new Error("User ID and Conversation ID are required");
        }

        // Verify the conversation belongs to the user
        const conversation = await Conversation.findOne({
            _id: conversationId,
            userId: userId
        });

        if (!conversation) {
            throw new Error("Conversation not found or access denied");
        }

        // Soft delete by setting isActive to false
        await Conversation.findByIdAndUpdate(conversationId, {
            isActive: false,
            deletedAt: new Date()
        });

        return { success: true, message: "Conversation deleted successfully" };
    } catch (error) {
        throw error;
    }
};

export const createConversation = async (userId, gptId, initialMessage = null) => {
    await connectDB();
    
    try {
        if (!userId || !gptId) {
            throw new Error("User ID and GPT ID are required");
        }

        const conversationData = {
            userId,
            gptId,
            messages: initialMessage ? [initialMessage] : [],
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const newConversation = await Conversation.create(conversationData);
        return newConversation;
    } catch (error) {
        throw error;
    }
};

export const addMessageToConversation = async (conversationId, message) => {
    await connectDB();
    
    try {
        if (!conversationId || !message) {
            throw new Error("Conversation ID and message are required");
        }

        const updatedConversation = await Conversation.findByIdAndUpdate(
            conversationId,
            {
                $push: { messages: message },
                updatedAt: new Date(),
                lastMessage: message.content
            },
            { new: true }
        );

        if (!updatedConversation) {
            throw new Error("Conversation not found");
        }

        return updatedConversation;
    } catch (error) {
        throw error;
    }
}; 