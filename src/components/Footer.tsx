import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { GraduationCap } from "lucide-react";

export default function Footer() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const columns = [
    {
      title: "Produto",
      links: [
        { label: "Criar Conta", href: "/?auth=open" },
        { label: "Entrar", href: "/?auth=open" },
        { label: "Planos", href: "/pricing" },
        { label: "Funcionalidades", href: "/features" },
      ],
    },
    {
      title: "Recursos",
      links: [
        { label: "Documentação", href: "/docs" },
        { label: "Contato", href: "/contact" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Termos de Serviço", href: "/terms" },
        { label: "Política de Privacidade", href: "/privacy" },
        { label: "Política de Cookies", href: "/cookies" },
      ],
    },
  ];

  return (
    <footer className="bg-[hsl(215,28%,12%)] text-[hsl(214,18%,75%)] pt-14 pb-8 px-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center">
                <GraduationCap className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-white text-base">{t("app.name")}</span>
            </div>
            <p className="text-sm leading-relaxed text-[hsl(214,18%,55%)]">
              Plataforma de aprendizagem baseada em problemas para profissionais de saúde, educadores e pesquisadores.
            </p>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="font-bold text-white text-sm mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <button
                      onClick={() => navigate(link.href)}
                      className="text-sm hover:text-white transition-colors"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[hsl(215,25%,20%)] pt-6 text-center text-xs text-[hsl(214,18%,45%)]">
          <p>
            © {new Date().getFullYear()} {t("app.name")}. Todos os direitos reservados. — Desenvolvido por Sérgio Araújo. Posologia Produções
          </p>
        </div>
      </div>
    </footer>
  );
}
