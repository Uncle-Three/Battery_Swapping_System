import { userRepository } from "./user.repository";
import { userMapper } from "./user.mapper";
import { NotFoundError } from "../../common/errors/not-found-error";
import { ConflictError } from "../../common/errors/conflict-error";
import type { z } from "zod";
import type { updateMeSchema } from "./user.validation";
import { calculateBatterySoh, classifyBatterySoh, inferAccumulatedMileageKm } from "../battery-health/battery-soh";

type UpdateMeInput = z.infer<typeof updateMeSchema>;
type UserRepository = typeof userRepository;

type UserServiceDependencies = {
  repository: Pick<UserRepository, "findById" | "findByPhone" | "updateProfile" | "findMany" | "findVehicles" | "findVehicleDetail" | "findMemberDashboard" | "isUniqueConstraintError">;
};

const withCalculatedBatteryHealth = <T>(value: T): T => {
  const vehicles = Array.isArray(value)
    ? value
    : (value as any)?.vehicles
      ? (value as any).vehicles
      : value
        ? [value]
        : [];

  for (const vehicle of vehicles as any[]) {
    for (const assignment of vehicle.batteryAssignments ?? []) {
      const battery = assignment.battery;
      if (!battery) continue;
      const soh = calculateBatterySoh(
        inferAccumulatedMileageKm(battery.accumulatedMileageKm, battery.soh),
      );
      battery.soh = soh;
      battery.estimatedSoH = soh;
      battery.healthClassification = classifyBatterySoh(soh);
    }
  }

  return value;
};

export const createUserService = (dependencies: UserServiceDependencies) => ({
  getProfile: async (id: string) => {
    const user = await dependencies.repository.findById(id);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    return userMapper.toResponse(user);
  },

  updateMe: async (id: string, input: UpdateMeInput) => {
    const existingUser = await dependencies.repository.findById(id);
    if (!existingUser) {
      throw new NotFoundError("User not found");
    }

    const phone = input.phone === undefined ? undefined : input.phone?.trim() || null;
    if (phone && phone !== existingUser.phone) {
      const existingPhone = await dependencies.repository.findByPhone(phone);
      if (existingPhone && existingPhone.id !== id) {
        throw new ConflictError("Phone already exists");
      }
    }

    const fullName = input.name?.trim() ?? input.fullName?.trim();

    try {
      const user = await dependencies.repository.updateProfile(id, {
        ...(fullName ? { fullName } : {}),
        ...(input.phone !== undefined ? { phone } : {}),
        ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
      });

      return userMapper.toResponse(user);
    } catch (error) {
      if (dependencies.repository.isUniqueConstraintError(error)) {
        throw new ConflictError("Phone already exists");
      }

      throw error;
    }
  },

  list: async () => {
    const users = await dependencies.repository.findMany();
    return users.map(userMapper.toResponse);
  },

  getVehicles: async (userId: string) =>
    withCalculatedBatteryHealth(await dependencies.repository.findVehicles(userId)),
  getVehicleDetail: async (userId: string, id: string) => {
    const vehicle = await dependencies.repository.findVehicleDetail(userId, id);
    if (!vehicle) throw new NotFoundError("Vehicle not found");
    return withCalculatedBatteryHealth(vehicle);
  },
  getDashboard: async (userId: string) => {
    const dashboard = await dependencies.repository.findMemberDashboard(userId);
    if (!dashboard) throw new NotFoundError("User not found");
    return withCalculatedBatteryHealth(dashboard);
  },
});

export const userService = createUserService({
  repository: userRepository,
});
