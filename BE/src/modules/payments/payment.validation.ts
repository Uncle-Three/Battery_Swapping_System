import { z } from "zod";

export const createTopupSchema = z.object({
  amount: z.coerce.number().min(10000),
  paymentMethod: z.string().min(1),
});

export const purchaseSubscriptionSchema = z.object({
  packageId: z.string().min(1),
});

