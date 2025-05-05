// gwb-payroll-automation-server/services/cosmosDbService.ts
import { CosmosClient, Container, Database } from '@azure/cosmos';
import dotenv from 'dotenv';
import { UserSession } from '../models/UserSession';
import { EmailLog } from '../models/EmailLog';

dotenv.config();

class CosmosDbService {
  private client: CosmosClient;
  private database: Database | undefined;
  private usersContainer: Container | undefined;
  private emailLogsContainer: Container | undefined;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

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
    
    // Start initialization immediately in the constructor
    this.initPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      console.log('Initializing Cosmos DB service...');
      
      // Get a reference to the database
      this.database = this.client.database('payroll');
      
      // Get a reference to the containers
      this.usersContainer = this.database.container('users');
      this.emailLogsContainer = this.database.container('emailsSent');
      
      this.initialized = true;
      console.log('Connected to Cosmos DB successfully');
    } catch (error) {
      console.error('Error initializing Cosmos DB:', error);
      this.initialized = false;
      throw error;
    }
  }

  async init(): Promise<void> {
    // If initialization is already in progress, wait for it
    if (this.initPromise) {
      return this.initPromise;
    }
    
    // If not initialized yet, start initialization
    if (!this.initialized) {
      this.initPromise = this.initialize();
      return this.initPromise;
    }
  }

  // Helper method to ensure DB is initialized before operations
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }
    
    if (!this.usersContainer || !this.emailLogsContainer) {
      throw new Error('Users or Email Log container is not initialized');
    }
  }

  async createUserSession(userSession: UserSession): Promise<UserSession> {
    try {
      await this.ensureInitialized();
      
      const { resource } = await this.usersContainer!.items.create(userSession);
      return resource as UserSession;
    } catch (error) {
      console.error('Error creating user session:', error);
      throw error;
    }
  }

  async getUserSessionById(sessionId: string): Promise<UserSession | undefined> {
    try {
      await this.ensureInitialized();

      const { resource } = await this.usersContainer!.item(sessionId, sessionId).read();
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
      await this.ensureInitialized();

      const querySpec = {
        query: 'SELECT * FROM c WHERE c.email = @email ORDER BY c.createdAt DESC',
        parameters: [
          {
            name: '@email',
            value: email
          }
        ]
      };

      const { resources } = await this.usersContainer!.items.query(querySpec).fetchAll();
      
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
      await this.ensureInitialized();

      // First get the current document
      const { resource: existingSession } = await this.usersContainer!.item(sessionId, sessionId).read();
      
      if (!existingSession) {
        return undefined;
      }

      // Apply updates
      const updatedSession = { ...existingSession, ...updates };
      
      // Replace the document
      const { resource } = await this.usersContainer!.item(sessionId, sessionId).replace(updatedSession);
      return resource as UserSession;
    } catch (error) {
      console.error('Error updating user session:', error);
      throw error;
    }
  }

  async deleteUserSession(sessionId: string): Promise<void> {
    try {
      await this.ensureInitialized();

      await this.usersContainer!.item(sessionId, sessionId).delete();
    } catch (error) {
      if ((error as any).code === 404) {
        // If the session doesn't exist, consider it already deleted
        console.log(`Session ${sessionId} not found for deletion - already deleted or never existed`);
        return;
      }
      console.error('Error deleting user session:', error);
      throw error;
    }
  }

  async cleanupExpiredSessions(): Promise<void> {
    try {
      await this.ensureInitialized();

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

      const { resources: expiredSessions } = await this.usersContainer!.items.query(querySpec).fetchAll();
      
      for (const session of expiredSessions) {
        await this.usersContainer!.item(session.id, session.id).delete();
      }
      
      console.log(`Cleaned up ${expiredSessions.length} expired sessions`);
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error);
      throw error;
    }
  }

  // EmailLog methods
  async createEmailLog(emailLog: EmailLog): Promise<EmailLog> {
    try {
      await this.ensureInitialized();

      const { resource } = await this.emailLogsContainer!.items.create(emailLog);
      return resource as EmailLog;
    } catch (error) {
      console.error('Error creating email log:', error);
      throw error;
    }
  }

  // TODO: Think about the limit here.
  async getAllEmailLogs(limit: number = 100): Promise<EmailLog[]> {
    try {
      await this.ensureInitialized();
      
      const querySpec = {
        query: 'SELECT * FROM c ORDER BY c._ts DESC OFFSET 0 LIMIT @limit',
        parameters: [
          {
            name: '@limit',
            value: limit
          }
        ]
      };
  
      const { resources } = await this.emailLogsContainer!.items.query(querySpec).fetchAll();
      return resources as EmailLog[];
    } catch (error) {
      console.error('Error retrieving all email logs:', error);
      throw error;
    }
  }

  async getEmailLogsByEmail(email: string, role: 'sender' | 'recipient' = 'sender', limit: number = 100): Promise<EmailLog[]> {
    try {
      await this.ensureInitialized();

      const field = role === 'sender' ? 'senderEmail' : 'recipientEmail';
      
      const querySpec = {
        query: `SELECT * FROM c WHERE c.${field} = @email ORDER BY c._ts DESC OFFSET 0 LIMIT @limit`,
        parameters: [
          {
            name: '@email',
            value: email
          },
          {
            name: '@limit',
            value: limit
          }
        ]
      };

      const { resources } = await this.emailLogsContainer!.items.query(querySpec).fetchAll();
      return resources as EmailLog[];
    } catch (error) {
      console.error(`Error retrieving email logs for ${role} ${email}:`, error);
      throw error;
    }
  }

  async getEmailLogsByWorkerNumber(workerNum: string, limit: number = 100): Promise<EmailLog[]> {
    try {
      await this.ensureInitialized();
      
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.recipientWorkerNum = @workerNum ORDER BY c._ts DESC OFFSET 0 LIMIT @limit',
        parameters: [
          {
            name: '@workerNum',
            value: workerNum
          },
          {
            name: '@limit',
            value: limit
          }
        ]
      };

      const { resources } = await this.emailLogsContainer!.items.query(querySpec).fetchAll();
      return resources as EmailLog[];
    } catch (error) {
      console.error(`Error retrieving email logs for worker number ${workerNum}:`, error);
      throw error;
    }
  }

  async getEmailLogsByDateRange(startDate: string, endDate: string, limit: number = 100): Promise<EmailLog[]> {
    try {
      await this.ensureInitialized();
      
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.date >= @startDate AND c.date <= @endDate ORDER BY c.date DESC, c.timeSent DESC OFFSET 0 LIMIT @limit',
        parameters: [
          {
            name: '@startDate',
            value: startDate
          },
          {
            name: '@endDate',
            value: endDate
          },
          {
            name: '@limit',
            value: limit
          }
        ]
      };

      const { resources } = await this.emailLogsContainer!.items.query(querySpec).fetchAll();
      return resources as EmailLog[];
    } catch (error) {
      console.error(`Error retrieving email logs for date range ${startDate} to ${endDate}:`, error);
      throw error;
    }
  }
}
// Create and export a singleton instance
const cosmosDbService = new CosmosDbService();
export default cosmosDbService;