import { dbUtils } from "../lib/db.js";
import bcrypt from "bcryptjs";
import { generateOTP, sendVerificationEmail, sendPasswordResetEmail, sendInvitationEmail } from "./mail.js";
import { getUserFromSession } from "../lib/session.js";
import { ObjectId } from "mongodb";
import { uploadProfilePicture as uploadToStorage } from "./storage.js";

const SignupUser = async (env, name, email, password) => {
  try {
    if (!name || !email || !password) {
      throw new Error("All fields are required");
    }

    const userExists = await dbUtils.findOne(env, 'users', { email });
    if (userExists) {
      throw new Error("User already exists");
    }

    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters long");
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Please enter a valid email address");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate verification token
    const verificationToken = generateOTP();
    const verificationTokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    const userDoc = {
      name,
      email,
      password: hashedPassword,
      role: "user",
      verificationToken,
      verificationTokenExpiresAt,
      isVerified: false,
      isActive: true,
      apiKeys: {},
      profilePic: "",
    };

    const result = await dbUtils.insertOne(env, 'users', userDoc);
    const user = { ...userDoc, _id: result.insertedId };

    // Send verification email
    await sendVerificationEmail(env, email, name, verificationToken);

    return {
      success: true,
      message: "Account created successfully! Please check your email for verification.",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    };
  } catch (error) {
    console.log(error);
    throw new Error(error.message);
  }
};

const LoginUser = async (env, email, password) => {
  try {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const user = await dbUtils.findOne(env, 'users', { email });
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('Account has been deactivated');
    }

    // If user is not verified, regenerate verification token and send email
    if (!user.isVerified) {
      const verificationToken = generateOTP();
      const verificationTokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      await dbUtils.updateOne(env, 'users', 
        { _id: user._id },
        { 
          $set: {
            verificationToken,
            verificationTokenExpiresAt
          }
        }
      );

      await sendVerificationEmail(env, user.email, user.name, verificationToken);

      return {
        success: false,
        message: 'Please verify your email. A new verification code has been sent.',
        requireVerification: true,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified
        }
      };
    }

    return {
      success: true,
      message: 'Login successful',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      },
    };

  } catch (error) {
    console.error('Login error:', error);
    throw new Error(error.message || 'Failed to log in');
  }
};

const verifyEmail = async (env, { email, token }) => {
  try {
    if (!email || !token) {
      throw new Error("Email and token are required");
    }

    const user = await dbUtils.findOne(env, 'users', {
      email,
      verificationToken: token,
      verificationTokenExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      throw new Error("Invalid or expired verification token");
    }

    await dbUtils.updateOne(env, 'users',
      { _id: user._id },
      {
        $set: {
          isVerified: true
        },
        $unset: {
          verificationToken: "",
          verificationTokenExpiresAt: ""
        }
      }
    );

    return {
      success: true,
      message: "Email verified successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: true,
      }
    };
  } catch (error) {
    console.error('Email verification error:', error);
    throw new Error(error.message || 'Failed to verify email');
  }
};

const requestPasswordReset = async (env, email) => {
  try {
    if (!email) {
      throw new Error("Email is required");
    }

    const user = await dbUtils.findOne(env, 'users', { email });
    if (!user) {
      throw new Error("User not found");
    }

    const resetToken = generateOTP();
    const resetTokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await dbUtils.updateOne(env, 'users',
      { _id: user._id },
      {
        $set: {
          resetPasswordToken: resetToken,
          resetPasswordExpiresAt: resetTokenExpiresAt
        }
      }
    );

    await sendPasswordResetEmail(env, user.email, user.name, resetToken);

    return {
      success: true,
      message: "Password reset email sent successfully",
    };
  } catch (error) {
    console.error('Password reset request error:', error);
    throw new Error(error.message || 'Failed to request password reset');
  }
};

