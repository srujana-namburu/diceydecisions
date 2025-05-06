import { useEffect } from "react";
import { AuthForm } from "@/components/auth-form";
import { Logo } from "@/components/logo";
import { Dice } from "@/components/ui/dice";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

export default function AuthPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  // Redirect if already logged in
  useEffect(() => {
    if (user && !isLoading) {
      setLocation("/");
    }
  }, [user, isLoading, setLocation]);
  
  if (isLoading) return null;
  if (user) return null;
  
  return (
    <div className="min-h-screen dice-bg flex flex-col md:flex-row">
      {/* Left Side - Auth Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-10">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center mb-8">
            <Logo size="lg" className="justify-center mb-2" />
            <p className="text-neutral-600">Let the dice decide!</p>
          </div>
          
          <AuthForm />
        </div>
      </div>
      
      {/* Right Side - Hero Section (hidden on mobile) */}
      <div className="hidden md:flex flex-1 bg-gradient-to-br from-primary/90 to-secondary/90 text-white p-10 items-center justify-center">
        <div className="max-w-md space-y-6">
          <h2 className="font-heading text-4xl font-bold">
            Decision-making made fun and fair!
          </h2>
          
          <p className="text-lg opacity-90">
            Create decision rooms, invite friends or colleagues, and let the dice help make your choices.
          </p>
          
          <div className="pt-6 space-y-4">
            <FeatureItem title="Create Decision Rooms">
              Set up rooms for any kind of decision you need to make
            </FeatureItem>
            
            <FeatureItem title="Invite Others">
              Share the room code and collaborate on decisions
            </FeatureItem>
            
            <FeatureItem title="Fair Results">
              Let the app determine the winner with optional tiebreakers
            </FeatureItem>
          </div>
          
          <div className="pt-6 flex justify-center">
            <div className="flex space-x-2">
              <Dice value={2} color="white" size="md" />
              <Dice value={5} color="white" size="md" />
              <Dice value={4} color="white" size="md" className="dice-animation" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="flex space-x-3">
      <div className="flex-shrink-0 h-6 w-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div>
        <h3 className="font-medium text-lg">{title}</h3>
        <p className="opacity-80">{children}</p>
      </div>
    </div>
  );
}
