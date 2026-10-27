import "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        firstName: string;
        lastName: string;
        role: "ADMIN" | "SALES_REP";
        sessionId: string;
        sessionToken: string;
        csrfHash: string;
      };
    }
  }
}
