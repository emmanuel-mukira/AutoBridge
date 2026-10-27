import { useMemo, useState } from "react";
import { PackageSearch, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOpportunityProducts } from "@/features/opportunities/hooks/useOpportunities";
import { useCatalogueProducts } from "@/features/quotations/hooks/useQuotations";

const all = "all";
const money = (value: string) =>
  `KES ${Number(value).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Products() {
  const [search, setSearch] = useState("");
  const [groupId, setGroupId] = useState("");
  const [subgroupId, setSubgroupId] = useState("");
  const [active, setActive] = useState<"true" | "false" | "all">("all");
  const groups = useOpportunityProducts();
  const products = useCatalogueProducts(
    search,
    Number(subgroupId) || undefined,
    Number(groupId) || undefined,
    active,
  );
  const subgroups = useMemo(
    () =>
      groups.data?.find((group) => group.id === Number(groupId))?.subgroups ??
      [],
    [groupId, groups.data],
  );

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Products</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse the catalogue used for opportunity values and quotation price
          snapshots.
        </p>
      </div>
      <div className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_220px_220px_150px]">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search product, brand or SKU"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Select
          value={groupId || all}
          onValueChange={(value) => {
            setGroupId(value === all ? "" : value);
            setSubgroupId("");
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="All groups" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={all}>All groups</SelectItem>
            {groups.data?.map((group) => (
              <SelectItem key={group.id} value={String(group.id)}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={subgroupId || all}
          onValueChange={(value) => setSubgroupId(value === all ? "" : value)}
          disabled={!groupId}
        >
          <SelectTrigger>
            <SelectValue placeholder="All subgroups" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={all}>All subgroups</SelectItem>
            {subgroups.map((subgroup) => (
              <SelectItem key={subgroup.id} value={String(subgroup.id)}>
                {subgroup.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={active}
          onValueChange={(value) => setActive(value as typeof active)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {products.isLoading && (
        <p className="text-muted-foreground">Loading catalogue...</p>
      )}
      {products.error && (
        <p role="alert" className="text-destructive">
          Unable to load products.
        </p>
      )}
      {products.data?.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <PackageSearch className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p>No products match these filters.</p>
          </CardContent>
        </Card>
      )}
      {!!products.data?.length && (
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="hidden grid-cols-[minmax(260px,2fr)_minmax(160px,1fr)_120px_150px_90px] gap-4 border-b bg-muted/40 px-4 py-3 text-xs font-semibold uppercase text-muted-foreground md:grid">
            <span>Product</span>
            <span>Category</span>
            <span>Unit</span>
            <span>Price</span>
            <span>Status</span>
          </div>
          {products.data.map((product) => (
            <article
              key={product.id}
              className="grid gap-3 border-b px-4 py-4 last:border-0 md:grid-cols-[minmax(260px,2fr)_minmax(160px,1fr)_120px_150px_90px] md:items-start"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{product.name}</h2>
                  {product.brand && (
                    <Badge variant="secondary">{product.brand}</Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {product.sku}
                </p>
                {product.specifications && (
                  <p className="mt-2 text-sm">{product.specifications}</p>
                )}
              </div>
              <div className="text-sm">
                <p>{product.productSubgroup.productGroup.name}</p>
                <p className="text-muted-foreground">
                  {product.productSubgroup.name}
                </p>
              </div>
              <p className="text-sm">{product.unitOfMeasure}</p>
              <div>
                <p className="font-semibold">
                  {money(product.defaultSellingPrice)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Public retail reference
                </p>
              </div>
              <Badge variant={product.active ? "default" : "secondary"}>
                {product.active ? "Active" : "Inactive"}
              </Badge>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
