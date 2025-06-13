import { MongoClient } from 'mongodb';

// Global MongoDB client cache
let cachedClient = null;
let cachedDb = null;

export const connectToDatabase = async (env) => {
  // Check if MongoDB URI exists
  if (!env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  // Validate MongoDB URI format
  if (!env.MONGODB_URI.startsWith('mongodb://') && !env.MONGODB_URI.startsWith('mongodb+srv://')) {
    throw new Error('MONGODB_URI must start with mongodb:// or mongodb+srv://');
  }

  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  try {
    const client = new MongoClient(env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });

    await client.connect();
    
    // Use default database from connection string instead of specifying one
    const db = client.db();
    
    // Test the connection
    await db.command({ ping: 1 });

    cachedClient = client;
    cachedDb = db;

    return { client, db };
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw new Error(`Database connection failed: ${error.message}`);
  }
};

const getDatabase = async (env) => {
  const { db } = await connectToDatabase(env);
  return db;
};

// Helper function to create indexes
export async function createIndexes(env) {
  const db = await getDatabase(env);
  
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

// Database utility functions with better error handling
export const dbUtils = {
  async findOne(env, collection, query) {
    try {
      const db = await getDatabase(env);
      return await db.collection(collection).findOne(query);
    } catch (error) {
      console.error(`Error finding document in ${collection}:`, error);
      throw error;
    }
  },

  async find(env, collection, query = {}, options = {}) {
    try {
      const db = await getDatabase(env);
      return await db.collection(collection).find(query, options).toArray();
    } catch (error) {
      console.error(`Error finding documents in ${collection}:`, error);
      throw error;
    }
  },

  async findMany(env, collection, query = {}, options = {}) {
    return this.find(env, collection, query, options);
  },

  async insertOne(env, collection, document) {
    try {
      const db = await getDatabase(env);
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
      const db = await getDatabase(env);
      
      // Ensure proper structure for the update
      let finalUpdate = update;
      if (!update.$set) {
        // If no $set operator, create one and move all fields there except operators
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
        // If $set exists, just add updatedAt
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
      const db = await getDatabase(env);
      return await db.collection(collection).deleteOne(query);
    } catch (error) {
      console.error(`Error deleting document from ${collection}:`, error);
      throw error;
    }
  },

  async countDocuments(env, collection, query = {}) {
    try {
      const db = await getDatabase(env);
      return await db.collection(collection).countDocuments(query);
    } catch (error) {
      console.error(`Error counting documents in ${collection}:`, error);
      throw error;
    }
  }
};