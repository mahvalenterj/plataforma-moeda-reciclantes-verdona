package br.org.reciclantes.moedaverde.servicos;

import br.org.reciclantes.moedaverde.dominio.Dominio.Comercio;
import br.org.reciclantes.moedaverde.dominio.Dominio.Material;
import br.org.reciclantes.moedaverde.dominio.Dominio.StatusAdesao;
import br.org.reciclantes.moedaverde.ledger.LedgerService;
import br.org.reciclantes.moedaverde.ledger.LedgerService.Transacao;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

/** Visão agregada para o painel de gestão (no produto: stream em tempo quase real + lote D+1). */
@Service
public class PainelService {
    public record ItemRanking(int posicao, String titularId, String nome, double kg, int notas10) {}

    /** Meta coletiva do bairro: ao bater, libera um prêmio comunitário (valores de exemplo). */
    public record MetaBairro(double metaKg, double kgAtual, int percentual, boolean atingida, String premio) {}

    public record ResumoComercio(String id, String nome, String bairro, StatusAdesao status,
                                 long aPagarCentavos, long recebidoCentavos) {}

    public record LinhaTransacao(String id, String tipo, String memo, long centavos, Instant em) {}

    public record Painel(long emissaoDisponivelCentavos, long emCirculacaoCentavos, long aPagarCentavos,
                         long liquidadoCentavos, boolean lastroOk, boolean invariantesOk, double kgTotal,
                         Map<String, Double> kgPorMaterial, List<ItemRanking> ranking,
                         List<ResumoComercio> comercios, List<LinhaTransacao> ultimasTransacoes,
                         NotificacaoService.Estatisticas push, int cobrancasPendentes, int pesagensHoje,
                         int totalTransacoes, String rota, MetaBairro metaBairro) {}

    static final double META_BAIRRO_KG = 75;
    static final String PREMIO_META = "kit de leitura para a creche do bairro (exemplo)";

    private final LedgerService ledger;
    private final Cadastros cadastros;
    private final ColetaService coleta;
    private final CobrancaService cobrancas;
    private final LiquidacaoService liquidacoes;
    private final NotificacaoService push;

    public PainelService(LedgerService ledger, Cadastros cadastros, ColetaService coleta, CobrancaService cobrancas,
                         LiquidacaoService liquidacoes, NotificacaoService push) {
        this.ledger = ledger;
        this.cadastros = cadastros;
        this.coleta = coleta;
        this.cobrancas = cobrancas;
        this.liquidacoes = liquidacoes;
        this.push = push;
    }

    public Painel snapshot() {
        long fundo = ledger.saldo(Cadastros.FUNDO_ID);
        long circulacao = cadastros.titulares().stream().mapToLong(t -> ledger.saldo(Cadastros.carteira(t.id()))).sum();
        long aPagar = cadastros.comercios().stream().mapToLong(c -> ledger.saldo(Cadastros.aPagar(c.id()))).sum();
        long liquidado = ledger.saldo(Cadastros.PARCEIRO_ID);

        Map<String, Double> porMaterial = new LinkedHashMap<>();
        coleta.kgPorMaterial().forEach((m, kg) -> porMaterial.put(rotulo(m), kg));
        double kgTotal = coleta.kgPorMaterial().values().stream().mapToDouble(Double::doubleValue).sum();

        Map<String, Integer> notas10 = coleta.notas10PorTitular();
        List<Map.Entry<String, Double>> ordenado = new ArrayList<>(coleta.kgPorTitular().entrySet());
        ordenado.sort(Map.Entry.<String, Double>comparingByValue(Comparator.reverseOrder()));
        List<ItemRanking> ranking = new ArrayList<>();
        for (int i = 0; i < Math.min(5, ordenado.size()); i++) {
            Map.Entry<String, Double> e = ordenado.get(i);
            ranking.add(new ItemRanking(i + 1, e.getKey(), cadastros.participante(e.getKey()).nome(),
                    Math.round(e.getValue() * 10) / 10.0, notas10.getOrDefault(e.getKey(), 0)));
        }

        List<ResumoComercio> resumo = new ArrayList<>();
        for (Comercio c : cadastros.comercios()) {
            long recebido = liquidacoes.liquidacoes().stream()
                    .filter(l -> l.comercioId().equals(c.id())).mapToLong(LiquidacaoService.Liquidacao::centavos).sum();
            resumo.add(new ResumoComercio(c.id(), c.nome(), c.bairro(), c.status(),
                    ledger.saldo(Cadastros.aPagar(c.id())), recebido));
        }

        List<LinhaTransacao> linhas = new ArrayList<>();
        for (Transacao t : ledger.ultimas(12)) {
            linhas.add(new LinhaTransacao(t.id(), t.tipo(), t.memo(), t.centavos(), t.em()));
        }
        String rota = cadastros.coletores().isEmpty() ? "" : cadastros.coletores().get(0).rota();
        return new Painel(fundo, circulacao, aPagar, liquidado, true, ledger.invariantesOk(),
                Math.round(kgTotal * 10) / 10.0, porMaterial, ranking, resumo, linhas, push.estatisticas(),
                cobrancas.pendentes().size(), coleta.pesagensHoje(), ledger.totalTransacoes(), rota, metaBairro(kgTotal));
    }

    private static MetaBairro metaBairro(double kgTotal) {
        double atual = Math.round(kgTotal * 10) / 10.0;
        int percentual = (int) Math.min(100, Math.round(atual / META_BAIRRO_KG * 100));
        return new MetaBairro(META_BAIRRO_KG, atual, percentual, atual >= META_BAIRRO_KG, PREMIO_META);
    }

    private static String rotulo(Material m) {
        return m.rotulo;
    }
}
