import { Router } from "express";
import { requireAuth, requireCsrf, requireTrustedOrigin } from "../middleware/auth.js";
import { CreateContactSchema, UpdateContactSchema, ListContactsSchema, ContactIdSchema } from "../schemas/contact.schemas.js";
import { ContactService } from "../services/contactService.js";

const router = Router();
const service = new ContactService();
router.use(requireAuth);

router.get("/", async (req, res, next) => {
  const parsed = ListContactsSchema.safeParse(req.query);
  if (!parsed.success) return void res.status(400).json({ error: "Invalid query parameters" });
  try { res.json(await service.list(req.user!, parsed.data)); } catch (error) { next(error); }
});

router.get("/:id", async (req, res, next) => {
  const parsed = ContactIdSchema.safeParse(req.params);
  if (!parsed.success) return void res.status(400).json({ error: "Invalid contact ID" });
  try {
    const contact = await service.getById(req.user!, parsed.data.id);
    if (!contact) return void res.status(404).json({ error: "Contact not found" });
    res.json(contact);
  } catch (error) { next(error); }
});

router.post("/", requireTrustedOrigin, requireCsrf, async (req, res, next) => {
  const parsed = CreateContactSchema.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: "Invalid contact data" });
  try {
    const contact = await service.create(req.user!, parsed.data);
    if (!contact) return void res.status(404).json({ error: "Account not found" });
    res.status(201).json(contact);
  } catch (error) { next(error); }
});

router.patch("/:id", requireTrustedOrigin, requireCsrf, async (req, res, next) => {
  const id = ContactIdSchema.safeParse(req.params);
  const data = UpdateContactSchema.safeParse(req.body);
  if (!id.success || !data.success) return void res.status(400).json({ error: "Invalid contact data" });
  try {
    const contact = await service.update(req.user!, id.data.id, data.data);
    if (!contact) return void res.status(404).json({ error: "Contact not found" });
    res.json(contact);
  } catch (error) { next(error); }
});

router.delete("/:id", requireTrustedOrigin, requireCsrf, async (req, res, next) => {
  const parsed = ContactIdSchema.safeParse(req.params);
  if (!parsed.success) return void res.status(400).json({ error: "Invalid contact ID" });
  try {
    if (!await service.delete(req.user!, parsed.data.id)) return void res.status(404).json({ error: "Contact not found" });
    res.status(204).send();
  } catch (error) { next(error); }
});

export default router;
