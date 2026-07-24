import { z } from "zod";

export const stationIdParamSchema = z.object({
  id: z.string().min(1),
});

export const stationAvailabilitySchema = z.object({
  vehicleId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid MongoDB ObjectId"),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
}).refine((data) => data.endsAt > data.startsAt, { message: "endsAt must be after startsAt", path: ["endsAt"] });

export const bookingScheduleSchema = z.object({
  vehicleId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid MongoDB ObjectId").optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format"),
  durationMinutes: z.coerce.number().int().refine((value) => value === 30 || value === 60, "Duration must be 30 or 60 minutes"),
});

import { StationStatus } from "@prisma/client";

const stationPhoneSchema = z.string().regex(/^0\d{0,9}$/, "Phone number must start with 0 and contain at most 10 digits");

export const createStationSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  phone: stationPhoneSchema,
  email: z.string().email().optional().nullable(),
  country: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  district: z.string().optional().nullable(),
  ward: z.string().optional().nullable(),
  address: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  openingTime: z.string().optional().nullable(),
  closingTime: z.string().optional().nullable(),
  workingDays: z.array(z.string()).optional().default([]),
  holidaySupport: z.boolean().optional().default(false),
  maintenanceDay: z.string().optional().nullable(),
  serviceBaysCount: z.number().int().min(1).default(1),
  maxVehiclesPerSlot: z.number().int().min(1).default(1),
  defaultSlotDuration: z.number().int().min(1).default(30),
  allowParallelReplacement: z.boolean().optional().default(false),
  supportedVehicleModelIds: z.array(z.string()).optional().default([]),
  supportedBatteryTypeIds: z.array(z.string()).optional().default([]),
  status: z.nativeEnum(StationStatus).default(StationStatus.DRAFT),
});

export const updateStationSchema = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  phone: stationPhoneSchema.optional(),
  email: z.string().email().optional().nullable(),
  country: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  district: z.string().optional().nullable(),
  ward: z.string().optional().nullable(),
  address: z.string().min(1).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  openingTime: z.string().optional().nullable(),
  closingTime: z.string().optional().nullable(),
  workingDays: z.array(z.string()).optional(),
  holidaySupport: z.boolean().optional(),
  maintenanceDay: z.string().optional().nullable(),
  serviceBaysCount: z.number().int().min(1).optional(),
  maxVehiclesPerSlot: z.number().int().min(1).optional(),
  defaultSlotDuration: z.number().int().min(1).optional(),
  allowParallelReplacement: z.boolean().optional(),
  supportedVehicleModelIds: z.array(z.string()).optional(),
  supportedBatteryTypeIds: z.array(z.string()).optional(),
  status: z.nativeEnum(StationStatus).optional(),
});
