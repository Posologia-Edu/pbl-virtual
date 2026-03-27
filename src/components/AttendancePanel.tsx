import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import {
  MapPin, QrCode, Check, Clock, RefreshCw, Settings2,
  UserCheck, AlertCircle, Loader2, Navigation,
} from "lucide-react";

interface AttendancePanelProps {
  roomId: string;
  sessionId?: string;
  isProfessor: boolean;
  participants: any[];
}

interface AttendanceRecord {
  id: string;
  student_id: string;
  method: string;
  checked_in_at: string;
  latitude?: number;
  longitude?: number;
}

export default function AttendancePanel({
  roomId,
  sessionId,
  isProfessor,
  participants,
}: AttendancePanelProps) {
  const { user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Professor settings
  const [showSettings, setShowSettings] = useState(false);
  const [geoLat, setGeoLat] = useState("");
  const [geoLng, setGeoLng] = useState("");
  const [geoRadius, setGeoRadius] = useState("100");
  const [qrCode, setQrCode] = useState("");
  const [roomGeo, setRoomGeo] = useState<{ lat: number | null; lng: number | null; radius: number; qr: string | null }>({
    lat: null, lng: null, radius: 100, qr: null,
  });

  const alreadyCheckedIn = records.some((r) => r.student_id === user?.id);

  // Fetch room geo settings
  useEffect(() => {
    const fetchRoom = async () => {
      const { data } = await supabase
        .from("rooms")
        .select("geo_latitude, geo_longitude, geo_radius_meters, attendance_qr_code")
        .eq("id", roomId)
        .single();
      if (data) {
        setRoomGeo({
          lat: data.geo_latitude,
          lng: data.geo_longitude,
          radius: data.geo_radius_meters || 100,
          qr: data.attendance_qr_code,
        });
        setGeoLat(data.geo_latitude?.toString() || "");
        setGeoLng(data.geo_longitude?.toString() || "");
        setGeoRadius((data.geo_radius_meters || 100).toString());
        setQrCode(data.attendance_qr_code || "");
      }
    };
    fetchRoom();
  }, [roomId]);

  // Fetch attendance records
  const fetchRecords = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    const { data } = await supabase
      .from("attendance")
      .select("*")
      .eq("room_id", roomId)
      .eq("session_id", sessionId);
    if (data) setRecords(data as AttendanceRecord[]);
    setLoading(false);
  }, [roomId, sessionId]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Realtime subscription
  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel(`attendance-${sessionId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "attendance",
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        setRecords((prev) => {
          if (prev.some((r) => r.id === payload.new.id)) return prev;
          return [...prev, payload.new as AttendanceRecord];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  // Distance calculation (Haversine)
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Geolocation check-in
  const checkInGeo = async () => {
    if (!sessionId || !user || alreadyCheckedIn) return;
    setCheckingIn(true);
    setGeoError(null);

    if (!navigator.geolocation) {
      setGeoError("Geolocalização não suportada neste navegador.");
      setCheckingIn(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Check if within radius
        if (roomGeo.lat != null && roomGeo.lng != null) {
          const dist = getDistance(latitude, longitude, roomGeo.lat, roomGeo.lng);
          if (dist > roomGeo.radius) {
            setGeoError(`Você está a ${Math.round(dist)}m da sala. Raio permitido: ${roomGeo.radius}m.`);
            setCheckingIn(false);
            return;
          }
        }

        const { error } = await supabase.from("attendance").insert({
          room_id: roomId,
          session_id: sessionId,
          student_id: user.id,
          method: "geolocation",
          latitude,
          longitude,
        });

        if (error) {
          if (error.code === "23505") {
            toast({ title: "Você já registrou presença nesta sessão." });
          } else {
            toast({ title: "Erro ao registrar presença", description: error.message, variant: "destructive" });
          }
        } else {
          toast({ title: "✅ Presença registrada com sucesso!" });
        }
        setCheckingIn(false);
      },
      (err) => {
        setGeoError(
          err.code === 1 ? "Permissão de localização negada. Ative nas configurações do navegador."
            : "Não foi possível obter sua localização. Tente novamente."
        );
        setCheckingIn(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // QR Code check-in
  const [showQrInput, setShowQrInput] = useState(false);
  const [qrInput, setQrInput] = useState("");

  const checkInQr = async () => {
    if (!sessionId || !user || alreadyCheckedIn) return;
    if (qrInput.trim() !== roomGeo.qr) {
      toast({ title: "Código QR inválido", variant: "destructive" });
      return;
    }

    setCheckingIn(true);
    const { error } = await supabase.from("attendance").insert({
      room_id: roomId,
      session_id: sessionId,
      student_id: user.id,
      method: "qrcode",
    });

    if (error) {
      if (error.code === "23505") {
        toast({ title: "Você já registrou presença nesta sessão." });
      } else {
        toast({ title: "Erro ao registrar presença", description: error.message, variant: "destructive" });
      }
    } else {
      toast({ title: "✅ Presença registrada via QR Code!" });
    }
    setCheckingIn(false);
    setShowQrInput(false);
  };

  // Professor: save settings
  const saveSettings = async () => {
    const newQr = qrCode || `${roomId}-${Date.now()}`;
    const { error } = await supabase.from("rooms").update({
      geo_latitude: geoLat ? parseFloat(geoLat) : null,
      geo_longitude: geoLng ? parseFloat(geoLng) : null,
      geo_radius_meters: parseInt(geoRadius) || 100,
      attendance_qr_code: newQr,
    }).eq("id", roomId);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      setRoomGeo({
        lat: geoLat ? parseFloat(geoLat) : null,
        lng: geoLng ? parseFloat(geoLng) : null,
        radius: parseInt(geoRadius) || 100,
        qr: newQr,
      });
      setQrCode(newQr);
      toast({ title: "Configurações de frequência salvas!" });
      setShowSettings(false);
    }
  };

  // Professor: use current location
  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocalização não suportada", variant: "destructive" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLat(pos.coords.latitude.toFixed(6));
        setGeoLng(pos.coords.longitude.toFixed(6));
        toast({ title: "Localização capturada!" });
      },
      () => toast({ title: "Não foi possível obter localização", variant: "destructive" }),
      { enableHighAccuracy: true }
    );
  };

  // Generate random QR code
  const generateQrCode = () => {
    const code = `PBL-${roomId.slice(0, 8)}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    setQrCode(code);
  };

  const getParticipantName = (studentId: string) => {
    const p = participants.find((p) => p.user_id === studentId);
    return p?.full_name || "Aluno";
  };

  const presentCount = records.length;
  const totalStudents = participants.filter((p) => p.user_id !== undefined).length;

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            Frequência ({presentCount}/{totalStudents})
          </h3>
        </div>
        {isProfessor && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-3 scrollbar-thin">
        {/* Professor settings */}
        {isProfessor && showSettings && (
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
            <h4 className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">
              Configurações de Frequência
            </h4>

            {/* Geolocation */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground/70 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> Geolocalização
                </span>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={useMyLocation}>
                  <Navigation className="h-3 w-3 mr-1" /> Usar minha localização
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Latitude" value={geoLat} onChange={(e) => setGeoLat(e.target.value)} className="h-8 text-xs" />
                <Input placeholder="Longitude" value={geoLng} onChange={(e) => setGeoLng(e.target.value)} className="h-8 text-xs" />
              </div>
              <Input
                placeholder="Raio (metros)"
                value={geoRadius}
                onChange={(e) => setGeoRadius(e.target.value)}
                className="h-8 text-xs"
                type="number"
              />
            </div>

            {/* QR Code */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground/70 flex items-center gap-1.5">
                  <QrCode className="h-3.5 w-3.5" /> QR Code
                </span>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={generateQrCode}>
                  <RefreshCw className="h-3 w-3 mr-1" /> Gerar código
                </Button>
              </div>
              {qrCode && (
                <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-white">
                  <QRCodeSVG value={qrCode} size={140} level="M" />
                  <span className="text-[10px] text-muted-foreground font-mono break-all text-center">{qrCode}</span>
                </div>
              )}
            </div>

            <Button onClick={saveSettings} size="sm" className="w-full">
              Salvar Configurações
            </Button>
          </div>
        )}

        {/* Student check-in */}
        {!isProfessor && sessionId && (
          <div className="space-y-2">
            {alreadyCheckedIn ? (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
                <Check className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium text-emerald-700">Presença registrada</p>
                  <p className="text-xs text-emerald-600/70">
                    {records.find((r) => r.student_id === user?.id)?.method === "geolocation"
                      ? "Via geolocalização"
                      : records.find((r) => r.student_id === user?.id)?.method === "qrcode"
                      ? "Via QR Code"
                      : "Manual"}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Geo check-in */}
                {(roomGeo.lat != null || roomGeo.qr) && (
                  <p className="text-xs text-muted-foreground">Registre sua presença usando um dos métodos abaixo:</p>
                )}
                
                {roomGeo.lat != null && (
                  <Button
                    onClick={checkInGeo}
                    disabled={checkingIn}
                    className="w-full justify-start gap-2"
                    variant="outline"
                  >
                    {checkingIn ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MapPin className="h-4 w-4 text-primary" />
                    )}
                    Check-in por Geolocalização
                  </Button>
                )}

                {roomGeo.qr && (
                  <>
                    <Button
                      onClick={() => setShowQrInput(!showQrInput)}
                      className="w-full justify-start gap-2"
                      variant="outline"
                    >
                      <QrCode className="h-4 w-4 text-primary" />
                      Check-in por QR Code
                    </Button>
                    {showQrInput && (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Digite o código exibido..."
                          value={qrInput}
                          onChange={(e) => setQrInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && checkInQr()}
                          className="h-9 text-sm"
                        />
                        <Button onClick={checkInQr} disabled={checkingIn} size="sm" className="shrink-0">
                          {checkingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </Button>
                      </div>
                    )}
                  </>
                )}

                {!roomGeo.lat && !roomGeo.qr && (
                  <div className="flex items-center gap-2 rounded-xl bg-muted/50 border border-border px-4 py-3">
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      O professor ainda não configurou o check-in para esta sala.
                    </p>
                  </div>
                )}

                {geoError && (
                  <div className="flex items-start gap-2 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3">
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <p className="text-xs text-destructive">{geoError}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Attendance list */}
        {!showSettings && (
          <div className="space-y-1">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">
                Lista de Presença
              </h4>
              <button onClick={fetchRecords} className="text-xs text-primary hover:underline flex items-center gap-1">
                <RefreshCw className="h-3 w-3" /> Atualizar
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {participants.map((p) => {
                  const record = records.find((r) => r.student_id === p.user_id);
                  const isPresent = !!record;
                  return (
                    <div
                      key={p.user_id}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                        isPresent ? "bg-emerald-500/5" : "bg-muted/20"
                      }`}
                    >
                      <div className={`h-2 w-2 rounded-full ${isPresent ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                      <span className="text-sm flex-1 truncate">{p.full_name}</span>
                      {isPresent ? (
                        <div className="flex items-center gap-1.5">
                          {record?.method === "geolocation" && <MapPin className="h-3 w-3 text-emerald-600" />}
                          {record?.method === "qrcode" && <QrCode className="h-3 w-3 text-emerald-600" />}
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(record!.checked_in_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/60">Ausente</span>
                      )}
                    </div>
                  );
                })}

                {participants.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Nenhum participante encontrado.
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* Professor: QR Code display (always visible when configured) */}
        {isProfessor && !showSettings && roomGeo.qr && (
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <h4 className="text-xs font-semibold text-foreground/70 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <QrCode className="h-3.5 w-3.5" /> QR Code para Alunos
            </h4>
            <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-white">
              <QRCodeSVG value={roomGeo.qr} size={120} level="M" />
              <span className="text-[10px] text-muted-foreground font-mono">{roomGeo.qr}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
