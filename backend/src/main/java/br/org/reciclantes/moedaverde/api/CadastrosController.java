package br.org.reciclantes.moedaverde.api;

import br.org.reciclantes.moedaverde.dominio.Dominio.Material;
import br.org.reciclantes.moedaverde.dominio.Dominio.Qualidade;
import br.org.reciclantes.moedaverde.servicos.Cadastros;
import br.org.reciclantes.moedaverde.servicos.ColetaService;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
class CadastrosController {
    private final Cadastros cadastros;

    CadastrosController(Cadastros cadastros) {
        this.cadastros = cadastros;
    }

    @GetMapping("/cadastros")
    Map<String, Object> cadastros() {
        List<Map<String, Object>> materiais = Arrays.stream(Material.values())
                .map(m -> Map.<String, Object>of("id", m.name(), "rotulo", m.rotulo, "centavosPorKg", m.centavosPorKg)).toList();
        List<Map<String, Object>> qualidades = Arrays.stream(Qualidade.values())
                .map(q -> Map.<String, Object>of("id", q.name(), "rotulo", q.rotulo, "fator", q.fator)).toList();
        Map<String, Object> corpo = new LinkedHashMap<>();
        corpo.put("titulares", cadastros.titulares());
        corpo.put("perfis", cadastros.participantes());
        corpo.put("comercios", cadastros.comercios());
        corpo.put("coletores", cadastros.coletores());
        corpo.put("materiais", materiais);
        corpo.put("qualidades", qualidades);
        corpo.put("limites", Map.of(
                "paradaCentavos", ColetaService.LIMITE_PARADA_CENTAVOS,
                "diaCentavos", ColetaService.LIMITE_DIA_CENTAVOS,
                "kgMaximo", ColetaService.KG_MAXIMO));
        return corpo;
    }
}
