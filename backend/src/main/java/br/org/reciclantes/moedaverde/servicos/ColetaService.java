package br.org.reciclantes.moedaverde.servicos;

import br.org.reciclantes.moedaverde.dominio.Dominio.Material;
import br.org.reciclantes.moedaverde.dominio.Dominio.Participante;
import br.org.reciclantes.moedaverde.dominio.Dominio.Qualidade;
import br.org.reciclantes.moedaverde.dominio.Dominio.TipoPerfil;
import br.org.reciclantes.moedaverde.dominio.Formato;
import br.org.reciclantes.moedaverde.dominio.RegraDeNegocioException;
import br.org.reciclantes.moedaverde.ledger.LedgerService;
import br.org.reciclantes.moedaverde.ledger.LedgerService.Resultado;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

/** Pesagem na porta (camada 1) e conferência na recepção (camada 3), com crédito imediato e ajuste. */
@Service
public class ColetaService {
    public enum StatusPesagem { PROVISORIA, CONFIRMADA, AJUSTADA, REJEITADA }

    public record Pesagem(String id, String titularId, String titularNome, String coletorId, Material material,
                          Qualidade qualidade, double kgParada, Double kgRecepcao, long creditoCentavos,
                          long ajusteCentavos, String transacaoId, StatusPesagem status, String orientacao, Instant em) {
        /** Selo "Nota 10": material limpo e aceito. */
        @JsonProperty("nota10")
        public boolean nota10() {
            return status != StatusPesagem.REJEITADA && qualidade == Qualidade.LIMPO;
        }
    }

    public record PedidoPesagem(String titularId, String coletorId, Material material, Qualidade qualidade,
                                double kg, String chave) {}

    public static final long LIMITE_PARADA_CENTAVOS = 20_000;
    public static final long LIMITE_DIA_CENTAVOS = 30_000;
    public static final double KG_MAXIMO = 80;

    private static final ZoneId ZONA = ZoneId.of("America/Sao_Paulo");

    private final LedgerService ledger;
    private final Cadastros cadastros;
    private final EventosService eventos;
    private final NotificacaoService push;
    private final Map<String, Pesagem> pesagens = new LinkedHashMap<>();
    private final Map<String, String> pesagemPorChave = new HashMap<>();
    private long sequencia = 0;

    public ColetaService(LedgerService ledger, Cadastros cadastros, EventosService eventos, NotificacaoService push) {
        this.ledger = ledger;
        this.cadastros = cadastros;
        this.eventos = eventos;
        this.push = push;
    }

    public static long credito(Material material, Qualidade qualidade, double kg) {
        return (long) Math.floor(kg * material.centavosPorKg * qualidade.fator + 1e-9);
    }

