import { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function base(children: React.ReactNode, props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export const PhoneInIcon = (p: IconProps) =>
  base(
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="2" />
      <path d="M10 6h4" />
      <path d="M9 17.5l3-3 3 3" />
    </>,
    p
  );

export const PhoneOutIcon = (p: IconProps) =>
  base(
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="2" />
      <path d="M10 6h4" />
      <path d="M9 15l3 3 3-3" />
    </>,
    p
  );

export const ReportIcon = (p: IconProps) =>
  base(
    <>
      <path d="M6 3h9l3 3v15H6z" />
      <path d="M15 3v3h3" />
      <path d="M9 12h6M9 15.5h6M9 8.5h3" />
    </>,
    p
  );

export const AccountIcon = (p: IconProps) =>
  base(
    <>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
    </>,
    p
  );

export const CommentIcon = (p: IconProps) =>
  base(
    <>
      <path d="M4 5h16v11H9l-4 4V5z" />
    </>,
    p
  );

export const DashboardIcon = (p: IconProps) =>
  base(
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" />
      <rect x="13.5" y="3.5" width="7" height="4.5" rx="1.2" />
      <rect x="13.5" y="11" width="7" height="9.5" rx="1.2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.2" />
    </>,
    p
  );

export const ClassIcon = (p: IconProps) =>
  base(
    <>
      <rect x="3" y="4" width="18" height="13" rx="1.5" />
      <path d="M8 21h8M12 17v4" />
    </>,
    p
  );

export const StudentsIcon = (p: IconProps) =>
  base(
    <>
      <circle cx="9" cy="8" r="2.6" />
      <circle cx="17" cy="9" r="2.1" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M15.5 14.5c2.2.2 4 1.9 4 4.5" />
    </>,
    p
  );

export const AuditIcon = (p: IconProps) =>
  base(
    <>
      <path d="M12 3l7 3v5c0 5-3.2 7.8-7 9-3.8-1.2-7-4-7-9V6z" />
      <path d="M9.3 12l1.9 1.9 3.5-3.9" />
    </>,
    p
  );

export const MailboxIcon = (p: IconProps) =>
  base(
    <>
      <path d="M3 7a5 5 0 0 1 5-5h8a5 5 0 0 1 5 5v7H3z" />
      <path d="M3 14l5-4h8l5 4" />
      <path d="M8 21h8" />
    </>,
    p
  );

export const LogoutIcon = (p: IconProps) =>
  base(
    <>
      <path d="M9 4H5v16h4" />
      <path d="M14 8l4 4-4 4" />
      <path d="M18 12H9" />
    </>,
    p
  );
