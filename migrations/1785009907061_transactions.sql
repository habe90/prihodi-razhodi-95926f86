CREATE TABLE transactions (
  user_id integer NOT NULL,
  naziv varchar(255) NOT NULL,
  iznos numeric(12,2) NOT NULL,
  kategorija varchar(20) NOT NULL,
  datum date NOT NULL,
  created_at timestamp NOT NULL
);