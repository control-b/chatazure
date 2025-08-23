import jwt from "jsonwebtoken";

export interface AuthResult {
  success: boolean;
  userId?: string;
  orgId?: string;
  error?: string;
}

export class AuthService {
  private jwtSecret: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || "your-secret-key";
  }

  async verifyToken(token: string): Promise<AuthResult> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;

      if (decoded.sub && decoded.org_id) {
        return {
          success: true,
          userId: decoded.sub,
          orgId: decoded.org_id,
        };
      }

      return {
        success: false,
        error: "Invalid token claims",
      };
    } catch (error) {
      return {
        success: false,
        error: "Token verification failed",
      };
    }
  }

  async checkDocumentAccess(
    docId: string,
    userId: string,
    orgId: string
  ): Promise<boolean> {
    try {
      // In a real implementation, this would check with the Phoenix API
      // or directly with the database to verify document access

      const apiUrl = process.env.API_BASE_URL || "http://localhost:4000/api";
      const response = await fetch(`${apiUrl}/docs/${docId}`, {
        headers: {
          Authorization: `Bearer ${jwt.sign({ sub: userId, org_id: orgId }, this.jwtSecret)}`,
          "Content-Type": "application/json",
        },
      });

      return response.ok;
    } catch (error) {
      console.error("Document access check failed:", error);
      // In development, allow access
      return process.env.NODE_ENV === "development";
    }
  }
}
