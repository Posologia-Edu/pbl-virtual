import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { DoorOpen, BookOpen } from "lucide-react";

export default function Rooms() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [rooms, setRooms] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("rooms")
      .select("*, groups(name)")
      .order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setRooms(data); });
  }, [user]);

  return (
    <Layout>
      <div className="flex-1 overflow-auto p-6 lg:p-8">
        <h1 className="mb-6 text-2xl font-bold text-foreground">{t("rooms.title")}</h1>

        {rooms.length === 0 ? (
          <div className="clinical-card flex flex-col items-center py-16">
            <BookOpen className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{t("rooms.noRooms")}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <div
                key={room.id}
                onClick={() => navigate(`/session/${room.id}`)}
                className="clinical-card cursor-pointer p-5 transition-all hover:shadow-md animate-fade-in"
              >
                <div className="mb-3 flex items-center gap-2">
                  <DoorOpen className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-primary">
                    {(room.groups as any)?.name || t("rooms.group")}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-foreground">{room.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("rooms.step")} {room.current_step} • {room.status === "active" ? t("rooms.active") : t("rooms.ended")}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
