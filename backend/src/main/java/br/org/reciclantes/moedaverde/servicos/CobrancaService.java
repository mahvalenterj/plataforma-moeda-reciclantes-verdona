package br.org.reciclantes.moedaverde.servicos;

import br.org.reciclantes.moedaverde.dominio.Dominio.Comercio;
import br.org.reciclantes.moedaverde.dominio.Dominio.Participante;
import br.org.reciclantes.moedaverde.dominio.Dominio.StatusAdesao;
import br.org.reciclantes.moedaverde.dominio.Dominio.TipoPerfil;
import br.org.reciclantes.moedaverde.dominio.Formato;
import br.org.reciclantes.moedaverde.dominio.RegraDeNegocioException;
import br.org.reciclantes.moedaverde.ledger.LedgerService;
import br.org.reciclantes.moedaverde.ledger.LedgerService.Resultado;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

/** Cobrança no caixa do comércio e confirmação pelo participante, com limites do perfil delegado. */
@Service
public class CobrancaService {
    public enum StatusCobranca { PENDENTE, PAGA }

    public record Cobranca(String id, String comercioId, String comercioNome, long valorCentavos, StatusCobranca status,
                           Instant criadaEm, String pagaPorPerfilId, String titularId, String transacaoId,
                           String liquidacaoId, Instant pagaEm) {}

    private static final ZoneId ZONA = ZoneId.of("America/Sao_Paulo");
    private static final long VALOR_MAXIMO_CENTAVOS = 100_000;

    private final LedgerService ledger;
    private final Cadastros cadastros;
    private final EventosService eventos;
    private final NotificacaoService push;
    private final Map<String, Cobranca> cobrancas = new LinkedHashMap<>();
    private long sequencia = 0;

    public CobrancaService(LedgerService ledger, Cadastros cadastros, EventosService eventos, NotificacaoService push) {
        this.ledger = ledger;
        this.cadastros = cadastros;
        this.eventos = eventos;
        this.push = push;
    }

    public synchronized Cobranca criar(String comercioId, long valorCentavos) {
        Comercio comercio = cadastros.comercio(comercioId);
        if (comercio.status() != StatusAdesao.ATIVO) {
            throw new RegraDeNegocioException("COMERCIO_NAO_ATIVO",
                    comercio.nome() + " ainda está em validação e não aceita a verdona.");
        }
        if (valorCentavos <= 0 || valorCentavos > VALOR_MAXIMO_CENTAVOS) {
            throw new RegraDeNegocioException("VALOR_INVALIDO",
                    "O valor da cobrança precisa estar entre 0,01 e " + Formato.reais(VALOR_MAXIMO_CENTAVOS) + ".");
        }
        String id = String.format("cob_%04d", ++sequencia);
        Cobranca c = new Cobranca(id, comercio.id(), comercio.nome(), valorCentavos, StatusCobranca.PENDENTE,
                Instant.now(), null, null, null, null, null);
        cobrancas.put(id, c);
        eventos.publicar("cobranca", c);
        return c;
    }

