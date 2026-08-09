package org.demo.authsystem.config;

import lombok.RequiredArgsConstructor;
import org.demo.authsystem.domain.entity.ERole;
import org.demo.authsystem.domain.entity.Role;
import org.demo.authsystem.repository.RoleRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class RoleSeeder implements CommandLineRunner {

    private final RoleRepository roleRepository;

    @Override
    public void run(String... args) {
        for (ERole role : ERole.values()) {
            roleRepository.findByName(role)
                .orElseGet(() -> roleRepository.save(new Role(null, role)));
        }
    }
}
