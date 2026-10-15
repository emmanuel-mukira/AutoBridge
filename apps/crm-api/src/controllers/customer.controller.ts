import { Request, Response } from "express";
import { CustomerService } from "../services/customerService.js";
import logger from "../lib/logger.js";
import {
  CreateCustomerSchema,
  UpdateCustomerSchema,
  ListCustomersSchema,
  CustomerIdSchema,
  AssignCustomerSchema,
} from "../schemas/customer.schemas.js";
import { createAuditLog } from "../utils/auditLogger.js";
import { AnalyticsEvents } from "../services/analyticsService.js";

const customerService = new CustomerService();

export async function create(req: Request, res: Response) {
  const parsed = CreateCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid customer data", details: parsed.error });
  }

  const user = req.user!;
  const isAdmin = user.groups.includes("admin");

  if (
    !isAdmin &&
    parsed.data.salesRepId &&
    parsed.data.salesRepId !== user.id
  ) {
    return res
      .status(403)
      .json({ error: "Cannot create customers for other sales reps" });
  }

  try {
    const customer = await customerService.create({
      ...parsed.data,
      companyId: user.companyId,
      salesRepId: parsed.data.salesRepId || user.id,
    });

    await createAuditLog({
      companyId: user.companyId,
      userId: user.id,
      action: "CUSTOMER_CREATED",
      description: `Created customer: ${customer.companyName} (ID: ${customer.id})`,
      req,
    });
    AnalyticsEvents.customerCreated(req, customer.countyName ?? "Unknown");
    return res.status(201).json(customer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "SALES_REP_NOT_FOUND") {
      return res.status(400).json({ error: "Sales rep not found" });
    }
    if (message === "DUPLICATE_CUSTOMER") {
      return res
        .status(409)
        .json({ error: "A customer with this company name already exists" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function list(req: Request, res: Response) {
  const parsed = ListCustomersSchema.safeParse(req.query);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid query parameters", details: parsed.error });
  }

  const user = req.user!;
  const isAdmin = user.groups.includes("admin");

  const filters = { ...parsed.data, companyId: user.companyId };
  if (!isAdmin) {
    filters.salesRepId = user.id;
  }

  try {
    const result = await customerService.list(filters);
    return res.json(result);
  } catch (error) {
    logger.error({ err: error }, "customer list failed");
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getById(req: Request, res: Response) {
  const parsed = CustomerIdSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid customer ID" });
  }

  const user = req.user!;

  try {
    const customer = await customerService.getById(
      parsed.data.id,
      user.companyId,
    );

    if (!user.groups.includes("admin") && customer.salesRepId !== user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    return res.json(customer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "NOT_FOUND") {
      return res.status(404).json({ error: "Customer not found" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function update(req: Request, res: Response) {
  const parsedId = CustomerIdSchema.safeParse(req.params);
  if (!parsedId.success) {
    return res.status(400).json({ error: "Invalid customer ID" });
  }

  const parsedBody = UpdateCustomerSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({ error: "Invalid update data" });
  }

  const user = req.user!;

  try {
    const existing = await customerService.getById(
      parsedId.data.id,
      user.companyId,
    );

    if (!user.groups.includes("admin") && existing.salesRepId !== user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const updated = await customerService.update({
      ...parsedBody.data,
      id: parsedId.data.id,
      companyId: user.companyId,
    });

    await createAuditLog({
      companyId: user.companyId,
      userId: user.id,
      action: "CUSTOMER_UPDATED",
      description: `Updated customer: ${updated.companyName} (ID: ${updated.id})`,
      req,
    });
    return res.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "NOT_FOUND") {
      return res.status(404).json({ error: "Customer not found" });
    }
    if (message === "SALES_REP_NOT_FOUND") {
      return res.status(400).json({ error: "Sales rep not found" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteCustomer(req: Request, res: Response) {
  const parsed = CustomerIdSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid customer ID" });
  }

  const user = req.user!;

  try {
    const existing = await customerService.getById(
      parsed.data.id,
      user.companyId,
    );

    if (!user.groups.includes("admin") && existing.salesRepId !== user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    await customerService.delete(parsed.data.id, user.companyId);

    await createAuditLog({
      companyId: user.companyId,
      userId: user.id,
      action: "CUSTOMER_DELETED",
      description: `Deleted customer: ${existing.companyName} (ID: ${existing.id})`,
      req,
    });
    return res.status(204).send();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "NOT_FOUND") {
      return res.status(404).json({ error: "Customer not found" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function assignSalesRep(req: Request, res: Response) {
  const parsedId = CustomerIdSchema.safeParse(req.params);
  if (!parsedId.success) {
    return res.status(400).json({ error: "Invalid customer ID" });
  }

  const parsedBody = AssignCustomerSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({ error: "Invalid assignment data" });
  }

  const user = req.user!;

  if (!user.groups.includes("admin")) {
    return res
      .status(403)
      .json({ error: "Only admins can reassign customers" });
  }

  try {
    const updated = await customerService.assignSalesRep(
      parsedId.data.id,
      parsedBody.data.salesRepId,
      user.companyId,
    );

    await createAuditLog({
      companyId: user.companyId,
      userId: user.id,
      action: "CUSTOMER_ASSIGNED",
      description: `Assigned customer ${updated.companyName} (ID: ${updated.id}) to sales rep ${updated.salesRep?.firstName} ${updated.salesRep?.lastName}`,
      req,
    });
    return res.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "NOT_FOUND") {
      return res.status(404).json({ error: "Customer not found" });
    }
    if (message === "SALES_REP_NOT_FOUND") {
      return res.status(400).json({ error: "Sales rep not found" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getSalesRepHistory(req: Request, res: Response) {
  const parsed = CustomerIdSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid customer ID" });
  }

  const user = req.user!;

  try {
    const history = await customerService.getSalesRepHistory(
      parsed.data.id,
      user.companyId,
    );
    return res.json(history);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "NOT_FOUND") {
      return res.status(404).json({ error: "Customer not found" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getInteractionsByRep(req: Request, res: Response) {
  const parsed = CustomerIdSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid customer ID" });
  }

  const user = req.user!;

  try {
    const interactionsByRep = await customerService.getInteractionsByRep(
      parsed.data.id,
      user.companyId,
    );
    return res.json(interactionsByRep);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "NOT_FOUND") {
      return res.status(404).json({ error: "Customer not found" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}
