import { v4 as uuidv4 } from 'uuid';

// Create R2 configuration
const createR2Config = (env) => {
  return {
    accountId: env.CLOUDFLARE_ACCOUNT_ID,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    bucketName: env.R2_BUCKET_NAME || env.FILES_BUCKET,
    publicDomain: env.R2_PUBLIC_DOMAIN
  };
};

// Upload file to R2 using bucket binding
export const uploadFileToR2 = async (env, file, folder = 'general') => {
  try {
    if (!file || !file.arrayBuffer) {
      throw new Error('Invalid file object');
    }


    // Get bucket from environment bindings
    const bucket = env.FILES_BUCKET || env.MY_BUCKET;
    const bucketName = env.R2_BUCKET_NAME || env.FILES_BUCKET || 'ai-agents';
    const publicDomain = env.R2_PUBLIC_DOMAIN;
    

    
    if (!bucket) {
      // For development, return placeholder
      if (env.NODE_ENV === 'development' || !env.NODE_ENV) {
        console.warn('⚠️  R2 bucket not bound, using placeholder URL for development');
        const placeholderResult = {
          success: true,
          fileName: `placeholder_${uuidv4()}_${file.name}`,
          fileUrl: `/placeholder/${folder}/${file.name}`,
          originalName: file.name,
          size: file.size,
          type: file.type,
        };

        return placeholderResult;
      }
      
      throw new Error(`R2 bucket binding not found. Available env keys: ${Object.keys(env).filter(k => k.includes('BUCKET')).join(', ')}`);
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileExtension = file.name.split('.').pop() || 'bin';
    const fileName = `${folder}/${uuidv4()}.${fileExtension}`;
    
    try {

      
      // Upload to R2 using bucket binding
      await bucket.put(fileName, arrayBuffer, {
        httpMetadata: {
          contentType: file.type || 'application/octet-stream',
        },
      });

      // Generate public URL
      const fileUrl = publicDomain 
        ? `${publicDomain}/${fileName}`
        : `https://${bucketName}.r2.dev/${fileName}`;

      const successResult = {
        success: true,
        fileName,
        fileUrl,
        originalName: file.name,
        size: file.size,
        type: file.type,
      };
      

      return successResult;
      
    } catch (uploadError) {

      
      // For development, fall back to placeholder if upload fails
      if (env.NODE_ENV === 'development' || !env.NODE_ENV) {
        console.warn('⚠️  R2 upload failed, using placeholder URL for development');
        const fallbackResult = {
          success: true,
          fileName: `placeholder_${uuidv4()}_${file.name}`,
          fileUrl: `/placeholder/${folder}/${file.name}`,
          originalName: file.name,
          size: file.size,
          type: file.type,
        };

        return fallbackResult;
      }
      
      throw new Error(`R2 upload failed: ${uploadError.message}`);
    }

  } catch (error) {

    return {
      success: false,
      error: error.message,
    };
  }
};

// Upload profile picture with validation
export const uploadProfilePicture = async (env, file, userId) => {
  try {
    if (!file || !file.arrayBuffer) {
      throw new Error('Invalid file object');
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Image file size must not exceed 5MB');
    }


    return await uploadFileToR2(env, file, `profiles/${userId}`);
  } catch (error) {

    return {
      success: false,
      error: error.message,
    };
  }
};

// Upload knowledge base files with validation
export const uploadKnowledgeBaseFiles = async (env, files, gptId) => {
  try {

    
    if (!files || files.length === 0) {

      return { success: true, files: [] };
    }

    const uploadedFiles = [];
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
      'application/json',
      'text/csv',
      'application/rtf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];



    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      
      // Validate file type
      if (!allowedTypes.includes(file.type)) {
        const error = `File type not supported: ${file.name} (${file.type}). Please upload PDF, DOC, DOCX, TXT, MD, JSON, CSV, RTF, XLS, XLSX, PPT, or PPTX files.`;
        
        throw new Error(error);
      }

      // Validate file size (100MB limit for knowledge base - matching frontend)
      if (file.size > 100 * 1024 * 1024) {
        const error = `File too large: ${file.name}. File size must not exceed 100MB`;
        
        throw new Error(error);
      }

      const uploadResult = await uploadFileToR2(env, file, `knowledge-base/${gptId}`);
      
      
      if (!uploadResult.success) {
        const error = `Failed to upload ${file.name}: ${uploadResult.error}`;
        
        throw new Error(error);
      }

      uploadedFiles.push(uploadResult);
    }

    const result = {
      success: true,
      files: uploadedFiles
    };
    
    
    return result;
    
  } catch (error) {
    
    return {
      success: false,
      error: error.message,
    };
  }
};

