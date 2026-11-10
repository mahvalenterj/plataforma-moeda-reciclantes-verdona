package br.org.reciclantes.moedaverde;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class MoedaVerdeApplication {
    public static void main(String[] args) {
        SpringApplication.run(MoedaVerdeApplication.class, args);
    }
}
