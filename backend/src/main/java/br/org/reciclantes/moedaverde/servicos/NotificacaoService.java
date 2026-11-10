package br.org.reciclantes.moedaverde.servicos;

import java.util.Collection;
import java.util.List;
import org.springframework.stereotype.Service;

/**
 * Simula o push. Mede o tempo interno entre a confirmação do lançamento e a emissão da notificação
 * (meta do produto: aceite pelo serviço de push em até 2 s; a entrega ao aparelho depende da rede).
 */
@Service
public class NotificacaoService {
    public record Push(List<String> destinatarios, String titulo, String corpo, double latenciaMs) {}

    public record Estatisticas(long total, double mediaMs, double maximaMs) {}

    private final EventosService eventos;
    private long total = 0;
    private double somaMs = 0;
    private double maximaMs = 0;

    public NotificacaoService(EventosService eventos) {
        this.eventos = eventos;
    }

    public synchronized void notificar(Collection<String> destinatarios, String titulo, String corpo, long nanosOrigem) {
        double ms = Math.max(0, (System.nanoTime() - nanosOrigem) / 1_000_000.0);
        total++;
        somaMs += ms;
        maximaMs = Math.max(maximaMs, ms);
        eventos.publicar("push", new Push(List.copyOf(destinatarios), titulo, corpo, Math.round(ms * 10) / 10.0));
    }

    public synchronized Estatisticas estatisticas() {
        return new Estatisticas(total, total == 0 ? 0 : Math.round(somaMs / total * 10) / 10.0, Math.round(maximaMs * 10) / 10.0);
    }

    public synchronized void reiniciar() {
        total = 0;
        somaMs = 0;
        maximaMs = 0;
    }
}
