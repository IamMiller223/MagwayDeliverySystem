package com.reactive.demo.Utils;

import java.util.List;
import java.util.stream.Collectors;

import org.modelmapper.ModelMapper;
import org.modelmapper.convention.MatchingStrategies;
import org.springframework.stereotype.Component;



import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class Mapper {

    private final ModelMapper modelMapper = new ModelMapper();

    public Mapper() {
        log.info("Mapper initialized");
    }

    @PostConstruct
    public void setup() {
        modelMapper.getConfiguration()
                .setMatchingStrategy(MatchingStrategies.STRICT)
                .setSkipNullEnabled(true);


        log.info("Mapper custom configuration applied");
    }

    public <S, T> List<T> mapList(List<S> source, Class<T> targetClass) {
        return source.stream()
                     .map(element -> modelMapper.map(element, targetClass))
                     .collect(Collectors.toList());
    }

    public <D> D map(Object source, Class<D> destinationType) {
        return modelMapper.map(source, destinationType);
    }
}
