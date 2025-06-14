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

// It is recommended to create indexes directly in your MongoDB Atlas dashboard
// as this function may not work reliably in a serverless environment.