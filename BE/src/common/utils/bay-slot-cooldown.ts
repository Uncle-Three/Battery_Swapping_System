export const calculateBaySlotCooldownEndsAt = (
  completedAt: Date,
  slotEndAt: Date,
  bufferMinutes: number,
) => {
  if (completedAt >= slotEndAt) return null;
  const cooldownEndsAt = new Date(
    completedAt.getTime() + Math.max(0, bufferMinutes) * 60_000,
  );
  return cooldownEndsAt < slotEndAt ? cooldownEndsAt : null;
};
