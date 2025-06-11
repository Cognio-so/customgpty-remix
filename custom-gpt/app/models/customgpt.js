import mongoose from "mongoose";

const customGptSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        required: true,
        trim: true,
    },
    instructions: {
        type: String,
        required: true,
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
}, {
    timestamps: true,
});

export const CustomGpt = mongoose.model("CustomGpt", customGptSchema);