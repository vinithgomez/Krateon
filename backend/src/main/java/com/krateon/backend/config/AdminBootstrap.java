package com.krateon.backend.config;

import com.krateon.backend.entity.Role;
import com.krateon.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.Arrays;

/**
 * Promotes already-registered users to ADMIN on startup. Public registration always creates a
 * CUSTOMER, so this is how the first admin is created without touching the database by hand.
 * Configure with ADMIN_EMAILS (comma-separated); does nothing when it is empty.
 */
@Component
@RequiredArgsConstructor
public class AdminBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);

    private final UserRepository userRepository;

    @Value("${app.admin-emails:}")
    private String adminEmails;

    @Override
    public void run(ApplicationArguments args) {
        Arrays.stream(adminEmails.split(","))
                .map(String::trim)
                .filter(email -> !email.isEmpty())
                .forEach(email -> userRepository.findByEmail(email).ifPresentOrElse(user -> {
                    if (user.getRole() != Role.ADMIN) {
                        user.setRole(Role.ADMIN);
                        userRepository.save(user);
                        log.info("Promoted {} to ADMIN", email);
                    }
                }, () -> log.warn("ADMIN_EMAILS lists {} but no such user is registered yet", email)));
    }
}
