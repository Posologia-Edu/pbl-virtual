import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { GraduationCap, ArrowLeft } from "lucide-react";
import Footer from "@/components/Footer";

const rise = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };

export default function Privacy() {
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
            <span className="text-sm font-semibold text-foreground/70">Política de Privacidade</span>
          </div>
        </div>
      </motion.nav>

      <section className="flex-1 pt-28 pb-16 px-6">
        <motion.div initial="hidden" animate="visible" variants={rise} className="mx-auto max-w-3xl">
          <div className="rounded-3xl bg-white/60 backdrop-blur-xl border border-white/60 shadow-lg p-8 sm:p-12 space-y-6">
            <h1 className="text-3xl font-extrabold tracking-tight">Política de Privacidade</h1>
            <p className="text-sm text-foreground/50">Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>

            <div className="space-y-5 text-foreground/70 text-sm leading-relaxed">
              <section>
                <h2 className="text-lg font-bold text-foreground mb-2">1. Dados Coletados</h2>
                <p>Coletamos as seguintes informações: nome completo, email, dados de uso da plataforma (sessões, avaliações, mensagens de chat), dados de pagamento (processados pelo Stripe) e informações técnicas (IP, navegador, dispositivo).</p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-foreground mb-2">2. Finalidade do Tratamento</h2>
                <p>Seus dados são utilizados para: prestação dos serviços educacionais, geração de relatórios acadêmicos, processamento de pagamentos, comunicação sobre o serviço, e melhoria contínua da plataforma através de analytics.</p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-foreground mb-2">3. Base Legal (LGPD)</h2>
                <p>O tratamento de dados é realizado com base no consentimento do titular, na execução de contrato, no legítimo interesse e no cumprimento de obrigação legal, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).</p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-foreground mb-2">4. Compartilhamento de Dados</h2>
                <p>Seus dados podem ser compartilhados com: Supabase (infraestrutura e banco de dados), Stripe (processamento de pagamentos), provedores de IA (OpenAI, Google, Anthropic — apenas conteúdo anonimizado das sessões), e Resend (envio de emails).</p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-foreground mb-2">5. Armazenamento e Segurança</h2>
                <p>Os dados são armazenados em servidores seguros com criptografia em trânsito (TLS) e em repouso. Utilizamos Row Level Security (RLS) no banco de dados para garantir que cada usuário acesse apenas seus próprios dados.</p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-foreground mb-2">6. Direitos do Titular</h2>
                <p>Você tem direito a: acessar seus dados, solicitar correção, solicitar exclusão, revogar consentimento, e solicitar portabilidade dos dados. Para exercer seus direitos, entre em contato pelo email sergio.araujo@ufrn.br.</p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-foreground mb-2">7. Retenção de Dados</h2>
                <p>Seus dados são mantidos enquanto sua conta estiver ativa. Após exclusão da conta, os dados pessoais são removidos em até 30 dias, exceto quando houver obrigação legal de retenção.</p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-foreground mb-2">8. Cookies</h2>
                <p>Utilizamos cookies essenciais para autenticação e funcionamento da plataforma. Para mais detalhes, consulte nossa Política de Cookies.</p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-foreground mb-2">9. Contato do Encarregado (DPO)</h2>
                <p>Para questões relacionadas à proteção de dados, entre em contato com nosso encarregado: sergio.araujo@ufrn.br</p>
              </section>
            </div>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
