package br.org.reciclantes.moedaverde;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class FluxoDonaMariaTest {
    @Autowired MockMvc mvc;

    @BeforeEach
    void reiniciar() throws Exception {
        mvc.perform(post("/api/demo/reiniciar")).andExpect(status().isOk());
    }

    private void pesar(double kg, String chave) throws Exception {
        mvc.perform(post("/api/pesagens").contentType(MediaType.APPLICATION_JSON).content("""
                {"titularId":"dona-maria","coletorId":"marcos","material":"PET","qualidade":"LIMPO","kg":%s,"chave":"%s"}
                """.formatted(kg, chave))).andExpect(status().isOk());
    }

    private String cobrar(long centavos) throws Exception {
        String corpo = mvc.perform(post("/api/cobrancas").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comercioId\":\"seu-osvaldo\",\"valorCentavos\":" + centavos + "}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(corpo, "$.id");
    }

    @Test
    void feiraDaDonaMariaDeUmaPonteAOutra() throws Exception {
        mvc.perform(post("/api/pesagens").contentType(MediaType.APPLICATION_JSON).content("""
                {"titularId":"dona-maria","coletorId":"marcos","material":"PET","qualidade":"LIMPO","kg":14,"chave":"t1"}
                """)).andExpect(status().isOk()).andExpect(jsonPath("$.creditoCentavos").value(3500));

        mvc.perform(get("/api/carteiras/dona-maria")).andExpect(jsonPath("$.saldoCentavos").value(3500));

        String cobranca = cobrar(3500);
        mvc.perform(post("/api/cobrancas/" + cobranca + "/confirmar").contentType(MediaType.APPLICATION_JSON)
                .content("{\"perfilId\":\"julia\"}")).andExpect(status().isOk());
        // confirmar de novo não debita outra vez
        mvc.perform(post("/api/cobrancas/" + cobranca + "/confirmar").contentType(MediaType.APPLICATION_JSON)
                .content("{\"perfilId\":\"julia\"}")).andExpect(status().isOk());
        mvc.perform(get("/api/carteiras/dona-maria")).andExpect(jsonPath("$.saldoCentavos").value(0));

        mvc.perform(post("/api/liquidacoes/fechar-dia")).andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.comercioId=='seu-osvaldo')].centavos").value(3500));

        mvc.perform(get("/api/conciliacao")).andExpect(jsonPath("$.ok").value(true))
                .andExpect(jsonPath("$.divergencias").value(0));
    }

    @Test
    void conciliacaoDetectaDivergenciaNoExtratoDoParceiro() throws Exception {
        pesar(14, "t2");
        String cobranca = cobrar(3500);
        mvc.perform(post("/api/cobrancas/" + cobranca + "/confirmar").contentType(MediaType.APPLICATION_JSON)
                .content("{\"perfilId\":\"dona-maria\"}")).andExpect(status().isOk());
        mvc.perform(post("/api/liquidacoes/fechar-dia")).andExpect(status().isOk());
        mvc.perform(post("/api/demo/divergencia")).andExpect(jsonPath("$.ok").value(false));
    }

    @Test
    void perfilDelegadoRespeitaLimitePorCompra() throws Exception {
        pesar(30, "t3"); // R$ 75,00 de crédito
        String cobranca = cobrar(7000); // acima do limite de R$ 60,00 da Júlia
        mvc.perform(post("/api/cobrancas/" + cobranca + "/confirmar").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"perfilId\":\"julia\"}"))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.codigo").value("LIMITE_COMPRA"))
                .andExpect(jsonPath("$.mensagem").value(org.hamcrest.Matchers.containsString("Peça à titular")));
        mvc.perform(get("/api/carteiras/dona-maria")).andExpect(jsonPath("$.saldoCentavos").value(7500));
    }

    @Test
    void semSaldoNaoPaga() throws Exception {
        String cobranca = cobrar(1000);
        mvc.perform(post("/api/cobrancas/" + cobranca + "/confirmar").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"perfilId\":\"dona-maria\"}"))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.codigo").value("SALDO_INSUFICIENTE"))
                .andExpect(jsonPath("$.mensagem").value(org.hamcrest.Matchers.containsString("Peça ao comércio")));
    }

    @Test
    void recepcaoComPesoMenorAjustaOCredito() throws Exception {
        String corpo = mvc.perform(post("/api/pesagens").contentType(MediaType.APPLICATION_JSON).content("""
                {"titularId":"dona-maria","coletorId":"marcos","material":"PET","qualidade":"LIMPO","kg":14,"chave":"t4"}
                """)).andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(corpo, "$.id");
        mvc.perform(post("/api/pesagens/" + id + "/recepcao").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"kg\":13}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("AJUSTADA"))
                .andExpect(jsonPath("$.ajusteCentavos").value(250));
        mvc.perform(get("/api/carteiras/dona-maria")).andExpect(jsonPath("$.saldoCentavos").value(3250));
    }

    @Test
    void materialContaminadoNaoGeraCredito() throws Exception {
        mvc.perform(post("/api/pesagens").contentType(MediaType.APPLICATION_JSON).content("""
                {"titularId":"dona-maria","coletorId":"marcos","material":"PET","qualidade":"CONTAMINADO","kg":5,"chave":"t5"}
                """)).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("REJEITADA"));
        mvc.perform(get("/api/carteiras/dona-maria")).andExpect(jsonPath("$.saldoCentavos").value(0));
    }

    @Test
    void notaDezEMetaDoBairroAparecemNoPainel() throws Exception {
        mvc.perform(get("/api/painel"))
                .andExpect(jsonPath("$.metaBairro.atingida").value(false))
                .andExpect(jsonPath("$.metaBairro.percentual").value(83));
        mvc.perform(post("/api/pesagens").contentType(MediaType.APPLICATION_JSON).content("""
                {"titularId":"dona-maria","coletorId":"marcos","material":"PET","qualidade":"LIMPO","kg":14,"chave":"t6"}
                """)).andExpect(status().isOk()).andExpect(jsonPath("$.nota10").value(true));
        mvc.perform(get("/api/painel"))
                .andExpect(jsonPath("$.metaBairro.atingida").value(true))
                .andExpect(jsonPath("$.metaBairro.percentual").value(100))
                .andExpect(jsonPath("$.ranking[?(@.titularId=='dona-maria')].notas10").value(1));
    }

    @Test
    void materialAceitavelNaoGanhaNotaDez() throws Exception {
        mvc.perform(post("/api/pesagens").contentType(MediaType.APPLICATION_JSON).content("""
                {"titularId":"dona-maria","coletorId":"marcos","material":"PET","qualidade":"ACEITAVEL","kg":5,"chave":"t7"}
                """)).andExpect(status().isOk()).andExpect(jsonPath("$.nota10").value(false));
    }
}
