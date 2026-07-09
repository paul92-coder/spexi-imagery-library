import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  to?: string;
}

const Breadcrumbs = ({ items }: { items: Crumb[] }) => (
  <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
    {items.map((item, i) => (
      <span key={i} className="flex items-center gap-1.5">
        {i > 0 && <ChevronRight size={12} className="text-muted-foreground/60" aria-hidden="true" />}
        {item.to ? (
          <Link to={item.to} className="transition-colors hover:text-foreground">
            {item.label}
          </Link>
        ) : (
          <span aria-current="page" className="text-foreground">
            {item.label}
          </span>
        )}
      </span>
    ))}
  </nav>
);

export default Breadcrumbs;
