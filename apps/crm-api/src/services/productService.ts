import type { Prisma } from "@prisma/client";
import { prisma } from "../client.js";
import type { ListProductsInput } from "../schemas/product.schemas.js";

export class ProductService {
  async list(filters: ListProductsInput) {
    const where: Prisma.ProductWhereInput = {
      ...(filters.active === "all"
        ? {}
        : { active: filters.active === "true" }),
      ...(filters.productSubgroupId
        ? { productSubgroupId: filters.productSubgroupId }
        : {}),
      ...(filters.productGroupId
        ? { productSubgroup: { productGroupId: filters.productGroupId } }
        : {}),
      ...(filters.search
        ? {
            OR: [
              { sku: { contains: filters.search, mode: "insensitive" } },
              { name: { contains: filters.search, mode: "insensitive" } },
              { brand: { contains: filters.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    return prisma.product.findMany({
      where,
      include: { productSubgroup: { include: { productGroup: true } } },
      orderBy: [{ productSubgroup: { name: "asc" } }, { name: "asc" }],
    });
  }
}
