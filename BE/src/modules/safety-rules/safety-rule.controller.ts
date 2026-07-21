import type { RequestHandler } from "express";
import { safetyRuleService } from "./safety-rule.service";

export const safetyRuleController = {
  list: (async (_req, res) => {
    const data = await safetyRuleService.list();
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  getById: (async (req, res) => {
    const data = await safetyRuleService.getById(String(req.params.id));
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  create: (async (req, res) => {
    // extract stationId for connect if provided
    const { stationId, ...rest } = req.body;
    const input: any = { ...rest };
    if (stationId) input.station = { connect: { id: stationId } };
    
    const data = await safetyRuleService.create(input);
    res.locals.audit = { action: "CREATE_SAFETY_RULE", entityType: "BatterySafetyRule", entityId: data.id, after: data };
    res.status(201).json({ success: true, data });
  }) satisfies RequestHandler,

  update: (async (req, res) => {
    const oldData = await safetyRuleService.getById(String(req.params.id));
    const { stationId, ...rest } = req.body;
    const input: any = { ...rest };
    
    // explicitly check undefined because we can disconnect by passing null? 
    // Prisma accepts connect/disconnect or just string depending on schema.
    // The schema allows setting stationId directly or using connect.
    if (stationId) {
      input.station = { connect: { id: stationId } };
    } else if (stationId === null) {
      input.station = { disconnect: true };
    }

    const data = await safetyRuleService.update(String(req.params.id), input);
    res.locals.audit = { action: "UPDATE_SAFETY_RULE", entityType: "BatterySafetyRule", entityId: data.id, before: oldData, after: data };
    res.status(200).json({ success: true, data });
  }) satisfies RequestHandler,

  delete: (async (req, res) => {
    const oldData = await safetyRuleService.getById(String(req.params.id));
    await safetyRuleService.delete(String(req.params.id));
    res.locals.audit = { action: "DELETE_SAFETY_RULE", entityType: "BatterySafetyRule", entityId: String(req.params.id), before: oldData };
    res.status(200).json({ success: true });
  }) satisfies RequestHandler,
};
