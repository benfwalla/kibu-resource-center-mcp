import express from 'express';
import cors from 'cors';
import { EventEmitter } from 'events';

/**
 * HTTP transport for MCP server
 * Implements a simple HTTP server that handles MCP protocol requests
 */
export class HttpServerTransport extends EventEmitter {
  constructor(port = process.env.PORT || 3000) {
    super();
    this.port = port;
    this.app = express();
    this.pendingRequests = new Map();
    this.requestCounter = 0;
    this.listeners = new Map();
    this.setupExpress();
  }

  setupExpress() {
    this.app.use(cors());
    this.app.use(express.json());
    
    // Health check endpoint
    this.app.get('/', (req, res) => {
      res.json({ status: 'MCP server is running' });
    });

    // Main MCP endpoint
    this.app.post('/', async (req, res) => {
      const request = req.body;
      
      if (!request || !request.method) {
        return res.status(400).json({ error: 'Invalid request format' });
      }

      try {
        // Generate a unique ID for this request
        const requestId = ++this.requestCounter;
        
        // Create a promise that will be resolved when the response is ready
        const responsePromise = new Promise((resolve) => {
          this.pendingRequests.set(requestId, resolve);
        });
        
        // Notify all listeners of the request
        for (const listener of this.listeners.values()) {
          listener({ 
            data: JSON.stringify({ ...request, _requestId: requestId })
          });
        }
        
        // Wait for the response
        const response = await responsePromise;
        res.json(response);
        
      } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  }

  // Add a message listener
  addEventListener(event, listener) {
    if (event === 'message') {
      const id = Date.now() + Math.random().toString();
      this.listeners.set(id, listener);
      return id;
    }
    return null;
  }

  // Remove a message listener
  removeEventListener(event, id) {
    if (event === 'message' && this.listeners.has(id)) {
      this.listeners.delete(id);
      return true;
    }
    return false;
  }

  // Start the HTTP server
  start() {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.error(`MCP HTTP Server running on port ${this.port}`);
        resolve();
      });
    });
  }

  // Send a response
  send(message) {
    try {
      const parsedMessage = JSON.parse(message);
      const { _requestId, ...responseData } = parsedMessage;
      
      // Resolve the pending request if it exists
      if (_requestId && this.pendingRequests.has(_requestId)) {
        const resolve = this.pendingRequests.get(_requestId);
        resolve(responseData);
        this.pendingRequests.delete(_requestId);
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error sending response:', error);
      return Promise.reject(error);
    }
  }

  // Stop the HTTP server
  stop() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          console.error('MCP HTTP Server stopped');
          resolve();
        });
      });
    }
    return Promise.resolve();
  }
}
