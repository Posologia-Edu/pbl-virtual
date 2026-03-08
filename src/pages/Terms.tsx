import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { GraduationCap, ArrowLeft } from "lucide-react";
import Footer from "@/components/Footer";

const rise = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };

export default function Terms() {
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
            <span className="text-sm font-semibold text-foreground/70">Termos de Serviço</span>
          </div>
        </div>
      </motion.nav>

      <section className="flex-1 pt-28 pb-16 px-6">
        <motion.div initial="hidden" animate="visible" variants={rise} className="mx-auto max-w-3xl">
          <div className="rounded-3xl bg-white/60 backdrop-blur-xl border border-white/60 shadow-lg p-8 sm:p-12 space-y-6">
            <h1 className="text-3xl font-extrabold tracking-tight">Termos de Serviço</h1>
            <p className="text-sm text-foreground/50">Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>

            <div className="space-y-5 text-foreground/70 text-sm leading-relaxed">
              <section>
                <h2 className="text-lg font-bold text-foreground mb-2">1. Aceitação dos Termos</h2>
                <p>Ao acessar e utilizar a plataforma PBL Virtual, você concorda com estes Termos de Serviço. Se você não concordar com qualquer parte destes termos, não deverá utilizar nossos serviços.</p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-foreground mb-2">2. Descrição do Serviço</h2>
                <p>O PBL Virtual é uma plataforma digital de aprendizagem baseada em problemas (Problem-Based Learning) destinada a instituições de ensino, professores e estudantes da área de saúde. A plataforma oferece ferramentas para sessões tutoriais, avaliações, chat em tempo real, quadro branco colaborativo e inteligência artificial como co-tutor.</p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-foreground mb-2">3. Contas de Usuário</h2>
                <p>Para utilizar os serviços, é necessário criar uma conta. Você é responsável por manter a confidencialidade de suas credenciais e por todas as atividades realizadas em sua conta. Contas de alunos e professores podem ser criadas por administradores institucionais.</p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-foreground mb-2">4. Planos e Pagamentos</h2>
                <p>O PBL Virtual oferece diferentes planos de assinatura. Os pagamentos são processados de forma segura via Stripe. Todas as assinaturas são renováveis automaticamente, podendo ser canceladas a qualquer momento através do portal do cliente.</p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-foreground mb-2">5. Propriedade Intelectual</h2>
                <p>Todo o conteúdo da plataforma, incluindo software, design, textos e logotipos, é propriedade da Posologia Produções. Os cenários e materiais criados pelos usuários permanecem de propriedade dos respectivos autores.</p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-foreground mb-2">6. Uso Aceitável</h2>
                <p>Você concorda em utilizar a plataforma apenas para fins educacionais legítimos. É proibido: compartilhar credenciais, usar bots automatizados, tentar acessar dados de outros usuários, ou utilizar a plataforma para fins ilícitos.</p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-foreground mb-2">7. Limitação de Responsabilidade</h2>
                <p>O PBL Virtual é fornecido "como está". Não garantimos disponibilidade ininterrupta do serviço. Não somos responsáveis por perdas decorrentes de falhas técnicas, interrupções temporárias ou uso inadequado da plataforma.</p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-foreground mb-2">8. Rescisão</h2>
                <p>Reservamo-nos o direito de suspender ou encerrar contas que violem estes termos. Em caso de cancelamento, os dados do usuário poderão ser excluídos após 30 dias.</p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-foreground mb-2">9. Contato</h2>
                <p>Para dúvidas sobre estes termos, entre em contato pelo email sergio.araujo@ufrn.br ou pela página de contato da plataforma.</p>
              </section>
            </div>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
