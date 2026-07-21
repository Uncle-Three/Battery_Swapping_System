import { z } from "zod";
import { objectIdSchema } from "../../common/validation/object-id";

const dateString = z.string().refine((value) => {
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date <= new Date();
}, "Date must be valid and cannot be in the future").transform((value) => new Date(value));

const pageSchema = z.coerce.number().int().min(0).default(0);
const sizeSchema = z.coerce.number().int().min(1).max(100).default(12);

export const vehicleIdParamsSchema = z.object({ vehicleId: objectIdSchema });

export const vehicleListQuerySchema = z.object({
  page: pageSchema,
  size: sizeSchema,
  sort: z.enum(["createdAt,asc", "createdAt,desc", "updatedAt,asc", "updatedAt,desc", "plateNumber,asc", "plateNumber,desc"]).default("createdAt,desc"),
  search: z.string().trim().max(100).optional(),
  vehicleStatus: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  batteryStatus: z.enum(["READY", "CHARGING", "MAINTENANCE", "FAULTY"]).optional(),
  healthClassification: z.enum(["HEALTHY", "LIMITED", "NEEDS_MAINTENANCE", "REPLACEMENT_REQUIRED", "UNSAFE", "UNKNOWN"]).optional(),
});
export type VehicleListQuery = z.infer<typeof vehicleListQuerySchema>;

export const vehicleHistoryQuerySchema = z.object({
  page: pageSchema,
  size: z.coerce.number().int().min(1).max(100).default(10),
});

export const createVehicleSchema = {
  body: z.object({
    plateNumber: z.string().min(1, "Plate number is required"),
    vinNumber: z.string().optional(),
    brand: z.string().min(1, "Brand is required"),
    model: z.string().min(1, "Model is required"),
    manufactureYear: z.number().int().min(1886).max(new Date().getFullYear()),
    purchaseDate: dateString,
    currentMileageKm: z.number().nonnegative(),
    batteryType: z.string().min(1, "Battery type is required"),
    qrCodeValue: z.string().min(1, "QR Code is required"),
    batteryOwnershipType: z.enum(["OWNED", "SUBSCRIPTION", "LEASED", "UNKNOWN"]),
    color: z.string().optional(),
    vehicleImageUrl: z.string().url().optional().or(z.literal("")),
    registrationDocumentUrl: z.string().url().optional().or(z.literal("")),
    preferredStationId: z.string().optional(),
    note: z.string().optional(),
  }).strict(),
};

export const updateVehicleSchema = {
  body: z.object({
    brand: z.string().min(1, "Brand is required").optional(),
    model: z.string().min(1, "Model is required").optional(),
    color: z.string().optional(),
    purchaseDate: dateString.optional(),
    currentMileageKm: z.number().nonnegative().optional(),
    vehicleImageUrl: z.string().url().optional().or(z.literal("")),
    registrationDocumentUrl: z.string().url().optional().or(z.literal("")),
    preferredStationId: z.string().optional(),
    note: z.string().optional(),
  }).strict(),
};

export const updateMileageSchema = {
  body: z.object({
    currentMileageKm: z.number().nonnegative(),
    recordedAt: dateString.optional(),
    note: z.string().optional(),
  }).strict(),
};