    public synchronized Pesagem registrar(PedidoPesagem p) {
        if (p.chave() != null && pesagemPorChave.containsKey(p.chave())) {
            return pesagens.get(pesagemPorChave.get(p.chave()));
        }
        Participante titular = cadastros.participante(p.titularId());
        if (titular.tipo() != TipoPerfil.TITULAR) {
            throw new RegraDeNegocioException("TITULAR_INVALIDO", "A pesagem é registrada na conta do titular.");
        }
        cadastros.coletor(p.coletorId());
        double kg = Math.round(p.kg() * 100.0) / 100.0;
        if (kg < 0.1 || kg > KG_MAXIMO) {
            throw new RegraDeNegocioException("PESO_INVALIDO",
                    "O peso precisa estar entre 0,1 e " + (int) KG_MAXIMO + " kg por parada.");
        }
        String id = String.format("pes_%04d", ++sequencia);
        long credito = credito(p.material(), p.qualidade(), kg);
        Instant agora = Instant.now();
        List<String> destinatarios = cadastros.perfisDoTitular(titular.id()).stream().map(Participante::id).toList();

        if (credito == 0) {
            String orientacao = "Desta vez o material não foi aceito. Enxágue, escorra e guarde coberto. Na próxima passagem a gente pesa de novo.";
            Pesagem rejeitada = new Pesagem(id, titular.id(), titular.nome(), p.coletorId(), p.material(), p.qualidade(),
                    kg, null, 0, 0, null, StatusPesagem.REJEITADA, orientacao, agora);
            guardar(p.chave(), rejeitada);
            push.notificar(destinatarios, "Material não aceito", orientacao, System.nanoTime());
            eventos.publicar("pesagem", rejeitada);
            return rejeitada;
        }
        if (credito > LIMITE_PARADA_CENTAVOS) {
            throw new RegraDeNegocioException("LIMITE_PARADA",
                    "Esta parada passa do limite de " + Formato.verdonas(LIMITE_PARADA_CENTAVOS) + ".");
        }
        if (creditadoHoje(titular.id()) + credito > LIMITE_DIA_CENTAVOS) {
            throw new RegraDeNegocioException("LIMITE_DIA",
                    "O limite diário de " + Formato.verdonas(LIMITE_DIA_CENTAVOS) + " por titular foi atingido.");
        }
        String memo = "Entrega de " + Formato.kg(kg) + " kg de " + p.material().rotulo + " ("
                + p.qualidade().rotulo.toLowerCase() + ")";
        Resultado r;
        try {
            r = ledger.transferir("pesagem:" + id, "CREDITO_PESAGEM", memo, Cadastros.FUNDO_ID,
                    Cadastros.carteira(titular.id()), credito);
        } catch (RegraDeNegocioException e) {
            if (e.codigo().equals("SALDO_INSUFICIENTE")) {
                throw new RegraDeNegocioException("FUNDO_INSUFICIENTE",
                        "O fundo do patrocinador não cobre esta emissão. Nenhuma verdona foi emitida.");
            }
            throw e;
        }
        Pesagem pesagem = new Pesagem(id, titular.id(), titular.nome(), p.coletorId(), p.material(), p.qualidade(),
                kg, null, credito, 0, r.transacao().id(), StatusPesagem.PROVISORIA, null, agora);
        guardar(p.chave(), pesagem);
        boolean nota10 = p.qualidade() == Qualidade.LIMPO;
        push.notificar(destinatarios, nota10 ? "Nota 10! Verdonas na carteira" : "Verdonas na carteira",
                nota10 ? "Material limpo. Você recebeu " + Formato.verdonas(credito) + "."
                        : "Você recebeu " + Formato.verdonas(credito) + " pela entrega de " + Formato.kg(kg) + " kg de "
                                + p.material().rotulo + ".",
                r.transacao().nanos());
        eventos.publicar("pesagem", pesagem);
        return pesagem;
    }

    /** Recepção pesa o lote. Diferença para menos vira ajuste; o que já foi gasto é absorvido pelo fundo. */
    public synchronized Pesagem registrarRecepcao(String pesagemId, double kgRecepcao) {
        Pesagem p = obter(pesagemId);
        if (p.status() == StatusPesagem.REJEITADA) {
            throw new RegraDeNegocioException("PESAGEM_REJEITADA", "Essa pesagem não gerou crédito.");
        }
        if (p.kgRecepcao() != null) {
            throw new RegraDeNegocioException("RECEPCAO_JA_REGISTRADA", "A recepção desta pesagem já foi registrada.");
        }
        double kg = Math.round(kgRecepcao * 100.0) / 100.0;
        if (kg < 0 || kg > KG_MAXIMO) {
            throw new RegraDeNegocioException("PESO_INVALIDO", "Peso de recepção inválido.");
        }
        long novoCredito = credito(p.material(), p.qualidade(), Math.min(kg, p.kgParada()));
        long diferenca = p.creditoCentavos() - novoCredito;
        List<String> destinatarios = cadastros.perfisDoTitular(p.titularId()).stream().map(Participante::id).toList();
        Pesagem atualizada;
        if (diferenca <= 0) {
            atualizada = new Pesagem(p.id(), p.titularId(), p.titularNome(), p.coletorId(), p.material(), p.qualidade(),
                    p.kgParada(), kg, p.creditoCentavos(), 0, p.transacaoId(), StatusPesagem.CONFIRMADA,
                    "Peso conferido na recepção.", p.em());
        } else {
            String carteira = Cadastros.carteira(p.titularId());
            long reverter = Math.min(ledger.saldo(carteira), diferenca);
            long absorvido = diferenca - reverter;
            long nanos = System.nanoTime();
            if (reverter > 0) {
                nanos = ledger.transferir("ajuste:" + p.id(), "AJUSTE_RECEPCAO",
                        "Ajuste de pesagem: a recepção pesou " + Formato.kg(kg) + " kg", carteira, Cadastros.FUNDO_ID, reverter).transacao().nanos();
            }
            String nota = "A recepção pesou " + Formato.kg(kg) + " kg. Ajuste de " + Formato.verdonas(reverter) + "."
                    + (absorvido > 0 ? " O fundo cobriu " + Formato.verdonas(absorvido) + " já gastas." : "");
            atualizada = new Pesagem(p.id(), p.titularId(), p.titularNome(), p.coletorId(), p.material(), p.qualidade(),
                    p.kgParada(), kg, p.creditoCentavos(), reverter, p.transacaoId(), StatusPesagem.AJUSTADA, nota, p.em());
            push.notificar(destinatarios, "Ajuste de pesagem", nota, nanos);
        }
        pesagens.put(p.id(), atualizada);
        eventos.publicar("pesagem", atualizada);
        return atualizada;
    }

