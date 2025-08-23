import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// NextAuth App Router handler
// GET handles OAuth callbacks and session retrieval
// POST handles sign-in actions
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
