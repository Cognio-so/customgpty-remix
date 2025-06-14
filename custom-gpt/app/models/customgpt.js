// CustomGPT model schema definition for Cloudflare Workers
// No mongoose dependency - using plain JavaScript objects

// CustomGPT schema definition for validation
export const customGptSchemaDefinition = {
    name: {
        type: "string",
        required: true,
        minLength: 2,
        maxLength: 100
    },
    description: {
        type: "string",
        required: true,
        minLength: 10,
        maxLength: 500
    },
    instructions: {
        type: "string",
        required: true,
        minLength: 10
    },
    conversationStarter: {
        type: "string",
        default: ""
    },
    model: {
        type: "string",
        default: "openrouter/auto"
    },
    capabilities: {
        type: "object",
        default: {
            webBrowsing: false
        }
    },
    imageUrl: {
        type: "string",
        default: ""
    },
    knowledgeBase: {
        type: "array",
        default: [],
        items: {
            fileName: {
                type: "string"
            },
            fileUrl: {
                type: "string"
            },
            uploadedAt: {
                type: "date",
                default: () => new Date()
            }
        }
    },
    folder: {
        type: "string",
        default: null
    },
    createdBy: {
        type: "objectId",
        required: true
    },
    assignedUsers: {
        type: "array",
        default: []
    },
    isActive: {
        type: "boolean",
        default: true
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
export const validateCustomGpt = (gptData) => {
    const errors = [];

    if (!gptData.name || gptData.name.length < 2) {
        errors.push("Name must be at least 2 characters long");
    }

    if (gptData.name && gptData.name.length > 100) {
        errors.push("Name must be less than 100 characters");
    }

    if (!gptData.description || gptData.description.length < 10) {
        errors.push("Description must be at least 10 characters long");
    }

    if (gptData.description && gptData.description.length > 500) {
        errors.push("Description must be less than 500 characters");
    }

    if (!gptData.instructions || gptData.instructions.length < 10) {
        errors.push("Instructions must be at least 10 characters long");
    }

    if (!gptData.createdBy) {
        errors.push("Created by user ID is required");
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

// Create CustomGPT document
export const createCustomGptDocument = (gptData) => {
    return {
        name: gptData.name?.trim(),
        description: gptData.description?.trim(),
        instructions: gptData.instructions,
        conversationStarter: gptData.conversationStarter || customGptSchemaDefinition.conversationStarter.default,
        model: gptData.model || customGptSchemaDefinition.model.default,
        capabilities: gptData.capabilities || customGptSchemaDefinition.capabilities.default,
        imageUrl: gptData.imageUrl || customGptSchemaDefinition.imageUrl.default,
        knowledgeBase: gptData.knowledgeBase || customGptSchemaDefinition.knowledgeBase.default,
        folder: gptData.folder || customGptSchemaDefinition.folder.default,
        createdBy: gptData.createdBy,
        assignedUsers: gptData.assignedUsers || customGptSchemaDefinition.assignedUsers.default,
        isActive: gptData.isActive !== undefined ? gptData.isActive : customGptSchemaDefinition.isActive.default,
        createdAt: new Date(),
        updatedAt: new Date()
    };
};

// Collection name constant
export const CUSTOMGPT_COLLECTION = 'customgpts';