// Delete file from R2
export const deleteFile = async (env, fileName) => {
  try {
    const bucket = env.FILES_BUCKET || env.MY_BUCKET;
    
    if (!bucket) {
      throw new Error('R2 bucket binding not found');
    }

    await bucket.delete(fileName);
    
    return {
      success: true,
      message: 'File deleted successfully'
    };
  } catch (error) {
    
    return {
      success: false,
      error: error.message,
    };
  }
};

// Get file info from R2
export const getFileInfo = async (env, fileName) => {
  try {
    const bucket = env.FILES_BUCKET || env.MY_BUCKET;
    
    if (!bucket) {
      throw new Error('R2 bucket binding not found');
    }

    const object = await bucket.head(fileName);
    
    if (!object) {
      throw new Error('File not found');
    }

    return {
      success: true,
      fileName,
      size: object.size,
      lastModified: object.uploaded,
      contentType: object.httpMetadata?.contentType
    };
  } catch (error) {
    
    return {
      success: false,
      error: error.message,
    };
  }
};

// List files in R2 folder
export const listFiles = async (env, folder = '', limit = 100) => {
  try {
    const bucket = env.FILES_BUCKET || env.MY_BUCKET;
    
    if (!bucket) {
      throw new Error('R2 bucket binding not found');
    }

    const objects = await bucket.list({
      prefix: folder,
      limit
    });
    
    return {
      success: true,
      files: objects.objects.map(obj => ({
        fileName: obj.key,
        size: obj.size,
        lastModified: obj.uploaded
      }))
    };
  } catch (error) {
    
    return {
      success: false,
      error: error.message,
    };
  }
};

// Get file from R2
export const getFile = async (env, fileName) => {
  try {
    const bucket = env.FILES_BUCKET || env.MY_BUCKET;
    
    if (!bucket) {
      throw new Error('R2 bucket binding not found');
    }

    const object = await bucket.get(fileName);
    
    if (!object) {
      throw new Error('File not found');
    }

    return {
      success: true,
      file: object,
      fileName,
      size: object.size,
      contentType: object.httpMetadata?.contentType
    };
  } catch (error) {
    
    return {
      success: false,
      error: error.message,
    };
  }
};

// Legacy function for backward compatibility
export const uploadKnowledgeBaseFile = async (env, file, gptId) => {
  return await uploadFileToR2(env, file, `knowledge-base/${gptId}`);
};

// Generic file upload function
export const uploadFile = async (env, file, folder = 'general') => {
  return await uploadFileToR2(env, file, folder);
};

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
                knowledgeBase = knowledgeUploadResult.files.map(file => {
                    
                    return {
                        fileName: file.originalName || file.fileName,
                        fileUrl: file.fileUrl,
                        fileSize: file.size,
                        fileType: file.type,
                        uploadedAt: new Date()
                    };
                });
                
            } else {
                
                throw new Error(`Knowledge base upload failed: ${knowledgeUploadResult.error}`);
            }
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
                    const newKnowledgeFiles = knowledgeUploadResult.files.map(file => {
                        
                        return {
                            fileName: file.originalName || file.fileName,
                            fileUrl: file.fileUrl,
                            fileSize: file.size,
                            fileType: file.type,
                            uploadedAt: new Date()
                        };
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
    } catch (error) {
        
        throw error;
    }
}; 