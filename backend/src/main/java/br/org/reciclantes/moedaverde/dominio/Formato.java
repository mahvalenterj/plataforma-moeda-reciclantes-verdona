package br.org.reciclantes.moedaverde.dominio;

import java.util.Locale;

public final class Formato {
    private static final Locale PT_BR = Locale.of("pt", "BR");

    private Formato() {}

    public static String reais(long centavos) {
        return String.format(PT_BR, "%,.2f", centavos / 100.0);
    }

    /** "35 verdonas", "35,50 verdonas" ou "1 verdona". */
    public static String verdonas(long centavos) {
        String n = centavos % 100 == 0 ? String.valueOf(centavos / 100) : reais(centavos);
        return n + (centavos == 100 ? " verdona" : " verdonas");
    }

    public static String kg(double kg) {
        return String.format(PT_BR, "%,.1f", kg);
    }
}
