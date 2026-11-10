package br.org.reciclantes.moedaverde.servicos;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/** Barramento de eventos em memória, entregue ao front por Server-Sent Events. */
@Service
public class EventosService {
    private final List<SseEmitter> emissores = new CopyOnWriteArrayList<>();
    private volatile boolean silencioso = false;

    public SseEmitter assinar() {
        SseEmitter emissor = new SseEmitter(0L);
        emissores.add(emissor);
        emissor.onCompletion(() -> emissores.remove(emissor));
        emissor.onTimeout(() -> emissores.remove(emissor));
        emissor.onError(t -> emissores.remove(emissor));
        try {
            emissor.send(SseEmitter.event().name("ola").data(Map.of("ok", true), MediaType.APPLICATION_JSON));
        } catch (IOException e) {
            emissores.remove(emissor);
        }
        return emissor;
    }

    public synchronized void publicar(String tipo, Object dados) {
        if (silencioso) {
            return;
        }
        for (SseEmitter emissor : emissores) {
            try {
                emissor.send(SseEmitter.event().name(tipo).data(dados, MediaType.APPLICATION_JSON));
            } catch (Exception e) {
                emissores.remove(emissor);
            }
        }
    }

    public void silenciar(boolean valor) {
        this.silencioso = valor;
    }

    @Scheduled(fixedRate = 20_000)
    public void batimento() {
        publicar("ping", Map.of("t", System.currentTimeMillis()));
    }
}
