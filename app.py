import sqlite3

from flask import Flask, request, jsonify, g, render_template

DATABASE = "candidaturas.db"

app = Flask(__name__)


def get_db():
    """Da-nos uma ligacao a base de dados, reutilizando a mesma durante o
    pedido em vez de abrir uma nova de cada vez."""
    db = getattr(g, "_database", None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row  # permite tratar cada linha como um dicionario
    return db


@app.teardown_appcontext
def close_db(exception):
    db = getattr(g, "_database", None)
    if db is not None:
        db.close()


def init_db():
    """Cria a tabela candidaturas se ainda nao existir. Chamado uma vez ao arrancar."""
    db = sqlite3.connect(DATABASE)
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS candidaturas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empresa TEXT NOT NULL,
            cargo TEXT NOT NULL,
            data_candidatura TEXT NOT NULL,
            estado TEXT NOT NULL DEFAULT 'enviada',
            link TEXT,
            notas TEXT
        )
        """
    )
    db.commit()
    db.close()


def row_to_dict(row):
    return dict(row)


@app.route("/")
def pagina_inicial():
    """Devolve a interface web (templates/index.html). A pagina depois fala
    com a API atraves de JavaScript (static/app.js)."""
    return render_template("index.html")


@app.route("/candidaturas", methods=["POST"])
def criar_candidatura():
    dados = request.get_json(force=True, silent=True) or {}
    obrigatorios = ["empresa", "cargo", "data_candidatura"]
    faltam = [c for c in obrigatorios if not dados.get(c)]
    if faltam:
        return jsonify({"erro": f"campos em falta: {', '.join(faltam)}"}), 400

    db = get_db()
    cur = db.execute(
        "INSERT INTO candidaturas (empresa, cargo, data_candidatura, estado, link, notas) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        (
            dados["empresa"],
            dados["cargo"],
            dados["data_candidatura"],
            dados.get("estado", "enviada"),
            dados.get("link"),
            dados.get("notas"),
        ),
    )
    db.commit()
    nova = db.execute("SELECT * FROM candidaturas WHERE id = ?", (cur.lastrowid,)).fetchone()
    return jsonify(row_to_dict(nova)), 201


@app.route("/candidaturas", methods=["GET"])
def listar_candidaturas():
    estado = request.args.get("estado")
    db = get_db()
    if estado:
        rows = db.execute(
            "SELECT * FROM candidaturas WHERE estado = ? ORDER BY id DESC", (estado,)
        ).fetchall()
    else:
        rows = db.execute("SELECT * FROM candidaturas ORDER BY id DESC").fetchall()
    return jsonify([row_to_dict(r) for r in rows])


@app.route("/candidaturas/<int:candidatura_id>", methods=["GET"])
def obter_candidatura(candidatura_id):
    db = get_db()
    row = db.execute("SELECT * FROM candidaturas WHERE id = ?", (candidatura_id,)).fetchone()
    if row is None:
        return jsonify({"erro": "candidatura nao encontrada"}), 404
    return jsonify(row_to_dict(row))


@app.route("/candidaturas/<int:candidatura_id>", methods=["PUT"])
def atualizar_candidatura(candidatura_id):
    db = get_db()
    row = db.execute("SELECT * FROM candidaturas WHERE id = ?", (candidatura_id,)).fetchone()
    if row is None:
        return jsonify({"erro": "candidatura nao encontrada"}), 404

    dados = request.get_json(force=True, silent=True) or {}
    campos_permitidos = ["empresa", "cargo", "data_candidatura", "estado", "link", "notas"]
    atualizacoes = {c: dados[c] for c in campos_permitidos if c in dados}
    if not atualizacoes:
        return jsonify({"erro": "nada para atualizar"}), 400

    set_clause = ", ".join(f"{campo} = ?" for campo in atualizacoes)
    valores = list(atualizacoes.values()) + [candidatura_id]
    db.execute(f"UPDATE candidaturas SET {set_clause} WHERE id = ?", valores)
    db.commit()

    atualizada = db.execute("SELECT * FROM candidaturas WHERE id = ?", (candidatura_id,)).fetchone()
    return jsonify(row_to_dict(atualizada))


@app.route("/candidaturas/<int:candidatura_id>", methods=["DELETE"])
def apagar_candidatura(candidatura_id):
    db = get_db()
    row = db.execute("SELECT * FROM candidaturas WHERE id = ?", (candidatura_id,)).fetchone()
    if row is None:
        return jsonify({"erro": "candidatura nao encontrada"}), 404
    db.execute("DELETE FROM candidaturas WHERE id = ?", (candidatura_id,))
    db.commit()
    return "", 204


@app.route("/estatisticas", methods=["GET"])
def estatisticas():
    db = get_db()
    total = db.execute("SELECT COUNT(*) AS n FROM candidaturas").fetchone()["n"]
    por_estado_rows = db.execute(
        "SELECT estado, COUNT(*) AS n FROM candidaturas GROUP BY estado"
    ).fetchall()
    return jsonify(
        {
            "total": total,
            "por_estado": {r["estado"]: r["n"] for r in por_estado_rows},
        }
    )


if __name__ == "__main__":
    init_db()
    app.run(debug=True, port=5000)
