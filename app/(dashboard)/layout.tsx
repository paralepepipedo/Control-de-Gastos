import Navbar from "@/components/shared/Navbar";
import BotonFlotante from "@/components/shared/BotonFlotante";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {children}
      </main>
      <BotonFlotante />
    </div>
  );
}
