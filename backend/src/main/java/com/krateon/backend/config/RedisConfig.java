package com.krateon.backend.config;

import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.jsontype.BasicPolymorphicTypeValidator;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;

import java.time.Duration;
import java.util.Map;

@Configuration
@EnableCaching
public class RedisConfig {

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        // DO NOT replace this with `new GenericJackson2JsonRedisSerializer()` (no-arg). That
        // exact swap has broken category caching twice already (Phase 7, and again during
        // Phase 12 testing after this fix was silently lost) - see CLAUDE.md's "Known
        // Regressions to Watch For" section.
        //
        // Cache values are deserialized against a generic `Object` target (the cache manager
        // erases the concrete return type), so Jackson needs an embedded type id on every
        // write to know what to instantiate on read. DefaultTyping.NON_FINAL (the behavior of
        // the plain no-arg GenericJackson2JsonRedisSerializer() constructor) skips that
        // embedding for any `final` runtime class - and Stream.toList() (used by
        // CategoryService.getAll() and similarly-shaped methods) returns
        // java.util.ImmutableCollections$List12/ListN, which is final. That produces a bare,
        // untyped JSON array on write, which then fails to deserialize with
        // AsArrayTypeDeserializer expecting a type-id wrapper it never got - a 500 that is
        // 100% deterministic per cache key, not a race condition, even though it can look
        // intermittent (misses succeed, hits against the poisoned key fail). DefaultTyping.EVERYTHING
        // removes the final-class exemption so every cached value - including immutable lists -
        // round-trips correctly. Pair this with `sync = true` on any @Cacheable method that
        // returns a collection, to avoid a cache-stampede on a cold miss.
        ObjectMapper redisObjectMapper = new ObjectMapper();
        redisObjectMapper.findAndRegisterModules();
        redisObjectMapper.activateDefaultTyping(
                BasicPolymorphicTypeValidator.builder()
                        .allowIfSubType(Object.class)
                        .build(),
                ObjectMapper.DefaultTyping.EVERYTHING,
                JsonTypeInfo.As.WRAPPER_ARRAY);

        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(10))
                .disableCachingNullValues()
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(
                        new GenericJackson2JsonRedisSerializer(redisObjectMapper)));

        Map<String, RedisCacheConfiguration> namedCaches = Map.of(
                "products", defaultConfig,
                "categories", defaultConfig
        );

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaultConfig)
                .withInitialCacheConfigurations(namedCaches)
                .build();
    }

}
