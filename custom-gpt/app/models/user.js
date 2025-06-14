// Mongoose models are not compatible with the serverless environment of Cloudflare Workers.
// Database operations should be performed using the dbUtils in /app/lib/db.js,
// which use the MongoDB Data API.
// export const User = mongoose.model("User", userSchema);

export const userSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true,
        minLength: 2,
        maxLength: 100
    },
    email: {
        type: String,
        required: true,
        unique: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    password: {
        type: String,
        required: true,
        minLength: 6
    },
    role: {
        type: String,
        enum: ["admin", "user"],
        default: "user"
    },
    isActive: {
        type: Boolean,
        default: true
    },
    apiKeys: {
        type: Object,
        default: {}
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    resetPasswordToken: {
        type: String,
        optional: true
    },
    resetPasswordExpiresAt: {
        type: Date,
        optional: true
    },
    verificationToken: {
        type: String,
        optional: true
    },
    verificationTokenExpiresAt: {
        type: Date,
        optional: true
    },
    profilePic: {
        type: String,
        default: ""
    },
    createdAt: {
        type: Date,
        default: () => new Date()
    },
    updatedAt: {
        type: Date,
        default: () => new Date()
    }
}, { timestamps: true });

// Validation function
export const validateUser = (userData) => {
    const errors = [];

    if (!userData.name || userData.name.length < 2) {
        errors.push("Name must be at least 2 characters long");
    }

    if (!userData.email || !userSchema.email.pattern.test(userData.email)) {
        errors.push("Please provide a valid email address");
    }

    if (!userData.password || userData.password.length < 6) {
        errors.push("Password must be at least 6 characters long");
    }

    if (userData.role && !userSchema.role.enum.includes(userData.role)) {
        errors.push("Invalid user role");
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

// Create user document
export const createUserDocument = (userData) => {
    return {
        name: userData.name,
        email: userData.email.toLowerCase(),
        password: userData.password,
        role: userData.role || userSchema.role.default,
        isActive: userData.isActive !== undefined ? userData.isActive : userSchema.isActive.default,
        apiKeys: userData.apiKeys || userSchema.apiKeys.default,
        isVerified: userData.isVerified !== undefined ? userData.isVerified : userSchema.isVerified.default,
        profilePic: userData.profilePic || userSchema.profilePic.default,
        resetPasswordToken: userData.resetPasswordToken,
        resetPasswordExpiresAt: userData.resetPasswordExpiresAt,
        verificationToken: userData.verificationToken,
        verificationTokenExpiresAt: userData.verificationTokenExpiresAt,
        createdAt: new Date(),
        updatedAt: new Date()
    };
};
