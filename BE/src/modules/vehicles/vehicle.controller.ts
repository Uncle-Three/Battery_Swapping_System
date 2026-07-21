import { Request, Response, NextFunction } from "express";
import * as vehicleService from "./vehicle.service";
import type { VehicleListQuery } from "./vehicle.schema";

export const getMyVehicles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id; // from requireAuth
    const { page, size, sort, search, vehicleStatus, batteryStatus, healthClassification } = req.query as unknown as VehicleListQuery;

    const result = await vehicleService.getMyVehicles(userId, {
      page,
      size,
      sort,
      search,
      vehicleStatus,
      batteryStatus,
      healthClassification,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getVehicleById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const vehicleId = req.params.vehicleId as string;
    const vehicle = await vehicleService.getVehicleById(userId, vehicleId);
    res.json(vehicle);
  } catch (error) {
    next(error);
  }
};

export const createVehicle = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const payload = req.body;
    const vehicle = await vehicleService.createVehicle(userId, payload);
    res.status(201).json(vehicle);
  } catch (error) {
    next(error);
  }
};

export const updateVehicle = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const vehicleId = String(req.params.vehicleId);
    const payload = req.body;
    const vehicle = await vehicleService.updateVehicle(userId, vehicleId, payload);
    res.json(vehicle);
  } catch (error) {
    next(error);
  }
};

export const updateMileage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const vehicleId = String(req.params.vehicleId);
    const payload = req.body;
    const result = await vehicleService.updateMileage(userId, vehicleId, payload);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const deleteVehicle = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const vehicleId = String(req.params.vehicleId);
    await vehicleService.deleteVehicle(userId, vehicleId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const getBatteryHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const vehicleId = String(req.params.vehicleId);
    const page = Number(req.query.page);
    const size = Number(req.query.size);
    const history = await vehicleService.getBatteryHistory(userId, vehicleId, { page, size });
    res.json(history);
  } catch (error) {
    next(error);
  }
};

export const getMileageHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const vehicleId = String(req.params.vehicleId);
    const page = Number(req.query.page);
    const size = Number(req.query.size);
    const history = await vehicleService.getMileageHistory(userId, vehicleId, { page, size });
    res.json(history);
  } catch (error) {
    next(error);
  }
};

export const getBatteryQr = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const vehicleId = String(req.params.vehicleId);
    const qrData = await vehicleService.getBatteryQr(userId, vehicleId);
    res.json(qrData);
  } catch (error) {
    next(error);
  }
};

export const checkSwapEligibility = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const vehicleId = String(req.params.vehicleId);
    const eligibility = await vehicleService.checkSwapEligibility(userId, vehicleId);
    res.json(eligibility);
  } catch (error) {
    next(error);
  }
};
