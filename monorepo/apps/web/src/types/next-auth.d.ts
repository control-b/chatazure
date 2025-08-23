import NextAuth, { DefaultSession } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    user: {
      id: string;
      role: "owner" | "dispatcher" | "driver" | "clerk";
      orgId: string;
      status: "active" | "inactive";
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: "owner" | "dispatcher" | "driver" | "clerk";
    orgId: string;
    status: "active" | "inactive";
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    accessToken?: string;
    orgId?: string;
    role?: "owner" | "dispatcher" | "driver" | "clerk";
  }
}
