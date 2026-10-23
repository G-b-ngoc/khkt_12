import { TransactionLog } from "@/components/teacher/TransactionLog";

export default function TeacherCheckinPage() {
  return (
    <>
      <h2 className="mb-4 text-center text-lg font-semibold text-text">Lịch sử cất điện thoại</h2>
      <TransactionLog type="CHECK_IN" emptyLabel="Chưa có lượt cất điện thoại nào trong ngày này." />
    </>
  );
}
