import { GraduationCap } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-footer text-footer-foreground">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-6 w-6" />
              <span className="text-lg font-semibold">AcademIQ</span>
            </div>
            <p className="text-sm text-footer-foreground/70">
              A supplementary learning management platform designed to enhance student performance tracking alongside Moodle LMS.
            </p>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-semibold">Quick Links</h3>
            <ul className="space-y-2 text-sm text-footer-foreground/70">
              <li>
                <a href="#" className="transition-colors hover:text-footer-foreground">
                  About Us
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-footer-foreground">
                  Contact Support
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-footer-foreground">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-semibold">University Project</h3>
            <p className="text-sm text-footer-foreground/70">
              This platform was developed as a graduation project to support student success and early intervention in academic performance.
            </p>
          </div>
        </div>
        
        <div className="mt-8 border-t border-footer-foreground/10 pt-8 text-center text-sm text-footer-foreground/60">
          <p>© {currentYear} AcademIQ. Graduation Project — All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
