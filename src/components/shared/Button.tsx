import Link from "next/link";

interface ButtonProps {
  children: React.ReactNode;
  href?: string;
  variant?: "primary" | "secondary";
  className?: string;
  onClick?: () => void;
}

export default function Button({
  children,
  href,
  variant = "primary",
  className = "",
  onClick,
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-md px-6 py-3 text-sm font-semibold transition-all duration-200";
  const variants = {
    primary:
      "bg-sasa-gold-600 text-sasa-red-900 hover:bg-sasa-gold-400 shadow-md hover:shadow-lg",
    secondary:
      "border-2 border-sasa-gold-400 text-sasa-gold-400 hover:bg-sasa-gold-400/10",
  };

  const classes = `${base} ${variants[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={classes}>
      {children}
    </button>
  );
}
