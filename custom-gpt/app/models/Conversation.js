// Remove mongoose import and schema definitions
// Keep only the schema definitions and utility functions

// Conversation model schema definition for validation
export const conversationSchemaDefinition = {
    userId: {
        type: "objectId",
        required: true
    },
    gptId: {
        type: "objectId",
        required: true
    },
    gptName: {
        type: "string",
        required: true
    },
    messages: {
        type: "array",
        default: [],
        items: {
            role: {
                type: "string",
                enum: ['user', 'assistant'],
                required: true
            },
            content: {
                type: "string",
                required: true
            },
            timestamp: {
                type: "date",
                default: () => new Date()
            }
        }
    },
    lastMessage: {
        type: "string",
        default: ""
    },
    model: {
        type: "string",
        default: "openrouter/auto"
    },
    summary: {
        type: "string",
        default: ""
    },
    isActive: {
        type: "boolean",
        default: true
    },
    deletedAt: {
        type: "date",
        default: null
    },
    createdAt: {
        type: "date",
        default: () => new Date()
    },
    updatedAt: {
        type: "date",
        default: () => new Date()
    }
};

// Validation function
export const validateConversation = (conversationData) => {
    const errors = [];

    if (!conversationData.userId) {
        errors.push("User ID is required");
    }

    if (!conversationData.gptId) {
        errors.push("GPT ID is required");
    }

    if (!conversationData.gptName) {
        errors.push("GPT name is required");
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

// Validate message
export const validateMessage = (messageData) => {
    const errors = [];

    if (!messageData.role || !['user', 'assistant'].includes(messageData.role)) {
        errors.push("Message role must be either 'user' or 'assistant'");
    }

    if (!messageData.content || messageData.content.trim().length === 0) {
        errors.push("Message content is required");
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

// Create conversation document
export const createConversationDocument = (conversationData) => {
    return {
        userId: conversationData.userId,
        gptId: conversationData.gptId,
        gptName: conversationData.gptName,
        messages: conversationData.messages || conversationSchemaDefinition.messages.default,
        lastMessage: conversationData.lastMessage || conversationSchemaDefinition.lastMessage.default,
        model: conversationData.model || conversationSchemaDefinition.model.default,
        summary: conversationData.summary || conversationSchemaDefinition.summary.default,
        isActive: conversationData.isActive !== undefined ? conversationData.isActive : conversationSchemaDefinition.isActive.default,
        deletedAt: conversationData.deletedAt || conversationSchemaDefinition.deletedAt.default,
        createdAt: new Date(),
        updatedAt: new Date()
    };
};

// Create message document
export const createMessageDocument = (messageData) => {
    return {
        role: messageData.role,
        content: messageData.content,
        timestamp: messageData.timestamp || new Date()
    };
};

// Collection name constant
export const CONVERSATION_COLLECTION = 'conversations'; 