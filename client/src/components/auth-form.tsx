import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PasswordStrengthMeter } from "@/components/password-strength";
import { Loader2 } from "lucide-react";

// Login schema
const loginSchema = z.object({
  username: z.string().min(1, { message: "Username is required" }),
  password: z.string().min(1, { message: "Password is required" }),
  rememberMe: z.boolean().optional()
});

// Registration schema with validation
const registrationSchema = insertUserSchema.extend({
  displayName: z.string().min(2, { message: "Display name must be at least 2 characters" }),
  email: z.string().email({ message: "Invalid email address" }),
  username: z.string().min(3, { message: "Username must be at least 3 characters" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
  confirmPassword: z.string(),
  terms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the terms and conditions" }),
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegistrationFormValues = z.infer<typeof registrationSchema>;

export function AuthForm() {
  const [activeTab, setActiveTab] = useState("login");
  const { loginMutation, registerMutation } = useAuth();
  
  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: false
    }
  });
  
  // Registration form
  const registerForm = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      displayName: "",
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
      terms: false
    }
  });
  
  // Handle login submission
  const onLoginSubmit = (values: LoginFormValues) => {
    loginMutation.mutate({
      username: values.username,
      password: values.password
    });
  };
  
  // Handle registration submission
  const onRegisterSubmit = (values: RegistrationFormValues) => {
    const { confirmPassword, terms, ...userData } = values;
    registerMutation.mutate(userData);
  };
  
  return (
    <Tabs 
      defaultValue="login" 
      value={activeTab} 
      onValueChange={setActiveTab}
      className="w-full max-w-md"
    >
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="login">Sign In</TabsTrigger>
        <TabsTrigger value="register">Create Account</TabsTrigger>
      </TabsList>
      
      {/* Login Form */}
      <TabsContent value="login">
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input 
                  id="username"
                  type="text"
                  {...loginForm.register("username")}
                  className="rounded-lg"
                />
                {loginForm.formState.errors.username && (
                  <p className="text-sm text-destructive">{loginForm.formState.errors.username.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password"
                  type="password"
                  {...loginForm.register("password")}
                  className="rounded-lg"
                />
                {loginForm.formState.errors.password && (
                  <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="remember-me" 
                    {...loginForm.register("rememberMe")}
                  />
                  <Label htmlFor="remember-me" className="text-sm text-muted-foreground">
                    Remember me
                  </Label>
                </div>
                
                <Button variant="link" className="text-primary p-0 h-auto">
                  Forgot password?
                </Button>
              </div>
              
              <Button 
                type="submit" 
                className="w-full rounded-lg bg-primary hover:bg-primary/90"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Sign In
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>
              
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-lg border-primary text-primary"
                onClick={() => setActiveTab("register")}
              >
                Create new account
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>
      
      {/* Registration Form */}
      <TabsContent value="register">
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input 
                  id="displayName"
                  type="text"
                  {...registerForm.register("displayName")}
                  className="rounded-lg"
                />
                {registerForm.formState.errors.displayName && (
                  <p className="text-sm text-destructive">{registerForm.formState.errors.displayName.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email"
                  type="email"
                  {...registerForm.register("email")}
                  className="rounded-lg"
                />
                {registerForm.formState.errors.email && (
                  <p className="text-sm text-destructive">{registerForm.formState.errors.email.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reg-username">Username</Label>
                <Input 
                  id="reg-username"
                  type="text"
                  {...registerForm.register("username")}
                  className="rounded-lg"
                />
                {registerForm.formState.errors.username && (
                  <p className="text-sm text-destructive">{registerForm.formState.errors.username.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reg-password">Password</Label>
                <Input 
                  id="reg-password"
                  type="password"
                  {...registerForm.register("password")}
                  className="rounded-lg"
                />
                <PasswordStrengthMeter password={registerForm.watch("password")} />
                {registerForm.formState.errors.password && (
                  <p className="text-sm text-destructive">{registerForm.formState.errors.password.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input 
                  id="confirm-password"
                  type="password"
                  {...registerForm.register("confirmPassword")}
                  className="rounded-lg"
                />
                {registerForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">{registerForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>
              
              <div className="flex items-start gap-2 mt-4">
                <Checkbox 
                  id="terms" 
                  {...registerForm.register("terms")}
                  className="mt-1"
                  required
                />
                <Label htmlFor="terms" className="text-sm text-muted-foreground">
                  I agree to the <span className="text-primary hover:underline cursor-pointer">Terms of Service</span> and <span className="text-primary hover:underline cursor-pointer">Privacy Policy</span>
                </Label>
              </div>
              {registerForm.formState.errors.terms && (
                <p className="text-sm text-destructive -mt-2">{registerForm.formState.errors.terms.message}</p>
              )}
              
              <Button 
                type="submit" 
                className="w-full rounded-lg bg-primary hover:bg-primary/90"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Create Account
              </Button>
              
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto text-primary"
                  onClick={() => setActiveTab("login")}
                >
                  Sign in
                </Button>
              </p>
            </form>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
