// gwb-payroll-automation-server/services/cosmosDbService.ts
import { CosmosClient, Container, Database } from '@azure/cosmos';
import dotenv from 'dotenv';

dotenv.config();

// User session interface
export interface UserSession {
  id: string;
  email: string;
  name: string;
  accessToken: string;
  refreshToken?: string;
  expiresOn: number; // timestamp when the token expires
  createdAt: number; // timestamp when the session was created
}

class CosmosDbService {
  private client: CosmosClient;
  private database: Database | undefined;
  private usersContainer: Container | undefined;

  constructor() {
    // Get Cosmos DB configuration from environment variables
    const cosmosDbEndpoint = process.env.COSMOS_DB_ENDPOINT;
    const cosmosDbKey = process.env.COSMOS_DB_KEY;
    
    if (!cosmosDbEndpoint) {
      throw new Error('COSMOS_DB_ENDPOINT environment variable is not set');
    }
    
    if (!cosmosDbKey) {
      throw new Error('COSMOS_DB_KEY environment variable is not set');
    }

    // Initialize the Cosmos client
    this.client = new CosmosClient({
      endpoint: cosmosDbEndpoint,
      key: cosmosDbKey
    });
  }

  async init(): Promise<void> {
    try {
      // Get a reference to the database
      this.database = this.client.database('payroll');
      
      // Get a reference to the users container
      this.usersContainer = this.database.container('users');
      
      console.log('Connected to Cosmos DB successfully');
    } catch (error) {
      console.error('Error initializing Cosmos DB:', error);
      throw error;
    }
  }

  async createUserSession(userSession: UserSession): Promise<UserSession> {
    try {
      if (!this.usersContainer) {
        throw new Error('Users container is not initialized');
      }
      
      const { resource } = await this.usersContainer.items.create(userSession);
      return resource as UserSession;
    } catch (error) {
      console.error('Error creating user session:', error);
      throw error;
    }
  }

  async getUserSessionById(sessionId: string): Promise<UserSession | undefined> {
    try {
      if (!this.usersContainer) {
        throw new Error('Users container is not initialized');
      }

      const { resource } = await this.usersContainer.item(sessionId, sessionId).read();
      return resource as UserSession;
    } catch (error) {
      if ((error as any).code === 404) {
        return undefined;
      }
      console.error('Error retrieving user session:', error);
      throw error;
    }
  }

  async getUserSessionByEmail(email: string): Promise<UserSession | undefined> {
    try {
      if (!this.usersContainer) {
        throw new Error('Users container is not initialized');
      }

      const querySpec = {
        query: 'SELECT * FROM c WHERE c.email = @email ORDER BY c.createdAt DESC',
        parameters: [
          {
            name: '@email',
            value: email
          }
        ]
      };

      const { resources } = await this.usersContainer.items.query(querySpec).fetchAll();
      
      if (resources.length > 0) {
        return resources[0] as UserSession;
      }
      
      return undefined;
    } catch (error) {
      console.error('Error retrieving user session by email:', error);
      throw error;
    }
  }

  async updateUserSession(sessionId: string, updates: Partial<UserSession>): Promise<UserSession | undefined> {
    try {
      if (!this.usersContainer) {
        throw new Error('Users container is not initialized');
      }

      // First get the current document
      const { resource: existingSession } = await this.usersContainer.item(sessionId, sessionId).read();
      
      if (!existingSession) {
        return undefined;
      }

      // Apply updates
      const updatedSession = { ...existingSession, ...updates };
      
      // Replace the document
      const { resource } = await this.usersContainer.item(sessionId, sessionId).replace(updatedSession);
      return resource as UserSession;
    } catch (error) {
      console.error('Error updating user session:', error);
      throw error;
    }
  }

  async deleteUserSession(sessionId: string): Promise<void> {
    try {
      if (!this.usersContainer) {
        throw new Error('Users container is not initialized');
      }

      await this.usersContainer.item(sessionId, sessionId).delete();
    } catch (error) {
      console.error('Error deleting user session:', error);
      throw error;
    }
  }

  async cleanupExpiredSessions(): Promise<void> {
    try {
      if (!this.usersContainer) {
        throw new Error('Users container is not initialized');
      }

      const now = Date.now();
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.expiresOn < @now',
        parameters: [
          {
            name: '@now',
            value: now
          }
        ]
      };

      const { resources: expiredSessions } = await this.usersContainer.items.query(querySpec).fetchAll();
      
      for (const session of expiredSessions) {
        await this.usersContainer.item(session.id, session.id).delete();
      }
      
      console.log(`Cleaned up ${expiredSessions.length} expired sessions`);
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const cosmosDbService = new CosmosDbService();
export default cosmosDbService;