import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { GraduationCap, ArrowLeft, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import { useCookieConsent } from "@/hooks/useCookieConsent";

const rise = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };

export default function Cookies() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { reopenBanner } = useCookieConsent();

  return (
    <div className="min-h-screen bg-[hsl(25,30%,92%)] text-foreground overflow-x-hidden flex flex-col">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(30,40%,88%)] via-[hsl(25,25%,90%)] to-[hsl(210,30%,88%)]" />
      </div>

      <motion.nav initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="fixed top-4 inset-x-0 z-50 flex justify-center px-4">
        <div className="flex items-center gap-2 rounded-full bg-white/50 backdrop-blur-xl border border-white/60 shadow-lg shadow-black/5 px-3 py-2 max-w-3xl w-full">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 hover:bg-primary/15 transition-colors">
            <ArrowLeft className="h-4 w-4 text-primary" />
            <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center">
              <GraduationCap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm text-primary">{t("app.name")}</span>
          </button>
          <div className="flex-1 text-center">
            <span className="text-sm font-semibold text-foreground/70">Política de Cookies</span>
          </div>
        </div>
      </motion.nav>

      <section className="flex-1 pt-28 pb-16 px-6">
        <motion.div initial="hidden" animate="visible" variants={rise} className="mx-auto max-w-3xl">
          <div className="rounded-3xl bg-white/60 backdrop-blur-xl border border-white/60 shadow-lg p-8 sm:p-12 space-y-6">
            <h1 className="text-3xl font-extrabold tracking-tight">Política de Cookies</h1>
            <p className="text-sm text-foreground/50">Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>

            {/* Manage preferences CTA */}
            <div className="rounded-2xl bg-primary/5 border border-primary/10 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <h3 className="font-bold text-sm text-foreground">Gerencie suas preferências</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Você pode alterar suas preferências de cookies a qualquer momento.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={reopenBanner} className="rounded-full gap-1.5 shrink-0">
                <Settings className="h-3.5 w-3.5" />
                Gerenciar cookies
              </Button>
            </div>

            <div className="space-y-5 text-foreground/70 text-sm leading-relaxed">
              <section>
                <h2 className="text-lg font-bold text-foreground mb-2">1. O que são Cookies?</h2>
                <p>Cookies são pequenos arquivos de texto armazenados no seu navegador quando você visita um site. Eles são amplamente utilizados para fazer sites funcionarem de forma eficiente e fornecer informações aos proprietários.</p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-foreground mb-2">2. Cookies que Utilizamos</h2>
                <div className="space-y-4">
                  <div className="rounded-xl bg-muted/30 p-4">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Cookies Essenciais
                    </h3>
                    <p className="mt-1">Necessários para autenticação e funcionamento da plataforma. Incluem tokens de sessão do Supabase Auth. <strong>Não podem ser desativados.</strong></p>
                  </div>
                  <div className="rounded-xl bg-muted/30 p-4">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      Cookies Analíticos
                    </h3>
                    <p className="mt-1">Coletam dados anônimos sobre páginas visitadas, cliques em CTAs e tempo de navegação. Usados para entender o comportamento do visitante e otimizar a plataforma.</p>
                    <ul className="mt-2 list-disc list-inside text-xs space-y-1 text-foreground/50">
                      <li>Páginas visitadas e timestamps</li>
                      <li>Cliques em botões de ação (CTAs)</li>
                      <li>Plano de interesse visualizado</li>
                    </ul>
                  </div>
                  <div className="rounded-xl bg-muted/30 p-4">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      Cookies Funcionais
                    </h3>
                    <p className="mt-1">Armazenam suas preferências como idioma selecionado (português, inglês ou espanhol) e configurações de interface.</p>
                  </div>
                  <div className="rounded-xl bg-muted/30 p-4">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-purple-500" />
                      Cookies de Marketing
                    </h3>
                    <p className="mt-1">Permitem rastrear a origem do tráfego através de parâmetros UTM. Usados para medir a eficácia de campanhas e segmentação de leads.</p>
                    <ul className="mt-2 list-disc list-inside text-xs space-y-1 text-foreground/50">
                      <li>Parâmetros UTM (source, medium, campaign)</li>
                      <li>Origem do tráfego</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-lg font-bold text-foreground mb-2">3. localStorage</h2>
                <p>Além de cookies, utilizamos localStorage do navegador para armazenar tokens de autenticação, preferências de consentimento e dados analíticos temporários. Esses dados permanecem no seu dispositivo e podem ser removidos limpando os dados do navegador.</p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-foreground mb-2">4. Gerenciamento de Cookies</h2>
                <p>Você pode gerenciar suas preferências de cookies a qualquer momento clicando no botão "Gerenciar cookies" acima ou configurando seu navegador para recusar cookies. Cookies essenciais não podem ser desativados pois são necessários para o funcionamento da plataforma.</p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-foreground mb-2">5. Retenção de Dados</h2>
                <p>Os dados analíticos coletados são armazenados por até 12 meses e usados exclusivamente para fins de melhoria da plataforma. Dados de marketing (UTM) são vinculados ao perfil do usuário caso ele crie uma conta.</p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-foreground mb-2">6. Contato</h2>
                <p>Para dúvidas sobre o uso de cookies, entre em contato pelo email sergio.araujo@ufrn.br ou acesse nossa <a href="/public-contact" className="text-primary underline">página de contato</a>.</p>
              </section>
            </div>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
