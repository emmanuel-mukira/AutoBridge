import { Prisma } from "@prisma/client";
import {
  MODEL_PRODUCT_GROUPS,
  MODEL_PRODUCT_SUBGROUPS,
} from "../domain/modelCategories.js";

type Database = Prisma.TransactionClient;
type ItemInput = { productId: number; quantity: string };

export async function catalogueLines(db: Database, inputs: ItemInput[]) {
  const products = await db.product.findMany({
    where: { id: { in: inputs.map((item) => item.productId) }, active: true },
    include: { productSubgroup: { include: { productGroup: true } } },
  });
  if (products.length !== inputs.length)
    throw new Error("PRODUCT_NOT_AVAILABLE");
  const byId = new Map(products.map((product) => [product.id, product]));
  const lines = inputs.map((input) => {
    const product = byId.get(input.productId)!;
    const quantity = new Prisma.Decimal(input.quantity);
    const unitPrice = product.defaultSellingPrice.toDecimalPlaces(2);
    return {
      productId: product.id,
      productSubgroupId: product.productSubgroupId,
      productGroupName: product.productSubgroup.productGroup.name,
      productSubgroupName: product.productSubgroup.name,
      skuSnapshot: product.sku,
      productNameSnapshot: product.name,
      brandSnapshot: product.brand,
      descriptionSnapshot: product.description,
      unitSnapshot: product.unitOfMeasure,
      quantity,
      unitPrice,
      lineTotal: quantity.mul(unitPrice).toDecimalPlaces(2),
    };
  });
  return lines;
}

export function quotationTotals(
  lines: Array<{ lineTotal: Prisma.Decimal }>,
  discountPercent: Prisma.Decimal.Value,
) {
  const subtotal = lines
    .reduce((total, item) => total.plus(item.lineTotal), new Prisma.Decimal(0))
    .toDecimalPlaces(2);
  const percent = new Prisma.Decimal(discountPercent);
  const discountAmount = subtotal.mul(percent).div(100).toDecimalPlaces(2);
  return {
    subtotal,
    discountPercent: percent.toDecimalPlaces(2),
    discountAmount,
    totalAmount: subtotal.minus(discountAmount).toDecimalPlaces(2),
  };
}

export function quotationItemData(line: {
  productId: number;
  skuSnapshot: string;
  productNameSnapshot: string;
  brandSnapshot: string | null;
  descriptionSnapshot: string | null;
  unitSnapshot: string;
  quantity: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
}) {
  return {
    productId: line.productId,
    skuSnapshot: line.skuSnapshot,
    productNameSnapshot: line.productNameSnapshot,
    brandSnapshot: line.brandSnapshot,
    descriptionSnapshot: line.descriptionSnapshot,
    unitSnapshot: line.unitSnapshot,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    lineTotal: line.lineTotal,
  };
}

export function validatePrincipalCategory(
  lines: Array<{
    productSubgroupId: number;
    productGroupName: string;
    productSubgroupName: string;
  }>,
  productSubgroupId: number,
) {
  const selected = lines.find(
    (line) => line.productSubgroupId === productSubgroupId,
  );
  if (!selected) throw new Error("PRINCIPAL_SUBGROUP_NOT_SELECTED");
  if (
    !MODEL_PRODUCT_GROUPS.has(selected.productGroupName) ||
    !MODEL_PRODUCT_SUBGROUPS.has(selected.productSubgroupName)
  ) {
    throw new Error("UNSUPPORTED_MODEL_CATEGORY");
  }
  return selected;
}
