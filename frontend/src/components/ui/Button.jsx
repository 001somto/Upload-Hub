// components/ui/Button.jsx
// WHAT THIS FILE IS: the website's button.
// WHAT IT DOES: one button component for every action, so all buttons look and behave the
// same. Variants: "primary" (main green action), "secondary" (white), "soft" (pale green),
// "ghost" (text only), "dark", "danger" and "dangerSoft". Sizes: "sm", "md", "lg".
// Pass `to="/path"` to make it a link to another page, or `href` for an outside link.
// Pass `loading` to show a spinner and disable it while something is being saved.
//
// Example: <Button variant="secondary" icon={Upload} onClick={save}>Upload</Button>

import { Link } from "react-router-dom";
import { RefreshCw } from "../../lib/icons";

const VARIANTS = {
  primary: "bg-leaf-600 text-white shadow-sm hover:bg-leaf-700 active:bg-leaf-800",
  dark: "bg-leaf-900 text-white hover:bg-leaf-800 active:bg-leaf-950",
  secondary: "border border-line bg-white text-ink hover:border-leaf-300 hover:bg-leaf-50",
  soft: "bg-leaf-100 text-leaf-800 hover:bg-leaf-200",
  ghost: "text-leaf-800 hover:bg-leaf-100",
  danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
  dangerSoft: "bg-red-50 text-red-700 hover:bg-red-100",
  onDark: "bg-white text-leaf-900 hover:bg-leaf-100",
  outlineOnDark: "border border-white/30 text-white hover:bg-white/10",
};

const SIZES = {
  sm: "h-9 gap-1.5 px-3 text-sm",
  md: "h-11 gap-2 px-4 text-sm",
  lg: "h-12 gap-2 px-6 text-base",
};

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon: Icon,
  iconRight: IconRight,
  to,
  href,
  className = "",
  children,
  disabled = false,
  type = "button",
  ...rest
}) {
  const classes = `inline-flex select-none items-center justify-center rounded-xl font-semibold transition duration-200 disabled:pointer-events-none disabled:opacity-60 ${VARIANTS[variant]} ${SIZES[size]} ${className}`;

  const content = (
    <>
      {loading ? (
        <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : Icon ? (
        <Icon className="h-4 w-4" aria-hidden="true" />
      ) : null}
      {children}
      {IconRight && !loading ? <IconRight className="h-4 w-4" aria-hidden="true" /> : null}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {content}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={classes} {...rest}>
        {content}
      </a>
    );
  }
  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {content}
    </button>
  );
}
