package com.example.seaturtlesoup.domain;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import javax.persistence.*;
import java.util.Objects;

@Getter
@ToString
@Entity
public class UserAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Setter @Column(nullable = false, length = 50) private String userId;
    @Setter @Column(nullable = false) private String userPassword;

    protected UserAccount() {}

    private UserAccount(String userId, String userPassword) {
        this.userId = userId;
        this.userPassword = userPassword;
    }

    public static UserAccount of(String userId, String userPassword) {
        return new UserAccount(userId, userPassword);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof UserAccount userAccount)) return false;
        return id != null && id.equals(userAccount.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
