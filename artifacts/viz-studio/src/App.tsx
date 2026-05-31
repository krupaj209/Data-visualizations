import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Home from "@/pages/Home";
import CeDetail from "@/pages/CeDetail";
import CePlanReview from "@/pages/CePlanReview";
import Embed from "@/pages/Embed";
import DeckEmbed from "@/pages/DeckEmbed";
import StyleGuide from "@/pages/StyleGuide";
import Triage from "@/pages/Triage";
import TriageQuestions from "@/pages/TriageQuestions";
import QuestionBank from "@/pages/QuestionBank";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/ce/:slug/review" component={CePlanReview} />
      <Route path="/ce/:slug" component={CeDetail} />
      <Route path="/embed/:ceSlug/:pageType/:sectionId" component={DeckEmbed} />
      <Route path="/embed/:id" component={Embed} />
      <Route path="/triage/questions" component={TriageQuestions} />
      <Route path="/triage" component={Triage} />
      <Route path="/question-bank" component={QuestionBank} />
      <Route path="/style" component={StyleGuide} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
