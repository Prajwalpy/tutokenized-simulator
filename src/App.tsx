import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SystemMetricsProvider } from "@/contexts/SystemMetricsContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import TestApp from "./TestApp";
import SimpleIndex from "./components/SimpleIndex";
import MinimalIndex from "./components/MinimalIndex";
import TestIndex1 from "./components/TestIndex1";
import TestIndex2 from "./components/TestIndex2";
import TestIndex3 from "./components/TestIndex3";
import TestIndex4 from "./components/TestIndex4";
import ErrorBoundary from "./components/ErrorBoundary";
import GifTestPage from "./pages/GifTestPage";

const queryClient = new QueryClient();

const App = () => {
  // Temporary test to see if React is working
  // return <TestApp />;
  
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SystemMetricsProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter basename={import.meta.env.MODE === 'production' || import.meta.env.VITE_GITHUB_PAGES === 'true' ? "/tutokenized-simulator" : undefined}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/simple" element={<SimpleIndex />} />
                <Route path="/minimal" element={<MinimalIndex />} />
                <Route path="/test1" element={<TestIndex1 />} />
                <Route path="/test2" element={<TestIndex2 />} />
                <Route path="/test3" element={<TestIndex3 />} />
                <Route path="/test4" element={<TestIndex4 />} />
                <Route path="/full" element={<Index />} />
                <Route path="/test" element={<TestApp />} />
                <Route path="/gif-test" element={<GifTestPage />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </SystemMetricsProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
