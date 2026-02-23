import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Check, ArrowRight, GraduationCap, Sparkles, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TIERS = {
  starter: {
    price_id: "price_1T3yHIHRnDD6dn6iLSvmwfFh",
    product_id: "prod_U22MNDlQOLbcmr",
    price: "R$ 49",
    icon: GraduationCap,
    color: "from-emerald-500 to-teal-500",
    features: [
      "Até 30 alunos",
      "3 salas simultâneas",
      "AI Co-tutor básico (50 interações/mês)",
      "Chat e whiteboard",
      "Cenários pré-definidos",
      "Suporte por email",
    ],
  },
  professional: {
    price_id: "price_1T3yHbHRnDD6dn6iklmghD9E",
    product_id: "prod_U22Mmhx6hjqTAQ",
    price: "R$ 149",
    icon: Sparkles,
    color: "from-primary to-accent",
    popular: true,
    features: [
      "Até 150 alunos",
      "Salas ilimitadas",
      "AI Co-tutor avançado (500 interações/mês)",
      "Geração de cenários com IA",
      "Relatórios completos",
      "Avaliação por pares",
      "Badges e gamificação",
      "Suporte prioritário",
    ],
  },
  enterprise: {
    price_id: "price_1T3yHuHRnDD6dn6iqPedb6Cp",
    product_id: "prod_U22M2hz40qmRsN",
    price: "R$ 399",
    icon: Building2,
    color: "from-violet-500 to-purple-600",
    features: [
      "Alunos ilimitados",
      "Salas ilimitadas",
      "AI Co-tutor ilimitado",
      "White-label completo",
      "Branding personalizado",
      "Analytics avançados",
      "Integração SSO",
      "Gerente de conta dedicado",
      "SLA 99.9%",
    ],
  },
};

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.15 } } };
const rise = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };

export default function Pricing() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (priceId: string, tierKey: string) => {
    setLoading(tierKey);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar checkout");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(25,30%,92%)] text-foreground overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(30,40%,88%)] via-[hsl(25,25%,90%)] to-[hsl(210,30%,88%)]" />
        <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-gradient-to-bl from-[hsl(210,60%,85%)]/40 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Nav */}
      <nav className="fixed top-4 inset-x-0 z-50 flex justify-center px-4">
        <div className="flex items-center gap-2 rounded-full bg-white/50 backdrop-blur-xl border border-white/60 shadow-lg shadow-black/5 px-4 py-2">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2">
            <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center">
              <GraduationCap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm text-primary">{t("app.name")}</span>
          </button>
          <span className="text-sm font-medium text-foreground/60 px-3">Planos</span>
        </div>
      </nav>

      {/* Header */}
      <section className="pt-32 pb-16 px-6 text-center">
        <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-3xl mx-auto">
          <motion.span variants={rise} className="inline-block rounded-full bg-primary/10 text-primary px-5 py-1.5 text-sm font-semibold mb-5">
            Planos & Preços
          </motion.span>
          <motion.h1 variants={rise} className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6">
            Escolha o plano ideal
            <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              para sua instituição
            </span>
          </motion.h1>
          <motion.p variants={rise} className="text-lg text-foreground/60 max-w-xl mx-auto">
            Comece gratuitamente e escale conforme sua necessidade. Todos os planos incluem 14 dias de teste grátis.
          </motion.p>
        </motion.div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-28 px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={stagger}
          className="mx-auto max-w-6xl grid md:grid-cols-3 gap-6"
        >
          {(Object.entries(TIERS) as [string, typeof TIERS.starter & { popular?: boolean }][]).map(
            ([key, tier]) => {
              const Icon = tier.icon;
              const isPopular = tier.popular;
              return (
                <motion.div
                  key={key}
                  variants={rise}
                  className={`relative rounded-3xl backdrop-blur-xl border p-8 flex flex-col transition-all duration-300 hover:-translate-y-1 ${
                    isPopular
                      ? "bg-white/70 border-primary/30 shadow-xl shadow-primary/10 scale-[1.03]"
                      : "bg-white/50 border-white/60 shadow-sm hover:shadow-lg"
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="rounded-full bg-primary text-primary-foreground px-5 py-1.5 text-xs font-bold shadow-lg">
                        Mais popular
                      </span>
                    </div>
                  )}

                  <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${tier.color} mb-5`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>

                  <h3 className="text-xl font-bold capitalize mb-1">{key}</h3>

                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-extrabold">{tier.price}</span>
                    <span className="text-foreground/50 text-sm">/mês</span>
                  </div>

                  <ul className="space-y-3 mb-8 flex-1">
                    {tier.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/70">
                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Button
                    size="lg"
                    onClick={() => handleSubscribe(tier.price_id, key)}
                    disabled={loading === key}
                    className={`rounded-full w-full h-12 font-semibold transition-all ${
                      isPopular
                        ? "shadow-lg shadow-primary/25 hover:shadow-xl"
                        : "bg-foreground/90 hover:bg-foreground text-white"
                    }`}
                    variant={isPopular ? "default" : "secondary"}
                  >
                    {loading === key ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <>
                        Assinar {key}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </motion.div>
              );
            }
          )}
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-foreground/40">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground/60">{t("app.name")}</span>
          </div>
          <p>{t("app.copyright", { year: new Date().getFullYear() })}</p>
        </div>
      </footer>

      
    </div>
  );
}
