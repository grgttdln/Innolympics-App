import { customType } from "drizzle-orm/pg-core";

/**
 * pgvector isn't built into drizzle-orm, so we register a `customType` that
 * maps Postgres `vector(<dim>)` to a plain `number[]`.
 *
 * Usage:
 *   embedding: vector("embedding", { dimensions: 768 })
 */
export const vector = customType<{
  data: number[];
  driverData: string;
  config: { dimensions: number };
}>({
  dataType(config) {
    const dim = config?.dimensions;
    if (!dim || !Number.isInteger(dim) || dim <= 0) {
      throw new Error("vector() requires a positive integer `dimensions`");
    }
    return `vector(${dim})`;
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: string): number[] {
    // pgvector returns values as strings like "[0.1,0.2,...]"
    if (!value) return [];
    const trimmed = value.startsWith("[") ? value.slice(1, -1) : value;
    return trimmed.split(",").map((v) => Number(v));
  },
});
