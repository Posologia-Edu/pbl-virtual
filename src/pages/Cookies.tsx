import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { GraduationCap, ArrowLeft } from "lucide-react";
import Footer from "@/components/Footer";

const rise = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };

export default function Cookies() {
  const navigate = useNavigate();
  const { t } = useTranslation();

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

            <div className="space-y-5 text-foreground/70 text-sm leading-relaxed">
              <section>
                <h2 className="text-lg font-bold text-foreground mb-2">1. O que são Cookies?</h2>
                <p>Cookies são pequenos arquivos de texto armazenados no seu navegador quando você visita um site. Eles são amplamente utilizados para fazer sites funcionarem de forma eficiente e fornecer informações aos proprietários.</p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-foreground mb-2">2. Cookies que Utilizamos</h2>
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-foreground">Cookies Essenciais</h3>
                    <p>Necessários para autenticação e funcionamento da plataforma. Incluem tokens de sessão do Supabase Auth que mantêm você logado de forma segura.</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Cookies de Preferência</h3>
                    <p>Armazenam suas preferências como idioma selecionado (português, inglês ou espanhol) e configurações de interface.</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Cookies de Terceiros</h3>
                    <p>O Stripe pode utilizar cookies para processamento seguro de pagamentos. Esses cookies são regidos pela política de privacidade do Stripe.</p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-lg font-bold text-foreground mb-2">3. localStorage</h2>
                <p>Além de cookies, utilizamos localStorage do navegador para armazenar tokens de autenticação e preferências do usuário. Esses dados permanecem no seu dispositivo e podem ser removidos limpando os dados do navegador.</p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-foreground mb-2">4. Gerenciamento de Cookies</h2>
                <p>Você pode configurar seu navegador para recusar cookies. No entanto, como utilizamos apenas cookies essenciais, desabilitá-los impedirá o funcionamento adequado da plataforma, especialmente a autenticação.</p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-foreground mb-2">5. Contato</h2>
                <p>Para dúvidas sobre o uso de cookies, entre em contato pelo email sergio.araujo@ufrn.br.</p>
              </section>
            </div>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
