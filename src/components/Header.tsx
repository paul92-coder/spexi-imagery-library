import { Link, useLocation, useNavigate } from "react-router-dom";
import spexiLogo from "@/assets/spexi-logo.webp";

const PRODUCT_LINKS = [
  { to: "/product-type/ortho", label: "Orthomosaics" },
  { to: "/product-type/panorama", label: "360° Panoramas" },
  { to: "/product-type/splat", label: "Gaussian Splats" },
  { to: "/product-type/api", label: "Static Images" },
];

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const handleLogoClick = (e: React.MouseEvent) => {
    if (location.pathname === "/") {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent("spexi:reset-home"));
    } else {
      e.preventDefault();
      navigate("/");
      setTimeout(() => window.dispatchEvent(new CustomEvent("spexi:reset-home")), 0);
    }
  };
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <Link to="/" onClick={handleLogoClick} aria-label="Spexi home" className="flex items-center gap-2.5">
          <img src={spexiLogo} alt="" className="h-7 w-auto" />
          <span className="font-heading text-lg font-semibold tracking-tight text-foreground">Spexi</span>
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-6">
          <details className="group relative hidden sm:block">
            <summary className="cursor-pointer list-none text-sm text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
              Products
            </summary>
            <div className="absolute right-0 z-10 mt-2 w-56 rounded-lg border border-border bg-background/95 p-1.5 shadow-lg backdrop-blur-xl">
              {PRODUCT_LINKS.map((p) => (
                <Link
                  key={p.to}
                  to={p.to}
                  className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                >
                  {p.label}
                </Link>
              ))}
            </div>
          </details>
          <Link
            to="/#use-cases"
            state={{ scrollTarget: "use-cases" }}
            className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
          >
            Use Cases
          </Link>
          <a
            href="https://www.spexi.com/book-a-demo"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-transform hover:scale-105"
          >
            Request Access
          </a>
        </nav>
      </div>
    </header>
  );
};

export default Header;
