package br.org.reciclantes.moedaverde.api;

import br.org.reciclantes.moedaverde.dominio.RegraDeNegocioException;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
class ErrosApi {

    @ExceptionHandler(RegraDeNegocioException.class)
    ResponseEntity<Map<String, Object>> regra(RegraDeNegocioException e) {
        HttpStatus status = e.codigo().startsWith("CHAVE") ? HttpStatus.CONFLICT : HttpStatus.UNPROCESSABLE_ENTITY;
        return ResponseEntity.status(status).body(Map.of("codigo", e.codigo(), "mensagem", e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<Map<String, Object>> invalido(MethodArgumentNotValidException e) {
        String campo = e.getBindingResult().getFieldErrors().stream().findFirst()
                .map(f -> f.getField()).orElse("pedido");
        return ResponseEntity.badRequest().body(Map.of("codigo", "PEDIDO_INVALIDO",
                "mensagem", "Confira o campo '" + campo + "'."));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<Map<String, Object>> ilegivel(HttpMessageNotReadableException e) {
        return ResponseEntity.badRequest().body(Map.of("codigo", "PEDIDO_ILEGIVEL",
                "mensagem", "Não foi possível ler o pedido. Confira os valores enviados."));
    }
}
