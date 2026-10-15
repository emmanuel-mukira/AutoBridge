import "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        email: string;
        name: string;
        groups: string[];
        companyId: number;
      };
    }
  }
}
