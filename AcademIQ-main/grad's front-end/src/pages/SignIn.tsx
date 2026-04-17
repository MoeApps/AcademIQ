import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchHealth, getApiBase } from "@/lib/api";

const SignIn = () => {
  const navigate = useNavigate();
  const { setUsername, setStudentId } = useUser();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    studentId: "",
  });
  const [errors, setErrors] = useState({
    username: "",
    password: "",
    general: "",
  });

  useEffect(() => {
    const onFill = (e: Event) => {
      const ce = e as CustomEvent<{ studentId?: string }>;
      const sid = ce.detail?.studentId;
      if (sid && typeof sid === "string") {
        setFormData((prev) => (prev.studentId.trim() ? prev : { ...prev, studentId: sid }));
      }
    };
    window.addEventListener("academiq-fill-student-id", onFill);
    return () => window.removeEventListener("academiq-fill-student-id", onFill);
  }, []);

  const validateForm = () => {
    const newErrors = { username: "", password: "", general: "" };
    let isValid = true;

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
      isValid = false;
    } else if (formData.username.trim().length < 3) {
      newErrors.username = "Username must be at least 3 characters";
      isValid = false;
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
      isValid = false;
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({ username: "", password: "", general: "" });

    try {
      await fetchHealth();
      await new Promise((resolve) => setTimeout(resolve, 300));
      setUsername(formData.username.trim());
      const sid =
        formData.studentId.trim() || `user_${formData.username.trim().replace(/\s+/g, "_")}`;
      setStudentId(sid);
      toast({
        title: "Welcome back!",
        description: "Signed in. Dashboard loads ML insights when the extension has synced.",
      });
      navigate("/dashboard");
    } catch {
      setErrors({
        username: "",
        password: "",
        general: `Cannot reach AcademIQ API at ${getApiBase()}. Start the backend (uvicorn) and check VITE_API_URL.`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-auth-start to-auth-end p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-card p-8 shadow-2xl">
          <div className="mb-8 flex justify-center">
            <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
              <GraduationCap className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-foreground">AcademIQ</span>
            </Link>
          </div>

          <h1 className="mb-2 text-center text-2xl font-bold text-primary">Sign In</h1>
          <p className="mb-6 text-center text-xs text-muted-foreground">
            API: {getApiBase()}
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.general && (
              <div className="rounded-lg bg-destructive/10 p-3 text-center text-sm text-destructive">
                {errors.general}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" className="block text-card-foreground">
                Username
              </Label>
              <Input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                placeholder="Your display name"
                className={`h-11 ${errors.username ? "border-destructive focus-visible:ring-destructive" : ""}`}
                disabled={isLoading}
                autoComplete="username"
              />
              {errors.username && <p className="text-sm text-destructive">{errors.username}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="block text-card-foreground">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Demo password (6+ characters)"
                className={`h-11 ${errors.password ? "border-destructive focus-visible:ring-destructive" : ""}`}
                disabled={isLoading}
                autoComplete="current-password"
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="studentId" className="block text-card-foreground">
                Student ID <span className="text-muted-foreground">(from browser extension)</span>
              </Label>
              <Input
                id="studentId"
                name="studentId"
                type="text"
                value={formData.studentId}
                onChange={handleChange}
                placeholder="e.g. stu_vg23ia4l — must match extension + Sync"
                className="h-11"
                disabled={isLoading}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Same ID as the AcademIQ extension (see popup after visiting Moodle). With the extension installed, this
                field can fill automatically on this page. This project has no PHP — Moodle runs on your school&apos;s
                servers.
              </p>
            </div>

            <Button type="submit" className="h-11 w-full text-base" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
