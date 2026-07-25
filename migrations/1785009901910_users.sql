CREATE TABLE users (
  name varchar(255) NOT NULL,
  username varchar(100) NOT NULL,
  password_hash varchar(255) NOT NULL,
  created_at timestamp NOT NULL
);