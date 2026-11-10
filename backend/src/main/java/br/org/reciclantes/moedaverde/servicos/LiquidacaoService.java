package br.org.reciclantes.moedaverde.servicos;

import br.org.reciclantes.moedaverde.dominio.Dominio.Comercio;
import br.org.reciclantes.moedaverde.dominio.Formato;
import br.org.reciclantes.moedaverde.dominio.RegraDeNegocioException;
import br.org.reciclantes.moedaverde.ledger.LedgerService;
import br.org.reciclantes.moedaverde.ledger.LedgerService.Resultado;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

/**
 * Liquidação agregada por dia, em Pix, por um parceiro licenciado (simulado aqui),
 * e conciliação entre ledger, resgates e extrato do parceiro.
 */
@Service
public class LiquidacaoService {
    public record Liquidacao(String id, String comercioId, String comercioNome, long centavos, String endToEndId,
                             Instant em) {}

    public record ItemExtratoParceiro(String endToEndId, String comercioId, long centavos, Instant em) {}

    public record ItemConciliacao(String liquidacaoId, String comercioNome, String endToEndId, long ledgerCentavos,
                                  long parceiroCentavos, long resgatesCentavos, boolean ok) {}

    public record Conciliacao(boolean ok, int divergencias, long pendenteCentavos, boolean invariantesOk,
                              List<ItemConciliacao> itens, Instant em) {}

    private static final String ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final DateTimeFormatter CARIMBO =
            DateTimeFormatter.ofPattern("yyyyMMddHHmm").withZone(ZoneId.of("UTC"));

    private final LedgerService ledger;
    private final Cadastros cadastros;
    private final CobrancaService cobrancas;
    private final EventosService eventos;
    private final NotificacaoService push;
    private final SecureRandom aleatorio = new SecureRandom();
    private final List<Liquidacao> liquidacoes = new ArrayList<>();
    private final List<ItemExtratoParceiro> extratoParceiro = new ArrayList<>();
    private long sequencia = 0;

    public LiquidacaoService(LedgerService ledger, Cadastros cadastros, CobrancaService cobrancas,
                             EventosService eventos, NotificacaoService push) {
        this.ledger = ledger;
        this.cadastros = cadastros;
        this.cobrancas = cobrancas;
        this.eventos = eventos;
        this.push = push;
    }

    public synchronized List<Liquidacao> fecharDia() {
        List<Liquidacao> geradas = new ArrayList<>();
        for (Comercio comercio : cadastros.comercios()) {
            long devido = ledger.saldo(Cadastros.aPagar(comercio.id()));
            if (devido <= 0) {
                continue;
            }
            String id = String.format("liq_%04d", ++sequencia);
            String e2e = gerarEndToEnd();
            Resultado r = ledger.transferir("liquidacao:" + id, "LIQUIDACAO_PIX",
                    "Pix agregado para " + comercio.nome(), Cadastros.aPagar(comercio.id()), Cadastros.PARCEIRO_ID, devido);
            cobrancas.marcarLiquidadas(comercio.id(), id);
            Liquidacao liq = new Liquidacao(id, comercio.id(), comercio.nome(), devido, e2e, r.transacao().em());
            liquidacoes.add(liq);
            extratoParceiro.add(new ItemExtratoParceiro(e2e, comercio.id(), devido, r.transacao().em()));
            push.notificar(List.of(comercio.id()), "Pix enviado",
                    "Pix de R$ " + Formato.reais(devido) + " enviado pelo fechamento do dia.", r.transacao().nanos());
            geradas.add(liq);
        }
        eventos.publicar("liquidacao", geradas);
        return geradas;
    }

    public synchronized Conciliacao conciliar() {
        List<ItemConciliacao> itens = new ArrayList<>();
        int divergencias = 0;
        for (Liquidacao liq : liquidacoes) {
            long doParceiro = extratoParceiro.stream()
                    .filter(i -> i.endToEndId().equals(liq.endToEndId())).mapToLong(ItemExtratoParceiro::centavos).sum();
            long dosResgates = cobrancas.totalLiquidadoPor(liq.id());
            boolean ok = liq.centavos() == doParceiro && liq.centavos() == dosResgates;
            if (!ok) {
                divergencias++;
            }
            itens.add(new ItemConciliacao(liq.id(), liq.comercioNome(), liq.endToEndId(), liq.centavos(),
                    doParceiro, dosResgates, ok));
        }
        long pendente = cadastros.comercios().stream()
                .mapToLong(c -> ledger.saldo(Cadastros.aPagar(c.id()))).sum();
        if (pendente != cobrancas.totalPagoSemLiquidacao()) {
            divergencias++;
        }
        boolean invariantes = ledger.invariantesOk();
        if (!invariantes) {
            divergencias++;
        }
        return new Conciliacao(divergencias == 0, divergencias, pendente, invariantes, itens, Instant.now());
    }

    /** Demonstração: altera 1 centavo no extrato do parceiro para mostrar que a conciliação detecta. */
    public synchronized void injetarDivergencia() {
        if (extratoParceiro.isEmpty()) {
            throw new RegraDeNegocioException("SEM_LIQUIDACAO", "Feche o dia antes de simular uma divergência.");
        }
        int ultimo = extratoParceiro.size() - 1;
        ItemExtratoParceiro i = extratoParceiro.get(ultimo);
        extratoParceiro.set(ultimo, new ItemExtratoParceiro(i.endToEndId(), i.comercioId(), i.centavos() - 1, i.em()));
    }

    public synchronized long totalLiquidado() {
        return liquidacoes.stream().mapToLong(Liquidacao::centavos).sum();
    }

    public synchronized List<Liquidacao> liquidacoes() {
        List<Liquidacao> copia = new ArrayList<>(liquidacoes);
        java.util.Collections.reverse(copia);
        return copia;
    }

    private String gerarEndToEnd() {
        StringBuilder sb = new StringBuilder("E00000000").append(CARIMBO.format(Instant.now()));
        for (int i = 0; i < 11; i++) {
            sb.append(ALFABETO.charAt(aleatorio.nextInt(ALFABETO.length())));
        }
        return sb.toString(); // 32 caracteres, como o identificador de ponta a ponta do Pix
    }

    public synchronized void reiniciar() {
        liquidacoes.clear();
        extratoParceiro.clear();
        sequencia = 0;
    }
}
