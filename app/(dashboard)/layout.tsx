import Navbar from "@/components/shared/Navbar";
import BotonFlotante from "@/components/shared/BotonFlotante";
import AuthGuard from "@/components/shared/AuthGuard";
import Toaster from "@/components/shared/Toaster";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="container mx-auto px-4 py-6 max-w-7xl">
          {children}
        </main>
        <BotonFlotante />
        <Toaster />
      </div>
    </AuthGuard>
  );
}