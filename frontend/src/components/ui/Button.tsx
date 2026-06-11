import Link from "next/link";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  href?: string;
}

const variants = {
  primary: "bg-red-700 text-white hover:bg-red-800",
  secondary: "bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-300",
  danger: "bg-red-600 text-white hover:bg-red-700",
  ghost: "text-gray-600 hover:text-red-700 hover:bg-gray-50",
};

export default function Button({
  variant = "primary",
  className = "",
  href,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  const baseClass = `inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={baseClass}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={baseClass} {...props}>
      {children}
    </button>
  );
}
