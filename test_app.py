"""Teste rapido e descartavel: confirma que os endpoints principais funcionam,
usando o cliente de testes do Flask (nao precisa de servidor a correr nem de rede)."""
import os
import tempfile

import app as app_module


def run():
    fd, path = tempfile.mkstemp()
    os.close(fd)
    app_module.DATABASE = path
    app_module.init_db()
    client = app_module.app.test_client()

    r = client.post("/candidaturas", json={
        "empresa": "Cofidis",
        "cargo": "Generation Pro 2026",
        "data_candidatura": "2026-09-14",
    })
    assert r.status_code == 201, r.get_json()
    candidatura = r.get_json()
    assert candidatura["estado"] == "enviada"
    cid = candidatura["id"]
    print("OK criar:", candidatura)

    r = client.post("/candidaturas", json={"empresa": "X"})
    assert r.status_code == 400, r.get_json()
    print("OK validacao de campos em falta:", r.get_json())

    r = client.get("/candidaturas")
    assert r.status_code == 200
    assert len(r.get_json()) == 1
    print("OK listar:", r.get_json())

    r = client.get(f"/candidaturas/{cid}")
    assert r.status_code == 200
    print("OK obter:", r.get_json())

    r = client.get("/candidaturas/9999")
    assert r.status_code == 404
    print("OK 404 em candidatura inexistente")

    r = client.put(f"/candidaturas/{cid}", json={"estado": "entrevista"})
    assert r.status_code == 200
    assert r.get_json()["estado"] == "entrevista"
    print("OK atualizar:", r.get_json())

    r = client.get("/estatisticas")
    assert r.status_code == 200
    assert r.get_json()["total"] == 1
    assert r.get_json()["por_estado"]["entrevista"] == 1
    print("OK estatisticas:", r.get_json())

    r = client.delete(f"/candidaturas/{cid}")
    assert r.status_code == 204
    print("OK apagar")

    r = client.get(f"/candidaturas/{cid}")
    assert r.status_code == 404
    print("OK confirmado: ja nao existe depois de apagar")

    os.remove(path)
    print("\nTODOS OS TESTES PASSARAM")


if __name__ == "__main__":
    run()
