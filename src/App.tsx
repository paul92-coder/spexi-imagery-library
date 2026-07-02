import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import Index from "./pages/Index";
import UseCasePage from "./pages/UseCasePage";
import ProductTypePage from "./pages/ProductTypePage";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./hooks/useAuth";
import { MediaOverridesProvider } from "./hooks/useMediaOverrides";

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <MediaOverridesProvider>
        <Toaster />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/use-case/:useCaseId" element={<UseCasePage />} />
          <Route path="/use-case/:useCaseId/:mediaId" element={<UseCasePage />} />
          <Route path="/product-type/:type" element={<ProductTypePage />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MediaOverridesProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
