import mongoose from "mongoose";

const customGptSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minLength: 2,
        maxLength: 100
    },
    description: {
        type: String,
        required: true,
        trim: true,
        minLength: 10,
        maxLength: 500
    },
    instructions: {
        type: String,
        required: true,
        minLength: 10
    },
    conversationStarter: {
        type: String,
        default: "",
    },
    model: {
        type: String,
        default: "openrouter/auto",
    },
    capabilities: {
        webBrowsing: {
            type: Boolean,
            default: false,
        },
    },
    imageUrl: {
        type: String,
        default: "",
    },
    knowledgeBase: [{
        fileName: String,
        fileUrl: String,
        uploadedAt: {
            type: Date,
            default: Date.now,
        },
    }],
    folder: {
        type: String,
        default: null,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    assignedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }],
    isActive: {
        type: Boolean,
        default: true,
    },
    createdAt: {
        type: Date,
        default: () => new Date()
    },
    updatedAt: {
        type: Date,
        default: () => new Date()
    }
}, {
    timestamps: true,
});

export const CustomGpt = mongoose.model("CustomGpt", customGptSchema);

// Validation function
export const validateCustomGpt = (gptData) => {
    const errors = [];

    if (!gptData.name || gptData.name.length < 2) {
        errors.push("Name must be at least 2 characters long");
    }

    if (!gptData.description || gptData.description.length < 10) {
        errors.push("Description must be at least 10 characters long");
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
        name: gptData.name,
        description: gptData.description,
        instructions: gptData.instructions,
        conversationStarter: gptData.conversationStarter || customGptSchema.conversationStarter.default,
        model: gptData.model || customGptSchema.model.default,
        capabilities: gptData.capabilities || customGptSchema.capabilities.default,
        imageUrl: gptData.imageUrl || customGptSchema.imageUrl.default,
        knowledgeBase: gptData.knowledgeBase || customGptSchema.knowledgeBase.default,
        folder: gptData.folder || customGptSchema.folder.default,
        createdBy: gptData.createdBy,
        assignedUsers: gptData.assignedUsers || customGptSchema.assignedUsers.default,
        isActive: gptData.isActive !== undefined ? gptData.isActive : customGptSchema.isActive.default,
        createdAt: new Date(),
        updatedAt: new Date()
    };
};