const resetPassword = async (env, { email, token, newPassword }) => {
  try {
    if (!email || !token || !newPassword) {
      throw new Error("Email, token, and new password are required");
    }

    if (newPassword.length < 6) {
      throw new Error("Password must be at least 6 characters long");
    }

    const user = await dbUtils.findOne(env, 'users', {
      email,
      resetPasswordToken: token,
      resetPasswordExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      throw new Error("Invalid or expired reset token");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await dbUtils.updateOne(env, 'users',
      { _id: user._id },
      {
        $set: {
          password: hashedPassword
        },
        $unset: {
          resetPasswordToken: "",
          resetPasswordExpiresAt: ""
        }
      }
    );

    return {
      success: true,
      message: "Password reset successfully",
    };
  } catch (error) {
    console.error('Password reset error:', error);
    throw new Error(error.message || 'Failed to reset password');
  }
};

const requiredAuth = async (request, env) => {
  const user = await getUserFromSession(request, env);
  const userId = user?._id || user?.id;

  if (!userId) {
    throw new Error("Unauthorized");
  }

  try {
    const dbUser = await dbUtils.findOne(env, 'users', { 
      _id: new ObjectId(userId)
    });
    
    if (!dbUser) {
      throw new Error("User not found");
    }

    return {
      success: true,
      message: "User authenticated successfully",
      user: dbUser,
    };
  } catch (error) {
    console.error('Authentication error:', error);
    throw new Error(error.message || 'Failed to authenticate user');
  }
};

const getAllUsers = async (env) => {
  try {
    const users = await dbUtils.find(env, 'users',
      { isActive: { $ne: false } },
      { 
        projection: { password: 0 },
        sort: { createdAt: -1 }
      }
    );

    return users;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw new Error('Failed to fetch users');
  }
};

const getUserById = async (env, userId) => {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    const user = await dbUtils.findOne(env, 'users',
      {
        _id: new ObjectId(userId),
        isActive: { $ne: false }
      }
    );

    if (!user) {
      return null;
    }

    // Remove sensitive fields
    delete user.password;
    delete user.resetPasswordToken;
    delete user.resetPasswordExpiresAt;
    delete user.verificationToken;
    delete user.verificationTokenExpiresAt;

    return user;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
};

// NEW FUNCTIONS FOR USER SETTINGS

// Update user profile
const updateUserProfile = async (env, userId, profileData) => {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    const { name, email } = profileData;

    if (!name || !email) {
      throw new Error("Name and email are required");
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Please enter a valid email address");
    }

    // Check if email is already taken by another user
    const existingUser = await dbUtils.findOne(env, 'users', {
      email,
      _id: { $ne: new ObjectId(userId) }
    });

    if (existingUser) {
      throw new Error("Email is already in use by another account");
    }

    const result = await dbUtils.updateOne(env, 'users',
      { _id: new ObjectId(userId) },
      {
        $set: {
          name,
          email,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      throw new Error("User not found");
    }

    // Get updated user
    const updatedUser = await dbUtils.findOne(env, 'users', {
      _id: new ObjectId(userId)
    });

    // Remove sensitive fields
    delete updatedUser.password;
    delete updatedUser.resetPasswordToken;
    delete updatedUser.resetPasswordExpiresAt;
    delete updatedUser.verificationToken;
    delete updatedUser.verificationTokenExpiresAt;

    return updatedUser;
  } catch (error) {
    throw error;
  }
};

// Update user password
const updateUserPassword = async (env, userId, currentPassword, newPassword) => {
  try {
    if (!userId || !currentPassword || !newPassword) {
      throw new Error("User ID, current password, and new password are required");
    }

    if (newPassword.length < 6) {
      throw new Error("New password must be at least 6 characters long");
    }

    // Get user with password
    const user = await dbUtils.findOne(env, 'users', {
      _id: new ObjectId(userId)
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new Error("Current password is incorrect");
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    const result = await dbUtils.updateOne(env, 'users',
      { _id: new ObjectId(userId) },
      {
        $set: {
          password: hashedPassword,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      throw new Error("Failed to update password");
    }

    return {
      success: true,
      message: "Password updated successfully"
    };
  } catch (error) {
    throw error;
  }
};

// Upload profile picture
const uploadProfilePicture = async (env, userId, imageFile) => {
  try {
    if (!userId || !imageFile) {
      throw new Error("User ID and image file are required");
    }

    // Use storage service to upload
    const uploadResult = await uploadToStorage(env, imageFile, `profiles/${userId}`);
    
    if (!uploadResult.success) {
      throw new Error(uploadResult.error);
    }

    // Update user with new profile picture URL
    const result = await dbUtils.updateOne(env, 'users',
      { _id: new ObjectId(userId) },
      { 
        $set: { 
          profilePic: uploadResult.fileUrl,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      throw new Error("User not found");
    }

    // Get updated user
    const updatedUser = await dbUtils.findOne(env, 'users', {
      _id: new ObjectId(userId)
    });

    // Remove sensitive fields
    delete updatedUser.password;
    delete updatedUser.resetPasswordToken;
    delete updatedUser.resetPasswordExpiresAt;
    delete updatedUser.verificationToken;
    delete updatedUser.verificationTokenExpiresAt;

    return updatedUser;
  } catch (error) {
    throw error;
  }
};

// API Keys functions
const saveApiKeys = async (env, userId, apiKeys) => {
  try {
    const user = await dbUtils.findOne(env, 'users', { _id: new ObjectId(userId) });
    if (!user) {
      throw new Error("User not found");
    }

    if (user.role !== "admin") {
      throw new Error("You are not authorized to save API keys");
    }

    // Hash the API keys before storing
    const hashedApiKeys = {};
    for (const [provider, key] of Object.entries(apiKeys)) {
      if (key && key.trim() !== '') {
        const salt = await bcrypt.genSalt(10);
        hashedApiKeys[provider] = await bcrypt.hash(key, salt);
      }
    }

    const result = await dbUtils.updateOne(env, 'users',
      { _id: new ObjectId(userId) },
      { $set: { apiKeys: hashedApiKeys } }
    );

    return {
      success: true,
      message: "API keys saved successfully"
    };
  } catch (error) {
    throw error;
  }
};

const getApiKeys = async (env, userId) => {
  try {
    const user = await dbUtils.findOne(env, 'users', { _id: new ObjectId(userId) });
    if (!user) {
      throw new Error("User not found");
    }

    if (user.role !== "admin") {
      throw new Error("You are not authorized to get API keys");
    }
    
    if (!user.apiKeys || typeof user.apiKeys !== 'object' || Object.keys(user.apiKeys).length === 0) {
      return {
        success: true,
        apiKeys: {
          openai: '',
          claude: '',
          gemini: '',
          llama: ''
        }
      };
    }

    // Return masked API keys for display
    const maskedApiKeys = {};
    for (const [provider, hashedKey] of Object.entries(user.apiKeys)) {
      maskedApiKeys[provider] = hashedKey ? '••••••••••••••••' : '';
    }

    return {
      success: true,
      apiKeys: {
        openai: maskedApiKeys.openai || '',
        claude: maskedApiKeys.claude || '',
        gemini: maskedApiKeys.gemini || '',
        llama: maskedApiKeys.llama || ''
      }
    };
  } catch (error) {
    console.error('Get API keys error:', error);
    throw new Error(error.message || 'Failed to get API keys');
  }
};

const updateApiKeys = async (env, userId, apiKeys) => {
  try {
    return await saveApiKeys(env, userId, apiKeys);
  } catch (error) {
    throw error;
  }
};

// Add these missing functions before the export section

const updateUserPermissions = async (env, userId, permissions) => {
  try {
    if (!userId || !permissions) {
      throw new Error("User ID and permissions are required");
    }

    const updateData = {};
    
    if (permissions.role) {
      updateData.role = permissions.role;
    }
    
    if (typeof permissions.isActive === 'boolean') {
      updateData.isActive = permissions.isActive;
    }
    
    updateData.updatedAt = new Date();

    const result = await dbUtils.updateOne(env, 'users',
      { _id: new ObjectId(userId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      throw new Error("User not found");
    }

    return {
      success: true,
      message: "User permissions updated successfully"
    };
  } catch (error) {
    throw error;
  }
};

const removeTeamMember = async (env, userId) => {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    // Soft delete - deactivate the user instead of deleting
    const result = await dbUtils.updateOne(env, 'users',
      { _id: new ObjectId(userId) },
      { 
        $set: { 
          isActive: false,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      throw new Error("User not found");
    }

    return {
      success: true,
      message: "Team member removed successfully"
    };
  } catch (error) {
    throw error;
  }
};

const inviteTeamMember = async (env, email, role, adminId) => {
  try {
    if (!email || !role || !adminId) {
      throw new Error("Email, role, and admin ID are required");
    }

    // Check if user already exists
    const existingUser = await dbUtils.findOne(env, 'users', { email });
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // For now, we'll create a basic invitation system
    // In a real app, you might want to create an invitation table
    // and send an email with a signup link
    
    const verificationToken = generateOTP();
    const verificationTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitationData = {
      email,
      role,
      invitedBy: new ObjectId(adminId),
      invitedAt: new Date(),
      verificationToken,
      verificationTokenExpiresAt,
      status: 'pending'
    };

    // Store the invitation
    await dbUtils.insertOne(env, 'invitations', invitationData);

    // Send invitation email
    await sendInvitationEmail(env, email, verificationToken);

    return {
      success: true,
      message: "Invitation sent successfully"
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || "Failed to send invitation"
    };
  }
};

// Update the export section
export {
  SignupUser,
  LoginUser,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  requiredAuth,
  getAllUsers,
  getUserById,
  updateUserPermissions,
  removeTeamMember,
  inviteTeamMember,
  saveApiKeys,
  getApiKeys,
  updateApiKeys,
  updateUserProfile,
  updateUserPassword,
  uploadProfilePicture
};