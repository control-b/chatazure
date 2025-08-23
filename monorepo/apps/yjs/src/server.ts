import { createServer } from "http";
import { WebSocketServer } from "ws";
import * as Y from "yjs";
import { setupWSConnection } from "y-websocket/bin/utils";
import jwt from "jsonwebtoken";
import { URL } from "url";
import { AuthService } from "./auth";
import { PersistenceAdapter } from "./persistence";

const PORT = process.env.PORT || 4001;
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  orgId?: string;
  docId?: string;
}

export class YjsServer {
  private server: any;
  private wss: WebSocketServer;
  private authService: AuthService;
  private persistence: PersistenceAdapter;
  private docs: Map<string, Y.Doc> = new Map();

  constructor() {
    this.authService = new AuthService();
    this.persistence = new PersistenceAdapter();
    this.server = createServer();
    this.wss = new WebSocketServer({
      server: this.server,
      path: "/yjs",
    });

    this.setupWebSocketHandlers();
  }

  private setupWebSocketHandlers() {
    this.wss.on("connection", async (ws: AuthenticatedWebSocket, req) => {
      try {
        const url = new URL(req.url!, `http://${req.headers.host}`);
        const token = url.searchParams.get("token");
        const docId = url.searchParams.get("docId");

        if (!token || !docId) {
          ws.close(1008, "Missing token or docId");
          return;
        }

        // Verify authentication
        const authResult = await this.authService.verifyToken(token);
        if (!authResult.success) {
          ws.close(1008, "Authentication failed");
          return;
        }

        // Check document access
        const hasAccess = await this.authService.checkDocumentAccess(
          docId,
          authResult.userId!,
          authResult.orgId!
        );
        if (!hasAccess) {
          ws.close(1008, "Access denied");
          return;
        }

        // Attach user info to websocket
        ws.userId = authResult.userId;
        ws.orgId = authResult.orgId;
        ws.docId = docId;

        // Get or create Y.Doc
        let doc = this.docs.get(docId);
        if (!doc) {
          doc = new Y.Doc();
          this.docs.set(docId, doc);

          // Load document from persistence
          const savedState = await this.persistence.loadDocument(docId);
          if (savedState) {
            Y.applyUpdate(doc, savedState);
          }

          // Set up persistence on document updates
          doc.on("update", async (update: Uint8Array) => {
            await this.persistence.saveDocument(
              docId,
              Y.encodeStateAsUpdate(doc)
            );
          });
        }

        // Set up Y.js WebSocket connection
        setupWSConnection(ws, req, {
          docName: docId,
          gc: true, // Enable garbage collection
        });

        console.log(`User ${authResult.userId} connected to document ${docId}`);

        ws.on("close", () => {
          console.log(
            `User ${ws.userId} disconnected from document ${ws.docId}`
          );

          // Clean up document if no more connections
          const docConnections = Array.from(this.wss.clients).filter(
            (client) => (client as AuthenticatedWebSocket).docId === docId
          );

          if (docConnections.length === 0) {
            // Save final state and remove from memory after a delay
            setTimeout(async () => {
              const doc = this.docs.get(docId);
              if (doc) {
                await this.persistence.saveDocument(
                  docId,
                  Y.encodeStateAsUpdate(doc)
                );
                this.docs.delete(docId);
                console.log(`Document ${docId} cleaned up from memory`);
              }
            }, 30000); // 30 seconds delay
          }
        });
      } catch (error) {
        console.error("WebSocket connection error:", error);
        ws.close(1011, "Server error");
      }
    });
  }

  public start() {
    this.server.listen(PORT, () => {
      console.log(`Y.js WebSocket server running on port ${PORT}`);
    });

    // Health check endpoint
    this.server.on("request", (req: any, res: any) => {
      if (req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            status: "healthy",
            timestamp: new Date().toISOString(),
            connections: this.wss.clients.size,
            documents: this.docs.size,
          })
        );
      } else {
        res.writeHead(404);
        res.end("Not Found");
      }
    });

    // Graceful shutdown
    process.on("SIGTERM", () => {
      console.log("Shutting down Y.js server...");
      this.wss.close(() => {
        this.server.close(() => {
          process.exit(0);
        });
      });
    });
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new YjsServer();
  server.start();
}
