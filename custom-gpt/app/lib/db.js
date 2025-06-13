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
    const { MongoClient } = await import('mongodb');
    
    // Workers-compatible connection options (removed unsupported options)
    const client = new MongoClient(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 1, // Keep pool small for Workers
      minPoolSize: 0,
      maxIdleTimeMS: 30000,
      // Removed: keepAlive, keepAliveInitialDelay, family (not supported in Workers)
    });

    await client.connect();
    const db = client.db('customgpt');
    
    // Test connection
    await db.command({ ping: 1 });

    cachedClient = client;
    cachedDb = db;

    return { client, db };
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw new Error(`Database connection failed: ${error.message}`);
  }
};

// Alternative: Use MongoDB Data API (more reliable for Workers)
export const connectToDatabase_DataAPI = async (env) => {
  if (!env.MONGODB_DATA_API_URL || !env.MONGODB_API_KEY) {
    throw new Error('MongoDB Data API credentials not configured');
  }

  return {
    async findOne(collection, filter) {
      const response = await fetch(`${env.MONGODB_DATA_API_URL}/action/findOne`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': env.MONGODB_API_KEY,
        },
        body: JSON.stringify({
          collection,
          database: 'customgpt',
          filter,
        }),
      });
      
      const result = await response.json();
      return result.document;
    },
    
    async insertOne(collection, document) {
      const response = await fetch(`${env.MONGODB_DATA_API_URL}/action/insertOne`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': env.MONGODB_API_KEY,
        },
        body: JSON.stringify({
          collection,
          database: 'customgpt',
          document,
        }),
      });
      
      return await response.json();
    },
    
    // Add more methods as needed
  };
};

// Database utility functions
export const dbUtils = {
  async findOne(env, collection, query) {
    try {
      const { db } = await connectToDatabase(env);
      return await db.collection(collection).findOne(query);
    } catch (error) {
      console.error(`Error finding document in ${collection}:`, error);
      throw error;
    }
  },

  async find(env, collection, query = {}, options = {}) {
    try {
      const { db } = await connectToDatabase(env);
      return await db.collection(collection).find(query, options).toArray();
    } catch (error) {
      console.error(`Error finding documents in ${collection}:`, error);
      throw error;
    }
  },

  async insertOne(env, collection, document) {
    try {
      const { db } = await connectToDatabase(env);
      return await db.collection(collection).insertOne({
        ...document,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } catch (error) {
      console.error(`Error inserting document into ${collection}:`, error);
      throw error;
    }
  },

  async updateOne(env, collection, query, update) {
    try {
      const { db } = await connectToDatabase(env);
      
      let finalUpdate = update;
      if (!update.$set) {
        const setFields = {};
        const operators = {};
        
        Object.keys(update).forEach(key => {
          if (key.startsWith('$')) {
            operators[key] = update[key];
          } else {
            setFields[key] = update[key];
          }
        });
        
        finalUpdate = {
          ...operators,
          $set: {
            ...setFields,
            updatedAt: new Date()
          }
        };
      } else {
        finalUpdate = {
          ...update,
          $set: {
            ...update.$set,
            updatedAt: new Date()
          }
        };
      }
      
      return await db.collection(collection).updateOne(query, finalUpdate);
    } catch (error) {
      console.error(`Error updating document in ${collection}:`, error);
      throw error;
    }
  },

  async deleteOne(env, collection, query) {
    try {
      const { db } = await connectToDatabase(env);
      return await db.collection(collection).deleteOne(query);
    } catch (error) {
      console.error(`Error deleting document from ${collection}:`, error);
      throw error;
    }
  },

  async countDocuments(env, collection, query = {}) {
    try {
      const { db } = await connectToDatabase(env);
      return await db.collection(collection).countDocuments(query);
    } catch (error) {
      console.error(`Error counting documents in ${collection}:`, error);
      throw error;
    }
  }
};

// Helper function to create indexes
export async function createIndexes(env) {
  const db = await connectToDatabase(env);
  
  try {
    // Users collection indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ isActive: 1 });
    await db.collection('users').createIndex({ role: 1 });
    
    // CustomGpts collection indexes
    await db.collection('customgpts').createIndex({ createdBy: 1 });
    await db.collection('customgpts').createIndex({ isActive: 1 });
    await db.collection('customgpts').createIndex({ assignedUsers: 1 });
    
    // Conversations collection indexes
    await db.collection('conversations').createIndex({ userId: 1, updatedAt: -1 });
    await db.collection('conversations').createIndex({ userId: 1, isActive: 1 });
    await db.collection('conversations').createIndex({ gptId: 1 });
    
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
}