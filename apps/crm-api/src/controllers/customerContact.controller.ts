import { Request, Response } from "express";
import { CustomerContactService } from "../services/customerContactService.js";
import {
  CreateCustomerContactSchema,
  UpdateCustomerContactSchema,
  ListCustomerContactsSchema,
  CustomerContactIdSchema,
} from "../schemas/customerContact.schemas.js";
import { createAuditLog } from "../utils/auditLogger.js";

const customerContactService = new CustomerContactService();

export async function create(req: Request, res: Response) {
  const parsed = CreateCustomerContactSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid contact data", details: parsed.error });
  }

  const user = req.user!;

  try {
    const contact = await customerContactService.create({
      ...parsed.data,
      companyId: user.companyId,
    });

    await createAuditLog({
      companyId: user.companyId,
      userId: user.id,
      action: "CUSTOMER_CONTACT_CREATED",
      description: `Created contact: ${contact.firstName} ${contact.lastName} (ID: ${contact.id}) for customer ID: ${contact.customerId}`,
      req,
    });

    return res.status(201).json(contact);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "CUSTOMER_NOT_FOUND") {
      return res.status(404).json({ error: "Customer not found" });
    }
    if (message === "DUPLICATE_CONTACT_EMAIL") {
      return res.status(409).json({
        error: "A contact with this email already exists for this customer",
      });
    }
    if (message === "DUPLICATE_CONTACT_PHONE") {
      return res.status(409).json({
        error:
          "A contact with this phone number already exists for this customer",
      });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function list(req: Request, res: Response) {
  const parsed = ListCustomerContactsSchema.safeParse(req.query);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid query parameters", details: parsed.error });
  }

  const user = req.user!;

  try {
    const result = await customerContactService.list({
      ...parsed.data,
      companyId: user.companyId,
    });
    return res.json(result);
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getById(req: Request, res: Response) {
  const parsed = CustomerContactIdSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid contact ID" });
  }

  const user = req.user!;

  try {
    const contact = await customerContactService.getById(
      parsed.data.id,
      user.companyId,
    );
    return res.json(contact);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "NOT_FOUND") {
      return res.status(404).json({ error: "Contact not found" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function update(req: Request, res: Response) {
  const parsedId = CustomerContactIdSchema.safeParse(req.params);
  if (!parsedId.success) {
    return res.status(400).json({ error: "Invalid contact ID" });
  }

  const parsedBody = UpdateCustomerContactSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({ error: "Invalid update data" });
  }

  const user = req.user!;

  try {
    const updated = await customerContactService.update({
      ...parsedBody.data,
      id: parsedId.data.id,
      companyId: user.companyId,
    });

    await createAuditLog({
      companyId: user.companyId,
      userId: user.id,
      action: "CUSTOMER_CONTACT_UPDATED",
      description: `Updated contact: ${updated.firstName} ${updated.lastName} (ID: ${updated.id})`,
      req,
    });

    return res.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "NOT_FOUND") {
      return res.status(404).json({ error: "Contact not found" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteContact(req: Request, res: Response) {
  const parsed = CustomerContactIdSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid contact ID" });
  }

  const user = req.user!;

  try {
    const existing = await customerContactService.getById(
      parsed.data.id,
      user.companyId,
    );

    await customerContactService.delete(parsed.data.id, user.companyId);

    await createAuditLog({
      companyId: user.companyId,
      userId: user.id,
      action: "CUSTOMER_CONTACT_DELETED",
      description: `Deleted contact: ${existing.firstName} ${existing.lastName} (ID: ${existing.id})`,
      req,
    });

    return res.status(204).send();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "NOT_FOUND") {
      return res.status(404).json({ error: "Contact not found" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}
