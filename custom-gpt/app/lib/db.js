// Workers-compatible MongoDB connection
let cachedClient = null;
let cachedDb = null;

export const connectToDatabase = async (env) => {
  if (!env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  try {
    // Dynamic import for Workers compatibility
    const { MongoClient } = await import('mongodb');
    
    // Workers-compatible connection options
    const client = new MongoClient(env.MONGODB_URI, {
      // Minimal options for Workers environment
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      maxPoolSize: 1,
      minPoolSize: 0,
      maxIdleTimeMS: 30000,
      // Remove all socket-related options for Workers compatibility
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
    throw new Error(`Database connection failed: ${error.message}`);
  }
};

// Helper function to extract database name from MongoDB URI
function extractDbNameFromUri(uri) {
  try {
    const url = new URL(uri);
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

// It is recommended to create indexes directly in your MongoDB Atlas dashboard
// as this function may not work reliably in a serverless environment.