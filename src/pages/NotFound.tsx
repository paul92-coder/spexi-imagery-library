import { Link } from "react-router-dom";
import Header from "@/components/Header";

const NotFound = () => (
  <div className="min-h-screen bg-background">
    <Header />
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <h1 className="font-heading text-4xl font-bold text-foreground">404</h1>
      <p className="text-muted-foreground">This page doesn't exist.</p>
      <Link to="/" className="text-sm font-medium text-primary hover:underline">
        Back to the Imagery Library
      </Link>
    </div>
  </div>
);

export default NotFound;
