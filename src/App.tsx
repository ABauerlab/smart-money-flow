import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AccessCodeProvider } from "@/contexts/AccessCodeContext";
import { AccessCodeGate } from "@/components/AccessCodeGate";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import Glossary from "./pages/Glossary";
import CryptoAnalysis from "./pages/CryptoAnalysis";
import Guide from "./pages/Guide";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => (
  <AccessCodeGate>{children}</AccessCodeGate>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AccessCodeProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/guia" element={<Guide />} />
            <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/glossario" element={<ProtectedRoute><Glossary /></ProtectedRoute>} />
            <Route path="/analise-ia" element={<ProtectedRoute><CryptoAnalysis /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AccessCodeProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
