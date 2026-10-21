import type { Request, Response, NextFunction } from "express";
import prismaClient from "@prisma/client";
import { createRequestLogger } from "../lib/logger.js";

const { Prisma } = prismaClient;

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  void next;
  const log = createRequestLogger(req);
  log.error(
    {
      err,
      statusCode: res.statusCode,
    },
    "request error",
  );

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const prismaErr = err;

    if (prismaErr.code === "P2002") {
      return res.status(409).json({
        error: "Duplicate entry detected",
        code: "DUPLICATE",
      });
    }

    if (prismaErr.code === "P2025") {
      return res.status(404).json({
        error: "Record not found",
        code: "NOT_FOUND",
      });
    }

    if (prismaErr.code === "P2003") {
      return res.status(400).json({
        error: "Foreign key constraint failed",
        code: "FOREIGN_KEY_ERROR",
      });
    }
  }

  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: err.message,
      code: "VALIDATION_ERROR",
    });
  }

  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      error: "Invalid token",
      code: "INVALID_TOKEN",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      error: "Token expired",
      code: "TOKEN_EXPIRED",
    });
  }

  const operationContext = getOperationContext(req.url, req.method);

  return res.status(500).json({
    error: operationContext.message,
    code: "INTERNAL_ERROR",
  });
}

function getOperationContext(url: string, method: string): { message: string } {
  const urlLower = url.toLowerCase();

  if (urlLower.includes("/accounts")) {
    if (method === "POST")
      return { message: "Failed to create account. Please try again." };
    if (method === "PUT" || method === "PATCH")
      return { message: "Failed to update account. Please try again." };
    if (method === "DELETE")
      return { message: "Failed to delete account. Please try again." };
    return { message: "Failed to retrieve account data. Please try again." };
  }

  if (urlLower.includes("/opportunities")) {
    if (method === "POST")
      return { message: "Failed to create opportunity. Please try again." };
    if (method === "PUT" || method === "PATCH")
      return { message: "Failed to update opportunity. Please try again." };
    if (method === "DELETE")
      return { message: "Failed to delete opportunity. Please try again." };
    return { message: "Failed to retrieve opportunity data. Please try again." };
  }

  if (urlLower.includes("/quotations")) {
    if (method === "POST")
      return { message: "Failed to create quotation. Please try again." };
    if (method === "PUT" || method === "PATCH")
      return { message: "Failed to update quotation. Please try again." };
    if (method === "DELETE")
      return { message: "Failed to delete quotation. Please try again." };
    return { message: "Failed to retrieve quotation data. Please try again." };
  }

  if (urlLower.includes("/interactions")) {
    if (method === "POST")
      return { message: "Failed to create interaction. Please try again." };
    if (method === "PUT" || method === "PATCH")
      return { message: "Failed to update interaction. Please try again." };
    if (method === "DELETE")
      return { message: "Failed to delete interaction. Please try again." };
    return {
      message: "Failed to retrieve interaction data. Please try again.",
    };
  }

  if (urlLower.includes("/contacts")) {
    if (method === "POST")
      return { message: "Failed to create contact. Please try again." };
    if (method === "PUT" || method === "PATCH")
      return { message: "Failed to update contact. Please try again." };
    if (method === "DELETE")
      return { message: "Failed to delete contact. Please try again." };
    return { message: "Failed to retrieve contact data. Please try again." };
  }

  if (urlLower.includes("/auth/login")) {
    return {
      message: "Login failed. Please check your credentials and try again.",
    };
  }

  if (urlLower.includes("/auth/register")) {
    return { message: "Registration failed. Please try again." };
  }

  if (urlLower.includes("/auth")) {
    return { message: "Authentication failed. Please try again." };
  }

  if (urlLower.includes("/users")) {
    if (method === "POST")
      return { message: "Failed to create user. Please try again." };
    if (method === "PUT" || method === "PATCH")
      return { message: "Failed to update user. Please try again." };
    if (method === "DELETE")
      return { message: "Failed to delete user. Please try again." };
    return { message: "Failed to retrieve user data. Please try again." };
  }

  return { message: "An unexpected error occurred. Please try again." };
}

export function notFoundHandler(req: Request, res: Response) {
  return res.status(404).json({
    error: `Route ${req.method} ${req.url} not found`,
    code: "ROUTE_NOT_FOUND",
  });
}
