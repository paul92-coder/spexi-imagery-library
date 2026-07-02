import { Link, useLocation, useNavigate } from "react-router-dom";
import spexiLogo from "@/assets/spexi-logo.webp";

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
        <Link to="/" onClick={handleLogoClick} className="flex items-center gap-2.5">
          <img src={spexiLogo} alt="Spexi" className="h-7 w-auto" />
          <span className="font-heading text-lg font-semibold tracking-tight text-foreground">Spexi</span>
        </Link>
        <Link
          to="/product-type/splat"
          className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
        >
          Imagery Library
        </Link>
      </div>
    </header>
  );
};

export default Header;
