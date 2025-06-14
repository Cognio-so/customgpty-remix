// Workers-compatible MongoDB connection
let cachedClient = null;
let cachedDb = null;

// Check if we're running in Cloudflare Workers environment
const isCloudflareWorkers = () => {
  return typeof globalThis !== 'undefined' && 
         globalThis.navigator && 
         globalThis.navigator.userAgent === 'Cloudflare-Workers';
};

export const connectToDatabase = async (env) => {
  if (!env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  try {
    // Check if we need to use polyfills for Workers
    if (isCloudflareWorkers()) {
      console.log('🔧 Detected Cloudflare Workers environment, using enhanced compatibility mode');
    }

    // Dynamic import for Workers compatibility
    const { MongoClient } = await import('mongodb');
    
    // Workers-compatible connection options - only use supported options
    const client = new MongoClient(env.MONGODB_URI, {
      // Essential options for Workers environment
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      maxPoolSize: 1,
      minPoolSize: 0,
      maxIdleTimeMS: 30000,
      // Remove unsupported options like autoIndex, useUnifiedTopology, family, etc.
    });

    await client.connect();
    
    // Extract database name from URI or use default
    const dbName = extractDbNameFromUri(env.MONGODB_URI) || 'customgpt';
    const db = client.db(dbName);
    
    // Test connection
    await db.command({ ping: 1 });
    console.log('✅ MongoDB connected successfully');

    cachedClient = client;
    cachedDb = db;

    return { client, db };
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    // Reset cache on error
    cachedClient = null;
    cachedDb = null;
    
    // Provide more specific error messages
    if (error.message.includes('dns.resolveSrv') || error.message.includes('dns.resolveTxt')) {
      throw new Error(`Database connection failed: DNS resolution not supported in Cloudflare Workers. Please use a standard MongoDB connection string (mongodb://) instead of SRV format (mongodb+srv://). Original error: ${error.message}`);
    } else if (error.message.includes('net.createConnection') || error.message.includes('socket.once')) {
      throw new Error(`Database connection failed: Network socket operations not fully supported. Please ensure you're using the latest Cloudflare Workers runtime with nodejs_compat flag. Original error: ${error.message}`);
    } else if (error.message.includes('autoindex') || error.message.includes('autoIndex')) {
      throw new Error(`Database connection failed: The autoIndex option is not supported in Cloudflare Workers. Please remove this option from your MongoDB connection configuration. Original error: ${error.message}`);
    } else {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }
};

// Helper function to extract database name from MongoDB URI
function extractDbNameFromUri(uri) {
  try {
    // Handle both mongodb:// and mongodb+srv:// formats
    let cleanUri = uri;
    if (uri.startsWith('mongodb+srv://')) {
      cleanUri = uri.replace('mongodb+srv://', 'mongodb://');
    }
    
    const url = new URL(cleanUri);
    const pathname = url.pathname;
    if (pathname && pathname.length > 1) {
      return pathname.substring(1).split('?')[0];
    }
    return null;
  } catch (error) {
    console.warn('Could not extract database name from URI, using default');
    return null;
  }
}

// Database utility functions with better error handling
export const dbUtils = {
  async getDatabase(env) {
    const { db } = await connectToDatabase(env);
    return db;
  },

  async findOne(env, collection, query, options = {}) {
    try {
      const { db } = await connectToDatabase(env);
      const result = await db.collection(collection).findOne(query, options);
      return result;
    } catch (error) {
      console.error(`Error finding document in ${collection}:`, error);
      throw error;
    }
  },

  async find(env, collection, query = {}, options = {}) {
    try {
      const { db } = await connectToDatabase(env);
      const cursor = db.collection(collection).find(query, options);
      return await cursor.toArray();
    } catch (error) {
      console.error(`Error finding documents in ${collection}:`, error);
      throw error;
    }
  },

  async insertOne(env, collection, document) {
    try {
      const { db } = await connectToDatabase(env);
      const docWithTimestamps = {
        ...document,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const result = await db.collection(collection).insertOne(docWithTimestamps);
      return result;
    } catch (error) {
      console.error(`Error inserting document into ${collection}:`, error);
      throw error;
    }
  },

  async insertMany(env, collection, documents) {
    try {
      const { db } = await connectToDatabase(env);
      const docsWithTimestamps = documents.map(doc => ({
        ...doc,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      const result = await db.collection(collection).insertMany(docsWithTimestamps);
      return result;
    } catch (error) {
      console.error(`Error inserting documents into ${collection}:`, error);
      throw error;
    }
  },

  async updateOne(env, collection, query, update, options = {}) {
    try {
      const { db } = await connectToDatabase(env);
      
      let finalUpdate = update;
      
      // Handle different update formats
      if (!update.$set && !update.$unset && !update.$push && !update.$pull) {
        // If it's a plain object, wrap it in $set
        finalUpdate = {
          $set: {
            ...update,
            updatedAt: new Date()
          }
        };
      } else {
        // If it already has operators, ensure updatedAt is set
        if (update.$set) {
          finalUpdate = {
            ...update,
            $set: {
              ...update.$set,
              updatedAt: new Date()
            }
          };
        } else {
          finalUpdate = {
            ...update,
            $set: {
              updatedAt: new Date()
            }
          };
        }
      }
      
      const result = await db.collection(collection).updateOne(query, finalUpdate, options);
      return result;
    } catch (error) {
      console.error(`Error updating document in ${collection}:`, error);
      throw error;
    }
  },

  async updateMany(env, collection, query, update, options = {}) {
    try {
      const { db } = await connectToDatabase(env);
      
      let finalUpdate = update;
      if (!update.$set && !update.$unset && !update.$push && !update.$pull) {
        finalUpdate = {
          $set: {
            ...update,
            updatedAt: new Date()
          }
        };
      } else if (update.$set) {
        finalUpdate = {
          ...update,
          $set: {
            ...update.$set,
            updatedAt: new Date()
          }
        };
      }
      
      const result = await db.collection(collection).updateMany(query, finalUpdate, options);
      return result;
    } catch (error) {
      console.error(`Error updating documents in ${collection}:`, error);
      throw error;
    }
  },

  async deleteOne(env, collection, query) {
    try {
      const { db } = await connectToDatabase(env);
      const result = await db.collection(collection).deleteOne(query);
      return result;
    } catch (error) {
      console.error(`Error deleting document from ${collection}:`, error);
      throw error;
    }
  },

  async deleteMany(env, collection, query) {
    try {
      const { db } = await connectToDatabase(env);
      const result = await db.collection(collection).deleteMany(query);
      return result;
    } catch (error) {
      console.error(`Error deleting documents from ${collection}:`, error);
      throw error;
    }
  },

  async countDocuments(env, collection, query = {}) {
    try {
      const { db } = await connectToDatabase(env);
      const count = await db.collection(collection).countDocuments(query);
      return count;
    } catch (error) {
      console.error(`Error counting documents in ${collection}:`, error);
      throw error;
    }
  },

  async aggregate(env, collection, pipeline, options = {}) {
    try {
      const { db } = await connectToDatabase(env);
      const cursor = db.collection(collection).aggregate(pipeline, options);
      return await cursor.toArray();
    } catch (error) {
      console.error(`Error running aggregation on ${collection}:`, error);
      throw error;
    }
  }
};

// Connection health check
export const checkDatabaseHealth = async (env) => {
  try {
    const { db } = await connectToDatabase(env);
    await db.command({ ping: 1 });
    return { status: 'healthy', message: 'Database connection is working' };
  } catch (error) {
    return { status: 'unhealthy', message: error.message };
  }
};

// Graceful shutdown
export const closeDatabaseConnection = async () => {
  if (cachedClient) {
    try {
      await cachedClient.close();
      cachedClient = null;
      cachedDb = null;
      console.log('✅ MongoDB connection closed');
    } catch (error) {
      console.error('❌ Error closing MongoDB connection:', error);
    }
  }
};

// It is recommended to create indexes directly in your MongoDB Atlas dashboard
// as this function may not work reliably in a serverless environment.