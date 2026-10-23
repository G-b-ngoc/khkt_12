import { redirect } from "next/navigation";

export default function ManagerIndex() {
  redirect("/manager/checkin");
}
