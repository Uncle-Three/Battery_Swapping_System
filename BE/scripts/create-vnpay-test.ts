import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("Tìm kiếm user member...");
  const user = await prisma.user.findFirst({
    where: { role: { name: "MEMBER" } },
  });

  if (!user) {
    console.error("Không tìm thấy user MEMBER nào. Chạy script seed trước.");
    return;
  }

  console.log("Tìm kiếm station...");
  const station = await prisma.station.findFirst();
  if (!station) {
    console.error("Không tìm thấy trạm nào.");
    return;
  }

  console.log("Đang tạo fake booking và swap transaction...");
  const booking = await prisma.booking.create({
    data: {
      userId: user.id,
      stationId: station.id,
      status: "COMPLETED",
      expiryTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // +1 day
      timeSlot: "10:00 - 10:30",
      reason: "VNPay Test Booking",
    },
  });

  const swapTxn = await prisma.swapTransaction.create({
    data: {
      userId: user.id,
      stationId: station.id,
      bookingId: booking.id,
      status: "SUCCESS",
      workflowStatus: "PAYMENT_PENDING",
      cost: 150000,
    },
  });

  await prisma.invoice.create({
    data: {
      transactionId: swapTxn.id,
      amount: 150000,
      paymentMethod: "VNPAY",
      status: "UNPAID",
    },
  });

  console.log("-------------------------------------------------");
  console.log("TẠO ĐƠN HÀNG GIẢ LẬP VNPAY THÀNH CÔNG!");
  console.log("-------------------------------------------------");
  console.log(`Email User: ${user.email}`);
  console.log(`Booking ID: ${booking.id}`);
  console.log(`Link kiểm tra: http://localhost:5174/payments/${booking.id}`);
  console.log("-------------------------------------------------");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
