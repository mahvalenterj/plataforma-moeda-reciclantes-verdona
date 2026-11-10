package br.org.reciclantes.moedaverde.servicos;

import br.org.reciclantes.moedaverde.dominio.Dominio.Material;
import br.org.reciclantes.moedaverde.dominio.Dominio.Qualidade;
import br.org.reciclantes.moedaverde.ledger.LedgerService;
import br.org.reciclantes.moedaverde.ledger.LedgerService.Conta;
import br.org.reciclantes.moedaverde.ledger.LedgerService.TipoConta;
import br.org.reciclantes.moedaverde.servicos.ColetaService.PedidoPesagem;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

/** Abre as contas, semeia dados de exemplo e permite reiniciar a demonstração. */
@Service
public class DemoService {
    public static final long FUNDO_INICIAL_CENTAVOS = 500_000; // R$ 5.000,00 de patrocínio (exemplo)

    private final LedgerService ledger;
    private final Cadastros cadastros;
    private final ColetaService coleta;
    private final CobrancaService cobrancas;
    private final LiquidacaoService liquidacoes;
    private final EventosService eventos;
    private final NotificacaoService push;

    public DemoService(LedgerService ledger, Cadastros cadastros, ColetaService coleta, CobrancaService cobrancas,
                       LiquidacaoService liquidacoes, EventosService eventos, NotificacaoService push) {
        this.ledger = ledger;
        this.cadastros = cadastros;
        this.coleta = coleta;
        this.cobrancas = cobrancas;
        this.liquidacoes = liquidacoes;
        this.eventos = eventos;
        this.push = push;
    }

    @PostConstruct
    void iniciar() {
        ledger.aoConfirmar(tx -> eventos.publicar("transacao", tx));
        semear();
    }

    public synchronized void reiniciar() {
        ledger.reiniciar();
        coleta.reiniciar();
        cobrancas.reiniciar();
        liquidacoes.reiniciar();
        push.reiniciar();
        semear();
        eventos.publicar("reiniciado", java.util.Map.of("ok", true));
    }

    private void semear() {
        eventos.silenciar(true);
        try {
            ledger.abrirConta(new Conta(Cadastros.FUNDO_ID, "Fundo do patrocinador (exemplo)", TipoConta.FUNDO, false),
                    FUNDO_INICIAL_CENTAVOS);
            cadastros.titulares().forEach(t -> ledger.abrirConta(
                    new Conta(Cadastros.carteira(t.id()), "Carteira de " + t.nome(), TipoConta.CARTEIRA, false), 0));
            cadastros.comercios().forEach(c -> ledger.abrirConta(
                    new Conta(Cadastros.aPagar(c.id()), "A pagar a " + c.nome(), TipoConta.A_PAGAR, false), 0));
            ledger.abrirConta(new Conta(Cadastros.PARCEIRO_ID, "Parceiro de pagamento (Pix)", TipoConta.PARCEIRO, false), 0);

            var historico = java.util.List.of(
                    coleta.registrar(new PedidoPesagem("seu-jorge", "marcos", Material.PET, Qualidade.LIMPO, 22.5, "seed-jorge")),
                    coleta.registrar(new PedidoPesagem("dona-neide", "marcos", Material.PET, Qualidade.LIMPO, 18, "seed-neide")),
                    coleta.registrar(new PedidoPesagem("familia-souza", "marcos", Material.ALUMINIO, Qualidade.LIMPO, 3, "seed-souza-1")),
                    coleta.registrar(new PedidoPesagem("familia-souza", "marcos", Material.PET, Qualidade.ACEITAVEL, 9.5, "seed-souza-2")),
                    coleta.registrar(new PedidoPesagem("joana-lima", "marcos", Material.PAPEL, Qualidade.LIMPO, 9, "seed-joana")));
            // o histórico já foi conferido na recepção
            historico.forEach(h -> coleta.registrarRecepcao(h.id(), h.kgParada()));

            var cobranca = cobrancas.criar("padaria-estrela", 3_000);
            cobrancas.confirmar(cobranca.id(), "seu-jorge");
        } finally {
            eventos.silenciar(false);
            push.reiniciar(); // as notificações da semeadura não entram nas estatísticas
        }
    }
}
