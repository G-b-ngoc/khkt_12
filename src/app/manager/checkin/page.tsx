import { PhoneStation } from "@/components/manager/PhoneStation";
import { PhoneInIcon } from "@/components/ui/Icons";

export default function CheckInPage() {
  return (
    <PhoneStation
      mode="CHECK_IN"
      title="Cất điện thoại"
      actionLabel="Cất điện thoại"
      icon={<PhoneInIcon className="h-7 w-7 text-accent" />}
    />
  );
}
