package com.know.finance.security;

import com.know.finance.service.DynamicPermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.authentication.LoginUrlAuthenticationEntryPoint;

import java.util.Set;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final DynamicPermissionService dynamicPermissionService;

    @Bean
    /**
     * 配置Spring Security的过滤器链，定义HTTP安全策略
     *
     * <p>主要配置项包括：</p>
     * <ul>
     *   <li>禁用CSRF保护（适用于JWT无状态认证）</li>
     *   <li>设置会话创建策略为STATELESS（无状态）</li>
     *   <li>从数据库动态加载URL访问权限规则</li>
     *   <li>添加JWT认证过滤器</li>
     *   <li>配置未登录用户自动跳转到登录页面</li>
     * </ul>
     *
     * @param http HttpSecurity对象，用于配置HTTP安全策略
     * @return SecurityFilterChain 配置完成的Security过滤器链
     * @throws Exception 配置过程中可能抛出的异常
     */
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        Set<String> publicUrls = dynamicPermissionService.getPublicUrls();

        http.csrf().disable()
                .sessionManagement().sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                .and()
                .exceptionHandling()
                .authenticationEntryPoint(new LoginUrlAuthenticationEntryPoint("/login.html"))
                .and()
                .headers().frameOptions().sameOrigin()
                .and()
                .authorizeHttpRequests();

        for (String url : publicUrls) {
            http.authorizeHttpRequests().antMatchers(url).permitAll();
        }

        http.authorizeHttpRequests()
                .anyRequest().authenticated()
                .and()
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
