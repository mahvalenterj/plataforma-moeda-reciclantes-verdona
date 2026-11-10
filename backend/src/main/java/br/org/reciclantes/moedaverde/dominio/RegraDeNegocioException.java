package br.org.reciclantes.moedaverde.dominio;

/** Violação de regra de negócio, com um código estável para o front tratar. */
public class RegraDeNegocioException extends RuntimeException {
    private final String codigo;

    public RegraDeNegocioException(String codigo, String mensagem) {
        super(mensagem);
        this.codigo = codigo;
    }

    public String codigo() {
        return codigo;
    }
}
