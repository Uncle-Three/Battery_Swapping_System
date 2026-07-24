import { BayTimeSlotStatus } from "@prisma/client";
import { ConflictError } from "../errors/conflict-error";

const transitions: Record<BayTimeSlotStatus, BayTimeSlotStatus[]> = {
  AVAILABLE: ["OFF", "BLOCKED", "RESERVED"],
  OFF: ["AVAILABLE", "BLOCKED"],
  RESERVED: ["AVAILABLE", "CHECKED_IN", "COMPLETED", "CANCELLED"],
  CHECKED_IN: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: ["AVAILABLE"],
  BLOCKED: ["AVAILABLE", "OFF"],
  CANCELLED: [],
  EXPIRED: [],
};

const conflictMessages: Partial<Record<BayTimeSlotStatus, string>> = {
  RESERVED: "Khung giờ này đã có người đặt. Hãy hủy hoặc chuyển booking trước khi thay đổi.",
  CHECKED_IN: "Khách hàng đã check-in nên không thể thay đổi khung giờ.",
  IN_PROGRESS: "Khung giờ đang được sử dụng và không thể thay đổi.",
  COMPLETED: "Khung giờ đã hoàn thành và không thể chỉnh sửa.",
  EXPIRED: "Khung giờ đã qua và không thể chỉnh sửa.",
};

export const validateSlotStatusTransition = (
  current: BayTimeSlotStatus,
  next: BayTimeSlotStatus,
) => {
  if (current === next || !transitions[current].includes(next)) {
    throw new ConflictError(
      conflictMessages[current] ?? `Không thể chuyển trạng thái khung giờ từ ${current} sang ${next}.`,
    );
  }
};