    public synchronized Cobranca confirmar(String cobrancaId, String perfilId) {
        Cobranca c = obter(cobrancaId);
        if (c.status() == StatusCobranca.PAGA) {
            if (perfilId.equals(c.pagaPorPerfilId())) {
                return c; // idempotente: repetir a confirmação não debita de novo
            }
            throw new RegraDeNegocioException("COBRANCA_JA_PAGA", "Esta cobrança já foi paga.");
        }
        Participante perfil = cadastros.participante(perfilId);
        String titularId = perfil.tipo() == TipoPerfil.TITULAR ? perfil.id() : perfil.titularId();
        if (perfil.tipo() == TipoPerfil.DELEGADO) {
            if (c.valorCentavos() > perfil.limiteCompraCentavos()) {
                throw new RegraDeNegocioException("LIMITE_COMPRA", "O limite deste perfil é "
                        + Formato.verdonas(perfil.limiteCompraCentavos()) + " por compra. Peça à titular para ajustar ou divida a compra.");
            }
            if (gastoDoDia(perfil.id()) + c.valorCentavos() > perfil.limiteDiaCentavos()) {
                throw new RegraDeNegocioException("LIMITE_DIA", "O limite diário deste perfil é "
                        + Formato.verdonas(perfil.limiteDiaCentavos()) + ". Peça à titular para ajustar ou tente amanhã.");
            }
        }
        Resultado r;
        try {
            r = ledger.transferir("resgate:" + c.id(), "RESGATE",
                    "Compra em " + c.comercioNome(), Cadastros.carteira(titularId), Cadastros.aPagar(c.comercioId()),
                    c.valorCentavos());
        } catch (RegraDeNegocioException e) {
            if (e.codigo().equals("SALDO_INSUFICIENTE")) {
                throw new RegraDeNegocioException("SALDO_INSUFICIENTE",
                        "Seu saldo é de " + Formato.verdonas(ledger.saldo(Cadastros.carteira(titularId)))
                                + " e esta compra é de " + Formato.verdonas(c.valorCentavos())
                                + ". Peça ao comércio para ajustar o valor.");
            }
            throw e;
        }
        Cobranca paga = new Cobranca(c.id(), c.comercioId(), c.comercioNome(), c.valorCentavos(), StatusCobranca.PAGA,
                c.criadaEm(), perfil.id(), titularId, r.transacao().id(), null, Instant.now());
        cobrancas.put(c.id(), paga);
        List<String> pessoas = cadastros.perfisDoTitular(titularId).stream().map(Participante::id).toList();
        push.notificar(pessoas, "Pagamento confirmado",
                "Você gastou " + Formato.verdonas(c.valorCentavos()) + " em " + c.comercioNome() + ".",
                r.transacao().nanos());
        push.notificar(List.of(c.comercioId()), "Pagamento recebido",
                Formato.verdonas(c.valorCentavos()) + " recebidas. Entram no Pix do fechamento do dia.",
                r.transacao().nanos());
        eventos.publicar("cobranca", paga);
        return paga;
    }

    /** Marca como liquidadas as cobranças pagas do comércio e devolve o total ligado à liquidação. */
    public synchronized long marcarLiquidadas(String comercioId, String liquidacaoId) {
        long total = 0;
        for (Cobranca c : new ArrayList<>(cobrancas.values())) {
            if (c.status() == StatusCobranca.PAGA && c.liquidacaoId() == null && c.comercioId().equals(comercioId)) {
                cobrancas.put(c.id(), new Cobranca(c.id(), c.comercioId(), c.comercioNome(), c.valorCentavos(), c.status(),
                        c.criadaEm(), c.pagaPorPerfilId(), c.titularId(), c.transacaoId(), liquidacaoId, c.pagaEm()));
                total += c.valorCentavos();
            }
        }
        return total;
    }

    public synchronized long totalLiquidadoPor(String liquidacaoId) {
        return cobrancas.values().stream().filter(c -> liquidacaoId.equals(c.liquidacaoId()))
                .mapToLong(Cobranca::valorCentavos).sum();
    }

    public synchronized long totalPagoSemLiquidacao() {
        return cobrancas.values().stream()
                .filter(c -> c.status() == StatusCobranca.PAGA && c.liquidacaoId() == null)
                .mapToLong(Cobranca::valorCentavos).sum();
    }

    public synchronized Cobranca obter(String id) {
        Cobranca c = cobrancas.get(id);
        if (c == null) {
            throw new RegraDeNegocioException("COBRANCA_INEXISTENTE", "Cobrança não encontrada: " + id);
        }
        return c;
    }

    public synchronized List<Cobranca> todas() {
        List<Cobranca> lista = new ArrayList<>(cobrancas.values());
        Collections.reverse(lista);
        return lista;
    }

    public synchronized List<Cobranca> pendentes() {
        return todas().stream().filter(c -> c.status() == StatusCobranca.PENDENTE).toList();
    }

    private long gastoDoDia(String perfilId) {
        LocalDate hoje = LocalDate.now(ZONA);
        return cobrancas.values().stream()
                .filter(c -> c.status() == StatusCobranca.PAGA && perfilId.equals(c.pagaPorPerfilId()))
                .filter(c -> c.pagaEm().atZone(ZONA).toLocalDate().equals(hoje))
                .mapToLong(Cobranca::valorCentavos).sum();
    }

    public synchronized void reiniciar() {
        cobrancas.clear();
        sequencia = 0;
    }
}
