import type { NextFunction, Request, Response } from "express";
import { ListProductsSchema } from "../schemas/product.schemas.js";
import { ProductService } from "../services/productService.js";

const service = new ProductService();

export async function list(req: Request, res: Response, next: NextFunction) {
  const parsed = ListProductsSchema.safeParse(req.query);
  if (!parsed.success) return void res.status(400).json({ error: "Invalid product filters" });
  try { res.json({ products: await service.list(parsed.data) }); } catch (error) { next(error); }
}
