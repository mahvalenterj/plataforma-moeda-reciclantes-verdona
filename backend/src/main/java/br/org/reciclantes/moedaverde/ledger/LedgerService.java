package br.org.reciclantes.moedaverde.ledger;

import br.org.reciclantes.moedaverde.dominio.RegraDeNegocioException;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Consumer;
import org.springframework.stereotype.Service;

/**
 * Livro de lançamentos (ledger) único e consistente.
 * Regras: dupla entrada, lançamentos imutáveis, saldo nunca negativo (exceto contas que permitem),
 * operações idempotentes por chave. Em memória no MVP; a interface permite trocar por PostgreSQL.
 */
@Service
public class LedgerService {

    public enum TipoConta { FUNDO, CARTEIRA, A_PAGAR, PARCEIRO }

    public enum Sentido { DEBITO, CREDITO }

    public record Conta(String id, String nome, TipoConta tipo, boolean permiteNegativo) {}

    public record Lancamento(long seq, String transacaoId, String contaId, Sentido sentido, long centavos, Instant em) {}

    public record Transacao(String id, String chave, String tipo, String memo, String de, String para,
                            long centavos, Instant em, @JsonIgnore long nanos, List<Lancamento> lancamentos) {}

    public record Resultado(Transacao transacao, boolean repetida) {}

    private final Map<String, Conta> contas = new LinkedHashMap<>();
    private final Map<String, Long> saldos = new HashMap<>();
    private final List<Lancamento> livro = new ArrayList<>();
    private final List<Transacao> transacoes = new ArrayList<>();
    private final Map<String, Transacao> porChave = new HashMap<>();
    private final Map<String, Transacao> porId = new HashMap<>();
    private final List<Consumer<Transacao>> ouvintes = new CopyOnWriteArrayList<>();
    private long seq = 0;
    private long totalInicial = 0;

    public synchronized void abrirConta(Conta conta, long saldoInicial) {
        contas.put(conta.id(), conta);
        saldos.put(conta.id(), saldoInicial);
        totalInicial += saldoInicial;
    }

    public void aoConfirmar(Consumer<Transacao> ouvinte) {
        ouvintes.add(ouvinte);
    }

    /** Transfere valor entre duas contas (um débito e um crédito). */
    public Resultado transferir(String chave, String tipo, String memo, String de, String para, long centavos) {
        Resultado r = aplicar(chave, tipo, memo, de, para, centavos);
        if (!r.repetida()) {
            ouvintes.forEach(o -> o.accept(r.transacao()));
        }
        return r;
    }

    private synchronized Resultado aplicar(String chave, String tipo, String memo, String de, String para, long centavos) {
        if (centavos <= 0) {
            throw new RegraDeNegocioException("VALOR_INVALIDO", "O valor precisa ser maior que zero.");
        }
        if (chave != null) {
            Transacao existente = porChave.get(chave);
            if (existente != null) {
                boolean igual = existente.tipo().equals(tipo) && existente.de().equals(de)
                        && existente.para().equals(para) && existente.centavos() == centavos;
                if (!igual) {
                    throw new RegraDeNegocioException("CHAVE_REUTILIZADA",
                            "Essa chave de idempotência já foi usada em outra operação.");
                }
                return new Resultado(existente, true);
            }
        }
        Conta contaDe = contas.get(de);
        Conta contaPara = contas.get(para);
        if (contaDe == null || contaPara == null) {
            throw new RegraDeNegocioException("CONTA_INEXISTENTE", "Conta inexistente na operação.");
        }
        if (de.equals(para)) {
            throw new RegraDeNegocioException("CONTAS_IGUAIS", "Origem e destino não podem ser a mesma conta.");
        }
        if (!contaDe.permiteNegativo() && saldos.get(de) < centavos) {
            throw new RegraDeNegocioException("SALDO_INSUFICIENTE", "Saldo insuficiente em " + contaDe.nome() + ".");
        }
        Instant agora = Instant.now();
        String id = String.format("tx_%06d", transacoes.size() + 1);
        Lancamento deb = new Lancamento(++seq, id, de, Sentido.DEBITO, centavos, agora);
        Lancamento cred = new Lancamento(++seq, id, para, Sentido.CREDITO, centavos, agora);
        saldos.merge(de, -centavos, Long::sum);
        saldos.merge(para, centavos, Long::sum);
        livro.add(deb);
        livro.add(cred);
        Transacao tx = new Transacao(id, chave, tipo, memo, de, para, centavos, agora, System.nanoTime(), List.of(deb, cred));
        transacoes.add(tx);
        porId.put(id, tx);
        if (chave != null) {
            porChave.put(chave, tx);
        }
        return new Resultado(tx, false);
    }

    public synchronized long saldo(String contaId) {
        Long s = saldos.get(contaId);
        if (s == null) {
            throw new RegraDeNegocioException("CONTA_INEXISTENTE", "Conta inexistente: " + contaId);
        }
        return s;
    }

    public synchronized Optional<Conta> conta(String id) {
        return Optional.ofNullable(contas.get(id));
    }

    public synchronized List<Lancamento> extrato(String contaId, int limite) {
        List<Lancamento> saida = new ArrayList<>();
        for (int i = livro.size() - 1; i >= 0 && saida.size() < limite; i--) {
            if (livro.get(i).contaId().equals(contaId)) {
                saida.add(livro.get(i));
            }
        }
        return saida;
    }

    public synchronized List<Transacao> ultimas(int n) {
        int de = Math.max(0, transacoes.size() - n);
        List<Transacao> lista = new ArrayList<>(transacoes.subList(de, transacoes.size()));
        java.util.Collections.reverse(lista);
        return lista;
    }

    public synchronized Optional<Transacao> transacao(String id) {
        return Optional.ofNullable(porId.get(id));
    }

    public synchronized int totalTransacoes() {
        return transacoes.size();
    }

    /** Soma dos saldos é constante, débitos = créditos e nenhum saldo proibido ficou negativo. */
    public synchronized boolean invariantesOk() {
        long soma = saldos.values().stream().mapToLong(Long::longValue).sum();
        long debitos = livro.stream().filter(l -> l.sentido() == Sentido.DEBITO).mapToLong(Lancamento::centavos).sum();
        long creditos = livro.stream().filter(l -> l.sentido() == Sentido.CREDITO).mapToLong(Lancamento::centavos).sum();
        boolean semNegativoIndevido = saldos.entrySet().stream()
                .allMatch(e -> contas.get(e.getKey()).permiteNegativo() || e.getValue() >= 0);
        return soma == totalInicial && debitos == creditos && semNegativoIndevido;
    }

    public synchronized void reiniciar() {
        contas.clear();
        saldos.clear();
        livro.clear();
        transacoes.clear();
        porChave.clear();
        porId.clear();
        seq = 0;
        totalInicial = 0;
    }
}
