package br.org.reciclantes.moedaverde.servicos;

import br.org.reciclantes.moedaverde.dominio.Dominio.Coletor;
import br.org.reciclantes.moedaverde.dominio.Dominio.Comercio;
import br.org.reciclantes.moedaverde.dominio.Dominio.Participante;
import br.org.reciclantes.moedaverde.dominio.Dominio.StatusAdesao;
import br.org.reciclantes.moedaverde.dominio.Dominio.TipoPerfil;
import br.org.reciclantes.moedaverde.dominio.RegraDeNegocioException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

/** Dados mestres mockados (no produto, ficam no PostgreSQL). */
@Component
public class Cadastros {
    public static final String FUNDO_ID = "fundo:patrocinador-demo";
    public static final String PARCEIRO_ID = "parceiro:pix";

    public static String carteira(String titularId) {
        return "carteira:" + titularId;
    }

    public static String aPagar(String comercioId) {
        return "apagar:" + comercioId;
    }

    private final Map<String, Participante> participantes = new LinkedHashMap<>();
    private final Map<String, Comercio> comercios = new LinkedHashMap<>();
    private final Map<String, Coletor> coletores = new LinkedHashMap<>();

    public Cadastros() {
        titular("dona-maria", "Dona Maria");
        participantes.put("julia", new Participante("julia", "Júlia (neta)", TipoPerfil.DELEGADO,
                "dona-maria", 6_000, 10_000, "Quintino"));
        titular("seu-jorge", "Seu Jorge");
        titular("dona-neide", "Dona Neide");
        titular("familia-souza", "Família Souza");
        titular("joana-lima", "Joana Lima");

        comercio("seu-osvaldo", "Mercearia do Seu Osvaldo", StatusAdesao.ATIVO);
        comercio("padaria-estrela", "Padaria Estrela", StatusAdesao.ATIVO);
        comercio("sacolao-da-vila", "Sacolão da Vila", StatusAdesao.ATIVO);
        comercio("acougue-bom-preco", "Açougue Bom Preço", StatusAdesao.ATIVO);
        comercio("emporio-da-tia-lu", "Empório da Tia Lu", StatusAdesao.EM_VALIDACAO);

        coletores.put("marcos", new Coletor("marcos", "Marcos", "Cooperativa Recicla Quintino (exemplo)", "Rota Quintino Sul"));
    }

    private void titular(String id, String nome) {
        participantes.put(id, new Participante(id, nome, TipoPerfil.TITULAR, null, 0, 0, "Quintino"));
    }

    private void comercio(String id, String nome, StatusAdesao status) {
        comercios.put(id, new Comercio(id, nome, "Quintino", status));
    }

    public Participante participante(String id) {
        Participante p = participantes.get(id);
        if (p == null) {
            throw new RegraDeNegocioException("PARTICIPANTE_INEXISTENTE", "Participante não encontrado: " + id);
        }
        return p;
    }

    public Comercio comercio(String id) {
        Comercio c = comercios.get(id);
        if (c == null) {
            throw new RegraDeNegocioException("COMERCIO_INEXISTENTE", "Comércio não encontrado: " + id);
        }
        return c;
    }

    public Coletor coletor(String id) {
        Coletor c = coletores.get(id);
        if (c == null) {
            throw new RegraDeNegocioException("COLETOR_INEXISTENTE", "Coletor não encontrado: " + id);
        }
        return c;
    }

    public List<Participante> participantes() {
        return new ArrayList<>(participantes.values());
    }

    public List<Participante> titulares() {
        return participantes.values().stream().filter(p -> p.tipo() == TipoPerfil.TITULAR).toList();
    }

    public List<Participante> perfisDoTitular(String titularId) {
        return participantes.values().stream()
                .filter(p -> p.id().equals(titularId) || titularId.equals(p.titularId()))
                .toList();
    }

    public List<Comercio> comercios() {
        return new ArrayList<>(comercios.values());
    }

    public List<Coletor> coletores() {
        return new ArrayList<>(coletores.values());
    }
}
