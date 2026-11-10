package br.org.reciclantes.moedaverde.api;

import br.org.reciclantes.moedaverde.dominio.Dominio.Participante;
import br.org.reciclantes.moedaverde.dominio.Dominio.TipoPerfil;
import br.org.reciclantes.moedaverde.ledger.LedgerService;
import br.org.reciclantes.moedaverde.ledger.LedgerService.Lancamento;
import br.org.reciclantes.moedaverde.ledger.LedgerService.Sentido;
import br.org.reciclantes.moedaverde.servicos.Cadastros;
import br.org.reciclantes.moedaverde.servicos.CobrancaService;
import br.org.reciclantes.moedaverde.servicos.CobrancaService.Cobranca;
import java.time.Instant;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/carteiras")
class CarteiraController {
    record LinhaExtrato(long seq, String transacaoId, String tipo, String memo, long centavos, Instant em) {}

    record CarteiraView(String titularId, String nome, long saldoCentavos, List<Participante> perfis,
                        List<LinhaExtrato> extrato, List<Cobranca> cobrancasPendentes) {}

    private final LedgerService ledger;
    private final Cadastros cadastros;
    private final CobrancaService cobrancas;

    CarteiraController(LedgerService ledger, Cadastros cadastros, CobrancaService cobrancas) {
        this.ledger = ledger;
        this.cadastros = cadastros;
        this.cobrancas = cobrancas;
    }

    @GetMapping("/{titularId}")
    CarteiraView carteira(@PathVariable String titularId) {
        Participante titular = cadastros.participante(titularId);
        String conta = Cadastros.carteira(titular.tipo() == TipoPerfil.TITULAR ? titular.id() : titular.titularId());
        List<LinhaExtrato> extrato = ledger.extrato(conta, 20).stream().map(this::linha).toList();
        return new CarteiraView(titular.id(), titular.nome(), ledger.saldo(conta),
                cadastros.perfisDoTitular(titular.id()), extrato, cobrancas.pendentes());
    }

    private LinhaExtrato linha(Lancamento l) {
        var tx = ledger.transacao(l.transacaoId()).orElseThrow();
        long valor = l.sentido() == Sentido.CREDITO ? l.centavos() : -l.centavos();
        return new LinhaExtrato(l.seq(), l.transacaoId(), tx.tipo(), tx.memo(), valor, l.em());
    }
}
