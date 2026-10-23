import { PhoneStation } from "@/components/manager/PhoneStation";
import { PhoneOutIcon } from "@/components/ui/Icons";

export default function CheckOutPage() {
  return (
    <PhoneStation
      mode="CHECK_OUT"
      title="Trả điện thoại"
      actionLabel="Trả điện thoại"
      icon={<PhoneOutIcon className="h-7 w-7 text-accent" />}
    />
  );
}
