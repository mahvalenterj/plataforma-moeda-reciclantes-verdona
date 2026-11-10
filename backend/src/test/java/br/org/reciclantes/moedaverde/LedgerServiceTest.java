package br.org.reciclantes.moedaverde;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import br.org.reciclantes.moedaverde.dominio.RegraDeNegocioException;
import br.org.reciclantes.moedaverde.ledger.LedgerService;
import br.org.reciclantes.moedaverde.ledger.LedgerService.Conta;
import br.org.reciclantes.moedaverde.ledger.LedgerService.TipoConta;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class LedgerServiceTest {
    LedgerService ledger;

    @BeforeEach
    void preparar() {
        ledger = new LedgerService();
        ledger.abrirConta(new Conta("fundo", "Fundo", TipoConta.FUNDO, false), 10_000);
        ledger.abrirConta(new Conta("carteira", "Carteira", TipoConta.CARTEIRA, false), 0);
        ledger.abrirConta(new Conta("apagar", "A pagar", TipoConta.A_PAGAR, false), 0);
    }

    @Test
    void transferenciaGeraDebitoECreditoESomaSeConserva() {
        var r = ledger.transferir("k1", "CREDITO", "teste", "fundo", "carteira", 3_500);
        assertEquals(2, r.transacao().lancamentos().size());
        assertEquals(6_500, ledger.saldo("fundo"));
        assertEquals(3_500, ledger.saldo("carteira"));
        assertTrue(ledger.invariantesOk());
    }

    @Test
    void repetirAMesmaChaveNaoDuplicaOLancamento() {
        ledger.transferir("k1", "CREDITO", "teste", "fundo", "carteira", 3_500);
        var repetida = ledger.transferir("k1", "CREDITO", "teste", "fundo", "carteira", 3_500);
        assertTrue(repetida.repetida());
        assertEquals(3_500, ledger.saldo("carteira"));
        assertEquals(1, ledger.totalTransacoes());
    }

    @Test
    void mesmaChaveComValorDiferenteEhRejeitada() {
        ledger.transferir("k1", "CREDITO", "teste", "fundo", "carteira", 3_500);
        var erro = assertThrows(RegraDeNegocioException.class,
                () -> ledger.transferir("k1", "CREDITO", "teste", "fundo", "carteira", 9_999));
        assertEquals("CHAVE_REUTILIZADA", erro.codigo());
    }

    @Test
    void saldoNuncaFicaNegativo() {
        ledger.transferir("k1", "CREDITO", "teste", "fundo", "carteira", 1_000);
        var erro = assertThrows(RegraDeNegocioException.class,
                () -> ledger.transferir("k2", "RESGATE", "teste", "carteira", "apagar", 1_001));
        assertEquals("SALDO_INSUFICIENTE", erro.codigo());
        assertEquals(1_000, ledger.saldo("carteira"));
        assertTrue(ledger.invariantesOk());
    }

    @Test
    void valorZeroOuNegativoEhRejeitado() {
        assertThrows(RegraDeNegocioException.class, () -> ledger.transferir("k", "X", "t", "fundo", "carteira", 0));
        assertFalse(ledger.extrato("carteira", 5).iterator().hasNext());
    }
}