    public synchronized Pesagem obter(String id) {
        Pesagem p = pesagens.get(id);
        if (p == null) {
            throw new RegraDeNegocioException("PESAGEM_INEXISTENTE", "Pesagem não encontrada: " + id);
        }
        return p;
    }

    public synchronized List<Pesagem> recentes(int n) {
        List<Pesagem> lista = new ArrayList<>(pesagens.values());
        Collections.reverse(lista);
        return lista.subList(0, Math.min(n, lista.size()));
    }

    public synchronized Map<String, Double> kgPorTitular() {
        Map<String, Double> mapa = new HashMap<>();
        for (Pesagem p : pesagens.values()) {
            if (p.status() != StatusPesagem.REJEITADA) {
                mapa.merge(p.titularId(), kgConsiderado(p), Double::sum);
            }
        }
        return mapa;
    }

    public synchronized Map<String, Integer> notas10PorTitular() {
        Map<String, Integer> mapa = new HashMap<>();
        for (Pesagem p : pesagens.values()) {
            if (p.nota10()) {
                mapa.merge(p.titularId(), 1, Integer::sum);
            }
        }
        return mapa;
    }

    public synchronized Map<Material, Double> kgPorMaterial() {
        Map<Material, Double> mapa = new EnumMap<>(Material.class);
        for (Pesagem p : pesagens.values()) {
            if (p.status() != StatusPesagem.REJEITADA) {
                mapa.merge(p.material(), kgConsiderado(p), Double::sum);
            }
        }
        return mapa;
    }

    public synchronized int pesagensHoje() {
        LocalDate hoje = LocalDate.now(ZONA);
        return (int) pesagens.values().stream()
                .filter(p -> p.em().atZone(ZONA).toLocalDate().equals(hoje)).count();
    }

    private double kgConsiderado(Pesagem p) {
        return p.kgRecepcao() != null ? Math.min(p.kgRecepcao(), p.kgParada()) : p.kgParada();
    }

    private long creditadoHoje(String titularId) {
        LocalDate hoje = LocalDate.now(ZONA);
        return pesagens.values().stream()
                .filter(p -> p.titularId().equals(titularId) && p.status() != StatusPesagem.REJEITADA)
                .filter(p -> p.em().atZone(ZONA).toLocalDate().equals(hoje))
                .mapToLong(Pesagem::creditoCentavos).sum();
    }

    private void guardar(String chave, Pesagem p) {
        pesagens.put(p.id(), p);
        if (chave != null) {
            pesagemPorChave.put(chave, p.id());
        }
    }

    public synchronized void reiniciar() {
        pesagens.clear();
        pesagemPorChave.clear();
        sequencia = 0;
    }
}
