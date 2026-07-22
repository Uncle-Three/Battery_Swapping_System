import { z } from "zod";
import { Roles } from "../../constants/roles";

export const updateUserRoleSchema = z.object({
  role: z.enum([Roles.MEMBER, Roles.STAFF, Roles.TECHNICIAN, Roles.MANAGER, Roles.ADMIN]),
});

export const updateMeSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    fullName: z.string().trim().min(1).optional(),
    phone: z.string().trim().min(1).nullable().optional(),
    avatarUrl: z.url().nullable().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (Object.keys(value).length === 0) {
      context.addIssue({
        code: "custom",
        message: "At least one profile field is required",
      });
    }

    if (value.name && value.fullName) {
      context.addIssue({
        code: "custom",
        message: "Use either name or fullName, not both",
        path: ["name"],
      });
    }
  });
