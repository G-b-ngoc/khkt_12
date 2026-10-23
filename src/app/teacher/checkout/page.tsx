import { TransactionLog } from "@/components/teacher/TransactionLog";

export default function TeacherCheckoutPage() {
  return (
    <>
      <h2 className="mb-4 text-center text-lg font-semibold text-text">Lịch sử trả điện thoại</h2>
      <TransactionLog type="CHECK_OUT" emptyLabel="Chưa có lượt trả điện thoại nào trong ngày này." />
    </>
  );
}
