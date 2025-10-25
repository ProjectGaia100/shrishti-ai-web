import { Sidebar } from "@/components/Sidebar";
import { MapView } from "@/components/MapView";
import { ChatButton } from "@/components/ChatButton";

const Index = () => {
  return (
    <div className="flex h-screen w-full bg-gradient-primary overflow-hidden">
      <Sidebar />
      <main className="flex-1 relative">
        <MapView />
        <ChatButton />
      </main>
    </div>
  );
};

export default Index;
