package br.org.reciclantes.moedaverde.dominio;

/** Tipos do domínio. Valores em centavos de verdona (1 verdona = R$ 1,00 de compra no comércio parceiro). */
public final class Dominio {
    private Dominio() {}

    public enum TipoPerfil { TITULAR, DELEGADO }

    public enum StatusAdesao { EM_VALIDACAO, ATIVO }

    public enum Qualidade {
        LIMPO(1.0, "Limpo"),
        ACEITAVEL(0.8, "Aceitável"),
        CONTAMINADO(0.0, "Contaminado");

        public final double fator;
        public final String rotulo;

        Qualidade(double fator, String rotulo) {
            this.fator = fator;
            this.rotulo = rotulo;
        }
    }

    /** Tabela de exemplo (valores de demonstração, a definir no piloto). */
    public enum Material {
        PET("PET", 250),
        ALUMINIO("Alumínio", 800),
        PAPEL("Papel e papelão", 50),
        VIDRO("Vidro", 30);

        public final String rotulo;
        public final long centavosPorKg;

        Material(String rotulo, long centavosPorKg) {
            this.rotulo = rotulo;
            this.centavosPorKg = centavosPorKg;
        }
    }

    public record Participante(String id, String nome, TipoPerfil tipo, String titularId,
                               long limiteCompraCentavos, long limiteDiaCentavos, String bairro) {}

    public record Comercio(String id, String nome, String bairro, StatusAdesao status) {}

    public record Coletor(String id, String nome, String operador, String rota) {}
}
