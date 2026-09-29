# Registo de Candidaturas API

API REST simples para gerir candidaturas a emprego: criar, listar, ver, editar e apagar,
mais um endpoint de estatisticas. Projeto de portfolio focado em backend (Python + Flask
+ base de dados), para complementar um portfolio de Data Analytics com prova de codigo
para vagas de Junior Developer.

## Stack

- Python 3
- Flask
- SQLite (via `sqlite3`, sem ORM)

## Como correr localmente

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 app.py
```

O servidor fica disponivel em `http://127.0.0.1:5000`.

## Interface web

Abrir `http://127.0.0.1:5000` no browser mostra uma interface simples (HTML + JavaScript,
sem frameworks) que usa a propria API para:

- listar as candidaturas, com filtro por estado;
- adicionar, editar e apagar candidaturas;
- ver as estatisticas (total e contagem por estado).

Os ficheiros estao em `templates/index.html` e `static/` (`app.js`, `style.css`).
Os erros de validacao da API (por exemplo, campos obrigatorios em falta) aparecem
diretamente no formulario.

## Testes

```bash
python3 test_app.py
```

Testa criar, listar, obter, atualizar, apagar e o endpoint de estatisticas.

## Endpoints

| Metodo | Endpoint                    | Descricao                                  |
|--------|------------------------------|---------------------------------------------|
| GET    | `/`                           | Interface web                               |
| POST   | `/candidaturas`               | Cria uma candidatura                        |
| GET    | `/candidaturas`               | Lista todas (filtro opcional `?estado=`)    |
| GET    | `/candidaturas/<id>`          | Devolve uma candidatura pelo id             |
| PUT    | `/candidaturas/<id>`          | Atualiza campos de uma candidatura          |
| DELETE | `/candidaturas/<id>`          | Apaga uma candidatura                       |
| GET    | `/estatisticas`               | Total e contagem por estado                 |

### Exemplo: criar uma candidatura

```bash
curl -X POST http://127.0.0.1:5000/candidaturas \
  -H "Content-Type: application/json" \
  -d '{"empresa": "Cofidis", "cargo": "Generation Pro 2026", "data_candidatura": "2026-09-14"}'
```

Campos: `empresa`, `cargo`, `data_candidatura` (obrigatorios); `estado` (default
`"enviada"`), `link`, `notas` (opcionais).
