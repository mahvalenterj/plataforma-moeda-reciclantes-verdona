package br.org.reciclantes.moedaverde.api;

import br.org.reciclantes.moedaverde.dominio.Dominio.Material;
import br.org.reciclantes.moedaverde.dominio.Dominio.Qualidade;
import br.org.reciclantes.moedaverde.servicos.CobrancaService;
import br.org.reciclantes.moedaverde.servicos.CobrancaService.Cobranca;
import br.org.reciclantes.moedaverde.servicos.ColetaService;
import br.org.reciclantes.moedaverde.servicos.ColetaService.Pesagem;
import br.org.reciclantes.moedaverde.servicos.ColetaService.PedidoPesagem;
import br.org.reciclantes.moedaverde.servicos.DemoService;
import br.org.reciclantes.moedaverde.servicos.EventosService;
import br.org.reciclantes.moedaverde.servicos.LiquidacaoService;
import br.org.reciclantes.moedaverde.servicos.LiquidacaoService.Conciliacao;
import br.org.reciclantes.moedaverde.servicos.LiquidacaoService.Liquidacao;
import br.org.reciclantes.moedaverde.servicos.PainelService;
import br.org.reciclantes.moedaverde.servicos.PainelService.Painel;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.util.List;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api")
class OperacoesController {
    record PesagemRequest(@NotBlank String titularId, @NotBlank String coletorId, @NotNull Material material,
                          @NotNull Qualidade qualidade, @Positive double kg, String chave) {}

    record RecepcaoRequest(@Positive double kg) {}

    record CobrancaRequest(@NotBlank String comercioId, @Positive long valorCentavos) {}

    record ConfirmacaoRequest(@NotBlank String perfilId) {}

    private final ColetaService coleta;
    private final CobrancaService cobrancas;
    private final LiquidacaoService liquidacoes;
    private final PainelService painel;
    private final DemoService demo;
    private final EventosService eventos;

    OperacoesController(ColetaService coleta, CobrancaService cobrancas, LiquidacaoService liquidacoes,
                        PainelService painel, DemoService demo, EventosService eventos) {
        this.coleta = coleta;
        this.cobrancas = cobrancas;
        this.liquidacoes = liquidacoes;
        this.painel = painel;
        this.demo = demo;
        this.eventos = eventos;
    }

    @PostMapping("/pesagens")
    Pesagem pesar(@Valid @RequestBody PesagemRequest r) {
        return coleta.registrar(new PedidoPesagem(r.titularId(), r.coletorId(), r.material(), r.qualidade(), r.kg(), r.chave()));
    }

    @PostMapping("/pesagens/{id}/recepcao")
    Pesagem recepcao(@PathVariable String id, @Valid @RequestBody RecepcaoRequest r) {
        return coleta.registrarRecepcao(id, r.kg());
    }

    @GetMapping("/pesagens")
    List<Pesagem> pesagens() {
        return coleta.recentes(10);
    }

    @PostMapping("/cobrancas")
    Cobranca cobrar(@Valid @RequestBody CobrancaRequest r) {
        return cobrancas.criar(r.comercioId(), r.valorCentavos());
    }

    @PostMapping("/cobrancas/{id}/confirmar")
    Cobranca confirmar(@PathVariable String id, @Valid @RequestBody ConfirmacaoRequest r) {
        return cobrancas.confirmar(id, r.perfilId());
    }

    @GetMapping("/cobrancas")
    List<Cobranca> cobrancas() {
        return cobrancas.todas();
    }

    @PostMapping("/liquidacoes/fechar-dia")
    List<Liquidacao> fecharDia() {
        return liquidacoes.fecharDia();
    }

    @GetMapping("/conciliacao")
    Conciliacao conciliacao() {
        return liquidacoes.conciliar();
    }

    @GetMapping("/painel")
    Painel painel() {
        return painel.snapshot();
    }

    @PostMapping("/demo/reiniciar")
    Map<String, Object> reiniciar() {
        demo.reiniciar();
        return Map.of("ok", true);
    }

    @PostMapping("/demo/divergencia")
    Conciliacao divergencia() {
        liquidacoes.injetarDivergencia();
        return liquidacoes.conciliar();
    }

    @GetMapping(path = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    SseEmitter stream() {
        return eventos.assinar();
    }
}
