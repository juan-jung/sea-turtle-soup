package com.example.seaturtlesoup.repository;

import com.example.seaturtlesoup.domain.Problem;
import com.example.seaturtlesoup.domain.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserAccountRepository extends JpaRepository<UserAccount, Long> {
}
